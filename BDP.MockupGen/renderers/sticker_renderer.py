"""Sticker (printed vinyl/paper label) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Tuple

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from render_utils import (  # noqa: E402
    contact_shadow,
    make_noise,
    merge_rgba,
    split_rgba,
)


def _vinyl_texture(shape: Tuple[int, int], opacity: float, seed: int = 7) -> np.ndarray:
    """Return a subtle vinyl grain multiplier map (float ~1.0)."""
    noise = make_noise(shape, seed=seed, scale=1.5)
    grain = 1.0 + (noise - 0.5) * 2.0 * opacity
    return grain.astype(np.float32)


def render_sticker(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
) -> np.ndarray:
    """Render a sticker label layer.

    Features: a thin darkened edge (die-cut look), a soft contact shadow under
    the sticker, vinyl/paper surface grain, edge ambient occlusion and a gentle
    lighting match to the bottle's average luminance.

    Returns:
        RGBA uint8 layer the size of the warped logo canvas.
    """
    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    # --- Edge / die-cut ring -------------------------------------------------
    if config.get("has_edge"):
        thickness = max(int(config.get("edge_thickness_px", 2)), 1)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (thickness * 2 + 1,) * 2)
        eroded = cv2.erode((alpha > 0.5).astype(np.uint8), kernel)
        edge_ring = ((alpha > 0.5).astype(np.uint8) - eroded).astype(bool)
        darken = float(config.get("edge_color_darken", 0.15))
        rgb[edge_ring] *= (1.0 - darken)

    # --- Vinyl/paper grain ---------------------------------------------------
    if config.get("surface_texture") in ("vinyl", "paper"):
        grain = _vinyl_texture((h, w), float(config.get("texture_opacity", 0.12)))
        rgb *= grain[..., None]

    # --- Lighting match (gentle) --------------------------------------------
    avg = float(lighting_profile.get("average_luminance", 128.0))
    factor = np.clip(0.85 + (avg / 255.0) * 0.3, 0.7, 1.15)
    rgb *= factor

    # --- Edge ambient occlusion ---------------------------------------------
    inner = cv2.GaussianBlur(alpha, (0, 0), sigmaX=2.0)
    ao = np.clip(inner, 0, 1)
    rgb *= (0.92 + 0.08 * ao)[..., None]

    sticker_rgba = merge_rgba(rgb, alpha * float(config.get("opacity", 1.0)))

    # --- Soft contact shadow (composited behind the sticker) -----------------
    if config.get("has_contact_shadow"):
        shadow_a = contact_shadow(
            alpha,
            blur=int(config.get("shadow_blur", 4)),
            opacity=float(config.get("shadow_opacity", 0.2)),
        )
        # Offset shadow slightly down for grounding.
        shadow_a = np.roll(shadow_a, shift=2, axis=0)
        shadow_rgb = np.zeros((h, w, 3), np.float32)
        shadow_rgba = merge_rgba(shadow_rgb, shadow_a)
        sticker_rgba = _over(sticker_rgba, shadow_rgba)

    return sticker_rgba


def _over(top: np.ndarray, bottom: np.ndarray) -> np.ndarray:
    """Alpha-composite ``top`` over ``bottom`` (both RGBA uint8)."""
    tr, ta = split_rgba(top)
    br, ba = split_rgba(bottom)
    out_a = ta + ba * (1 - ta)
    safe = np.where(out_a > 1e-6, out_a, 1.0)
    out_rgb = (tr * ta[..., None] + br * ba[..., None] * (1 - ta[..., None])) / safe[..., None]
    return merge_rgba(out_rgb, out_a)
