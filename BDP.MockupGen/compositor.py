"""Main mockup generation orchestrator.

Implements the full pipeline:
    load assets -> validate method/foil -> warp logo -> analyse lighting ->
    route to method renderer -> render & warp text -> composite -> colour
    correct -> save (with optional debug layers).
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from method_config import (
    HOT_STAMPING,
    SILK_SCREEN,
    STICKER,
    get_method_config,
    validate_method_foil,
)
from render_utils import merge_rgba, split_rgba
from renderers import render_hotstamp, render_silkscreen, render_sticker
from template_creator import load_template
from text_renderer import render_text
from warper import (
    compute_depth_map,
    compute_normal_map,
    cylindrical_warp,
    intensity_for_bottle_type,
    perspective_warp,
    source_quad_from_image,
    target_quad_from_template,
)
from lighting import analyze_bottle_lighting


def _read_image(path: str, flags: int) -> np.ndarray:
    img = cv2.imread(path, flags)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {path}")
    return img


def _label_region_mask(template: Dict[str, Any]) -> np.ndarray:
    """Filled polygon mask (uint8) of the label region."""
    w, h = template["image_dimensions"]
    mask = np.zeros((h, w), np.uint8)
    c = template["label_corners"]
    quad = np.array(
        [c["tl"], c["tr"], c["br"], c["bl"]], dtype=np.int32
    )
    cv2.fillConvexPoly(mask, quad, 255)
    return mask


def _composite_over(base_rgb: np.ndarray, layer_rgba: np.ndarray) -> np.ndarray:
    """Composite an RGBA layer over a BGR/RGB base (float result, same size)."""
    lr, la = split_rgba(layer_rgba)
    la3 = la[..., None]
    return base_rgb.astype(np.float32) * (1 - la3) + lr * la3


def _warp_layer_to_bottle(
    flat_rgba: np.ndarray,
    template: Dict[str, Any],
) -> np.ndarray:
    """Perspective + cylindrical warp a flat RGBA label onto the bottle canvas."""
    w, h = template["image_dimensions"]
    src = source_quad_from_image(flat_rgba)
    dst = target_quad_from_template(template)
    warped = perspective_warp(flat_rgba, src, dst, output_size=(w, h))
    warped = cylindrical_warp(
        warped,
        template["label_corners"],
        template["center_curve"],
        intensity=intensity_for_bottle_type(template.get("bottle_type")),
    )
    return warped


def _route_renderer(
    method: str,
    warped_rgba: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    foil_type: Optional[str],
    normal_map: Optional[np.ndarray] = None,
    depth_map: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Dispatch a warped layer to the appropriate method renderer."""
    if method == STICKER:
        return render_sticker(
            warped_rgba, template, lighting_profile, config,
            normal_map=normal_map, depth_map=depth_map,
        )
    if method == SILK_SCREEN:
        return render_silkscreen(
            warped_rgba, template, lighting_profile, config,
            lighting_profile["bottle_base_color"],
            normal_map=normal_map, depth_map=depth_map,
        )
    if method == HOT_STAMPING:
        return render_hotstamp(
            warped_rgba, template, lighting_profile, config, foil_type or "gold",
            normal_map=normal_map, depth_map=depth_map,
        )
    raise ValueError(f"Unknown method {method!r}.")


def generate_mockup(
    bottle_image: str,
    logo_image: str,
    template_path: str,
    application_method: str,
    foil_type: Optional[str] = None,
    text_overlays: Optional[Sequence[Dict[str, Any]]] = None,
    output_path: str = "mockup.png",
    debug_mode: bool = False,
    substrate: Optional[str] = None,
    before_after: bool = False,
) -> str:
    """Generate a bottle-label mockup and save it to ``output_path``.

    Args:
        bottle_image: path to the bottle photo.
        logo_image: path to the logo (PNG with transparency preferred).
        template_path: path to the template JSON.
        application_method: "sticker" | "silk_screen" | "hot_stamping".
        foil_type: required for hot stamping only.
        text_overlays: optional list of text-config dicts.
        output_path: where to save the final PNG.
        debug_mode: if True, also dump intermediate debug layers.
        before_after: if True, also save a side-by-side "before vs after"
            comparison next to the output as ``{stem}_before_after.png``.

    Returns:
        The output path.
    """
    validate_method_foil(application_method, foil_type)
    config = dict(get_method_config(application_method))
    if substrate is not None and application_method == STICKER:
        config["substrate"] = substrate
    template = load_template(template_path)

    bottle = _read_image(bottle_image, cv2.IMREAD_COLOR)  # BGR
    w, h = template["image_dimensions"]
    if (bottle.shape[1], bottle.shape[0]) != (w, h):
        bottle = cv2.resize(bottle, (w, h), interpolation=cv2.INTER_AREA)

    logo = _read_image(logo_image, cv2.IMREAD_UNCHANGED)
    # cv2 reads BGR(A); convert to RGB(A) for the renderers.
    logo_rgba = _bgr_to_rgb(logo)

    # --- Lighting analysis ---------------------------------------------------
    mask = _label_region_mask(template)
    lighting_profile = analyze_bottle_lighting(bottle, mask)

    # --- Geometry maps (shared by logo + text layers) -----------------------
    normal_map = compute_normal_map(template)
    depth_map = compute_depth_map(template)

    debug_dir = None
    if debug_mode:
        debug_dir = os.path.splitext(output_path)[0] + "_debug"
        os.makedirs(debug_dir, exist_ok=True)

    # --- Warp + render logo --------------------------------------------------
    warped_logo = _warp_layer_to_bottle(logo_rgba, template)
    if debug_mode and debug_dir:
        cv2.imwrite(os.path.join(debug_dir, "01_warped_logo.png"), _rgba_to_bgra(warped_logo))

    logo_layer = _route_renderer(
        application_method, warped_logo, template, lighting_profile, config, foil_type,
        normal_map=normal_map, depth_map=depth_map,
    )
    if debug_mode and debug_dir:
        cv2.imwrite(os.path.join(debug_dir, "02_logo_layer.png"), _rgba_to_bgra(logo_layer))

    # Composite logo onto bottle (work in RGB float).
    bottle_rgb = cv2.cvtColor(bottle, cv2.COLOR_BGR2RGB).astype(np.float32)
    composed = _composite_over(bottle_rgb, logo_layer)

    # --- Text overlays -------------------------------------------------------
    label_w, label_h = _flat_label_size(template)
    for i, tc in enumerate(text_overlays or []):
        flat_text = render_text(
            tc, (label_w, label_h), template, application_method, foil_type
        )
        warped_text = _warp_layer_to_bottle(flat_text, template)
        text_layer = _route_renderer(
            application_method, warped_text, template, lighting_profile, config, foil_type,
            normal_map=normal_map, depth_map=depth_map,
        )
        if debug_mode and debug_dir:
            cv2.imwrite(
                os.path.join(debug_dir, f"03_text_{i}.png"), _rgba_to_bgra(text_layer)
            )
        composed = _composite_over(composed, text_layer)

    # --- Final colour correction --------------------------------------------
    composed = _color_correct(composed)

    out_bgr = cv2.cvtColor(np.clip(composed, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    out_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(out_dir, exist_ok=True)
    if not cv2.imwrite(output_path, out_bgr):
        raise IOError(f"Failed to write output: {output_path}")

    # --- Optional before/after comparison -----------------------------------
    if before_after:
        ba_path = os.path.splitext(output_path)[0] + "_before_after.png"
        ba = _make_before_after(bottle, out_bgr)
        if not cv2.imwrite(ba_path, ba):
            raise IOError(f"Failed to write before/after: {ba_path}")

    return output_path


def _make_before_after(before_bgr: np.ndarray, after_bgr: np.ndarray) -> np.ndarray:
    """Build a labelled side-by-side ``[before | after]`` image (BGR)."""
    h = min(before_bgr.shape[0], after_bgr.shape[0])

    def _fit(img: np.ndarray) -> np.ndarray:
        scale = h / img.shape[0]
        return cv2.resize(img, (max(1, int(img.shape[1] * scale)), h), interpolation=cv2.INTER_AREA)

    left = _fit(before_bgr)
    right = _fit(after_bgr)

    gap = max(8, h // 80)
    divider = np.full((h, gap, 3), 245, dtype=np.uint8)
    strip = np.hstack([left, divider, right])

    # Caption bar.
    bar_h = max(28, h // 14)
    bar = np.full((bar_h, strip.shape[1], 3), 26, dtype=np.uint8)  # dark bar
    canvas = np.vstack([bar, strip])

    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = max(0.5, h / 1400.0)
    thick = max(1, int(round(scale * 2)))
    y = int(bar_h * 0.68)
    cv2.putText(canvas, "BEFORE", (int(left.shape[1] * 0.5) - 60, y), font, scale, (235, 235, 235), thick, cv2.LINE_AA)
    cv2.putText(canvas, "AFTER", (left.shape[1] + gap + int(right.shape[1] * 0.5) - 50, y), font, scale, (196, 168, 130), thick, cv2.LINE_AA)
    return canvas


def _flat_label_size(template: Dict[str, Any]) -> Tuple[int, int]:
    """Estimate the flat label canvas size from the template corners."""
    c = template["label_corners"]
    width = int(
        max(
            _dist(c["tl"], c["tr"]),
            _dist(c["bl"], c["br"]),
        )
    )
    height = int(
        max(
            _dist(c["tl"], c["bl"]),
            _dist(c["tr"], c["br"]),
        )
    )
    return max(width, 16), max(height, 16)


def _dist(a: Sequence[float], b: Sequence[float]) -> float:
    return float(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)


def _color_correct(rgb: np.ndarray) -> np.ndarray:
    """Mild global contrast/saturation polish."""
    img = np.clip(rgb, 0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] *= 1.04  # saturation
    hsv[..., 2] = np.clip((hsv[..., 2] - 128) * 1.03 + 128, 0, 255)  # contrast
    hsv[..., 1] = np.clip(hsv[..., 1], 0, 255)
    out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    return out.astype(np.float32)


def _bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert a cv2-read BGR/BGRA image to RGB/RGBA."""
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def _rgba_to_bgra(image: np.ndarray) -> np.ndarray:
    """Convert an RGBA image to BGRA for cv2.imwrite."""
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_RGBA2BGRA)
    return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
