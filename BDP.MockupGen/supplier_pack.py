"""Supplier handoff pack generation.

This module produces PRODUCTION artwork for a factory to impose a design onto
bottles -- distinct from the customer-facing preview mockups. It outputs a flat,
correctly-sized print-ready label, a one-page spec sheet PDF, and a
machine-readable placement spec.

Nothing here requires reportlab: the PDF is produced by rendering an A4-ish page
image with Pillow and saving it via ``Image.save(path, "PDF")``.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from method_config import validate_method_foil, get_foil_color
from template_creator import load_template
from text_renderer import render_text


# ---------------------------------------------------------------------------
# Unit helpers
# ---------------------------------------------------------------------------
def mm_to_px(mm: float, dpi: int) -> int:
    """Convert millimetres to pixels at ``dpi``."""
    return int(round(mm / 25.4 * dpi))


def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = (
        ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf")
        if bold
        else ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")
    )
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _rgb_to_hex(rgb: Sequence[int]) -> str:
    r, g, b = (int(max(0, min(255, c))) for c in rgb[:3])
    return f"#{r:02X}{g:02X}{b:02X}"


# ---------------------------------------------------------------------------
# Colour sampling
# ---------------------------------------------------------------------------
def dominant_colors(
    rgba: np.ndarray,
    k: int = 5,
    min_alpha: int = 16,
) -> List[Dict[str, Any]]:
    """Sample dominant opaque colours from an RGBA artwork.

    Uses a coarse RGB histogram (numpy only -- no sklearn) over the non-transparent
    pixels and returns up to ``k`` entries sorted by frequency.

    Returns:
        List of {"hex", "rgb", "share"} dicts.
    """
    if rgba.ndim != 3 or rgba.shape[2] < 3:
        return []
    rgb = rgba[..., :3].reshape(-1, 3).astype(np.int32)
    if rgba.shape[2] == 4:
        alpha = rgba[..., 3].reshape(-1)
        keep = alpha >= min_alpha
        rgb = rgb[keep]
    if rgb.shape[0] == 0:
        return []

    # Quantise to a 32-level-per-channel grid and count.
    q = (rgb // 8).astype(np.int64)
    keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
    uniq, inv, counts = np.unique(keys, return_inverse=True, return_counts=True)
    order = np.argsort(counts)[::-1][:k]
    total = float(counts.sum())

    results: List[Dict[str, Any]] = []
    for idx in order:
        members = rgb[inv == idx]
        mean = members.mean(axis=0)
        rgb_t = [int(round(mean[0])), int(round(mean[1])), int(round(mean[2]))]
        results.append(
            {
                "hex": _rgb_to_hex(rgb_t),
                "rgb": rgb_t,
                "share": float(counts[idx] / total),
            }
        )
    return results


# ---------------------------------------------------------------------------
# Flat print-ready artwork
# ---------------------------------------------------------------------------
def build_flat_artwork(
    brand_mark_path: str,
    application_method: str,
    foil_type: Optional[str],
    text_overlays: Optional[Sequence[Dict[str, Any]]],
    label_width_mm: float,
    label_height_mm: float,
    dpi: int,
    bleed_mm: float,
    template: Dict[str, Any],
) -> np.ndarray:
    """Compose the flat label artwork (logo + text) at physical print size.

    The trim size is ``label_width_mm x label_height_mm``; ``bleed_mm`` is added
    on all four sides. The background is white for silk-screen/hot-stamping
    (which print onto an opaque substrate or foil plate) and transparent for
    stickers (die-cut). Returns an RGBA uint8 array sized to the full bleed box.

    NOTE: this is the FLAT label -- it is intentionally NOT warped onto a bottle.
    """
    trim_w = mm_to_px(label_width_mm, dpi)
    trim_h = mm_to_px(label_height_mm, dpi)
    bleed_px = mm_to_px(bleed_mm, dpi)
    full_w = trim_w + 2 * bleed_px
    full_h = trim_h + 2 * bleed_px

    # White background for ink/foil plate methods; transparent for sticker.
    if application_method == "sticker":
        bg = (255, 255, 255, 0)
    else:
        bg = (255, 255, 255, 255)
    canvas = Image.new("RGBA", (full_w, full_h), bg)

    # --- Brand mark, fit within the trim box keeping aspect ratio -----------
    mark = Image.open(brand_mark_path).convert("RGBA")
    max_w = int(trim_w * 0.9)
    max_h = int(trim_h * 0.6)
    scale = min(max_w / mark.width, max_h / mark.height)
    new_size = (max(1, int(mark.width * scale)), max(1, int(mark.height * scale)))
    mark = mark.resize(new_size, Image.LANCZOS)
    mx = bleed_px + (trim_w - mark.width) // 2
    my = bleed_px + int(trim_h * 0.10)
    canvas.alpha_composite(mark, (mx, my))

    # --- Text overlays (reuse text_renderer, placed in the trim box) --------
    for tc in text_overlays or []:
        text_rgba = render_text(
            tc, (trim_w, trim_h), template, application_method, foil_type
        )
        text_img = Image.fromarray(text_rgba, mode="RGBA")
        canvas.alpha_composite(text_img, (bleed_px, bleed_px))

    return np.array(canvas, dtype=np.uint8)


# ---------------------------------------------------------------------------
# Placement spec
# ---------------------------------------------------------------------------
def _placement_spec(
    template: Dict[str, Any],
    application_method: str,
    foil_type: Optional[str],
    label_width_mm: float,
    label_height_mm: float,
    bleed_mm: float,
    dpi: int,
    colours: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build the machine-readable placement spec dict."""
    corners = template["label_corners"]
    img_w, img_h = template["image_dimensions"]

    # Convert template pixel corners to mm in label space (proportional mapping
    # of the label quad's bounding box to the physical label size).
    xs = [corners[k][0] for k in ("tl", "tr", "br", "bl")]
    ys = [corners[k][1] for k in ("tl", "tr", "br", "bl")]
    left, right = min(xs), max(xs)
    top, bottom = min(ys), max(ys)
    span_x = max(right - left, 1e-6)
    span_y = max(bottom - top, 1e-6)

    def to_mm(pt: Sequence[float]) -> List[float]:
        u = (pt[0] - left) / span_x
        v = (pt[1] - top) / span_y
        return [round(u * label_width_mm, 3), round(v * label_height_mm, 3)]

    label_corners_px = {k: [float(corners[k][0]), float(corners[k][1])] for k in ("tl", "tr", "br", "bl")}
    label_corners_mm = {k: to_mm(corners[k]) for k in ("tl", "tr", "br", "bl")}

    curve_px = [float(template["center_curve"][0]), float(template["center_curve"][1])]
    curve_mm = to_mm(template["center_curve"])

    return {
        "sku": template.get("sku", "UNKNOWN"),
        "method": application_method,
        "foil": foil_type,
        "label_mm": [label_width_mm, label_height_mm],
        "bleed_mm": bleed_mm,
        "dpi": dpi,
        "reference_image_dimensions_px": [int(img_w), int(img_h)],
        "label_corners": {"px": label_corners_px, "mm": label_corners_mm},
        "curve_center": {"px": curve_px, "mm": curve_mm},
        "bottle_type": template.get("bottle_type"),
        "colours": colours,
    }


# ---------------------------------------------------------------------------
# Spec sheet PDF (rendered with PIL, saved as PDF)
# ---------------------------------------------------------------------------
def _build_spec_sheet(
    artwork_rgba: np.ndarray,
    spec: Dict[str, Any],
    colours: List[Dict[str, Any]],
) -> Image.Image:
    """Render a one-page A4 spec sheet as a PIL RGB image."""
    # A4 at 150 dpi.
    page_w, page_h = 1240, 1754
    page = Image.new("RGB", (page_w, page_h), (255, 255, 255))
    draw = ImageDraw.Draw(page)

    margin = 70
    title_font = _load_font(46, bold=True)
    head_font = _load_font(28, bold=True)
    body_font = _load_font(24)
    mono_font = _load_font(22)

    y = margin
    draw.text((margin, y), "PRODUCTION SPEC SHEET", font=title_font, fill=(15, 15, 15))
    y += 70
    draw.line([(margin, y), (page_w - margin, y)], fill=(0, 0, 0), width=2)
    y += 30

    foil = spec.get("foil") or "-"
    lw, lh = spec["label_mm"]
    rows = [
        ("SKU", str(spec.get("sku"))),
        ("Application method", str(spec.get("method"))),
        ("Foil type", str(foil)),
        ("Label size (mm)", f"{lw} x {lh}"),
        ("Bleed (mm)", f"{spec.get('bleed_mm')} all sides"),
        ("Resolution (dpi)", str(spec.get("dpi"))),
        ("Bottle type", str(spec.get("bottle_type"))),
    ]
    for label, value in rows:
        draw.text((margin, y), f"{label}:", font=head_font, fill=(40, 40, 40))
        draw.text((margin + 430, y), value, font=body_font, fill=(0, 0, 0))
        y += 44

    y += 20
    draw.text((margin, y), "Dominant ink / foil colours", font=head_font, fill=(40, 40, 40))
    y += 50
    sw = 90
    for c in colours:
        rgb = tuple(int(v) for v in c["rgb"])
        draw.rectangle([margin, y, margin + sw, y + sw], fill=rgb, outline=(0, 0, 0))
        draw.text((margin + sw + 20, y + 12), c["hex"], font=mono_font, fill=(0, 0, 0))
        draw.text(
            (margin + sw + 20, y + 46),
            f"{c['share'] * 100:.1f}%  rgb{tuple(rgb)}",
            font=_load_font(18),
            fill=(80, 80, 80),
        )
        y += sw + 22

    # --- Artwork thumbnail (right column) -----------------------------------
    thumb = Image.fromarray(artwork_rgba, mode="RGBA")
    # checkerboard behind transparency so it reads on the sheet
    bg = Image.new("RGBA", thumb.size, (245, 245, 245, 255))
    bg.alpha_composite(thumb)
    thumb = bg.convert("RGB")
    max_thumb = 420
    tscale = min(max_thumb / thumb.width, max_thumb / thumb.height)
    thumb = thumb.resize(
        (max(1, int(thumb.width * tscale)), max(1, int(thumb.height * tscale))),
        Image.LANCZOS,
    )
    tx = page_w - margin - thumb.width
    ty = margin + 120
    draw.rectangle(
        [tx - 4, ty - 4, tx + thumb.width + 4, ty + thumb.height + 4],
        outline=(0, 0, 0),
        width=2,
    )
    page.paste(thumb, (tx, ty))
    draw.text((tx, ty + thumb.height + 12), "Artwork (flat, with bleed)", font=_load_font(20), fill=(60, 60, 60))

    # --- Placement coordinates ----------------------------------------------
    py = max(y, ty + thumb.height + 80) + 20
    draw.line([(margin, py), (page_w - margin, py)], fill=(180, 180, 180), width=1)
    py += 20
    draw.text((margin, py), "Placement coordinates (label corners)", font=head_font, fill=(40, 40, 40))
    py += 50
    lc = spec["label_corners"]
    for k in ("tl", "tr", "br", "bl"):
        px = lc["px"][k]
        mm = lc["mm"][k]
        line = f"{k.upper():3}  px ({px[0]:.0f}, {px[1]:.0f})   mm ({mm[0]:.1f}, {mm[1]:.1f})"
        draw.text((margin, py), line, font=mono_font, fill=(0, 0, 0))
        py += 36
    cc = spec["curve_center"]
    draw.text(
        (margin, py),
        f"CURVE  px ({cc['px'][0]:.0f}, {cc['px'][1]:.0f})   mm ({cc['mm'][0]:.1f}, {cc['mm'][1]:.1f})",
        font=mono_font,
        fill=(0, 0, 0),
    )
    py += 50

    draw.text(
        (margin, page_h - 50),
        "Generated by BDP.MockupGen supplier_pack",
        font=_load_font(18),
        fill=(120, 120, 120),
    )
    return page


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def generate_supplier_pack(
    brand_mark_path: str,
    template_path: str,
    application_method: str,
    foil_type: Optional[str],
    text_overlays: Optional[List[Dict[str, Any]]],
    label_width_mm: float,
    label_height_mm: float,
    dpi: int = 300,
    bleed_mm: float = 3.0,
    output_dir: str = "supplier_pack",
) -> Dict[str, Any]:
    """Produce a factory-ready supplier handoff pack.

    Produces, in ``output_dir``:
      - ``artwork_print_ready.png``: flat label artwork (logo + text) at the
        physical size ``label_width_mm x label_height_mm`` at ``dpi``, plus
        ``bleed_mm`` bleed on all sides. NOT warped onto the bottle.
      - ``spec_sheet.pdf``: one-page spec sheet (PIL-rendered, saved as PDF).
      - ``placement.json``: machine-readable placement spec.

    Returns:
        Dict summarising the files written (paths, sizes, sampled colours).
    """
    validate_method_foil(application_method, foil_type)
    template = load_template(template_path)
    os.makedirs(output_dir, exist_ok=True)

    # --- Flat print-ready artwork -------------------------------------------
    artwork = build_flat_artwork(
        brand_mark_path=brand_mark_path,
        application_method=application_method,
        foil_type=foil_type,
        text_overlays=text_overlays,
        label_width_mm=label_width_mm,
        label_height_mm=label_height_mm,
        dpi=dpi,
        bleed_mm=bleed_mm,
        template=template,
    )
    artwork_path = os.path.join(output_dir, "artwork_print_ready.png")
    Image.fromarray(artwork, mode="RGBA").save(artwork_path, dpi=(dpi, dpi))

    # --- Dominant colours ----------------------------------------------------
    colours = dominant_colors(artwork, k=5)
    # For hot stamping, surface the nominal foil colour as the lead swatch.
    if application_method == "hot_stamping" and foil_type:
        foil = get_foil_color(foil_type)
        if isinstance(foil, dict):
            stops = foil.get("stops", [])
            for s in stops[:3]:
                colours.insert(0, {"hex": _rgb_to_hex(s), "rgb": list(s), "share": 0.0})
        else:
            colours.insert(0, {"hex": _rgb_to_hex(foil), "rgb": list(foil), "share": 0.0})

    # --- Placement spec ------------------------------------------------------
    spec = _placement_spec(
        template=template,
        application_method=application_method,
        foil_type=foil_type,
        label_width_mm=label_width_mm,
        label_height_mm=label_height_mm,
        bleed_mm=bleed_mm,
        dpi=dpi,
        colours=colours,
    )
    placement_path = os.path.join(output_dir, "placement.json")
    with open(placement_path, "w", encoding="utf-8") as fh:
        json.dump(spec, fh, indent=2)

    # --- Spec sheet PDF ------------------------------------------------------
    sheet = _build_spec_sheet(artwork, spec, colours)
    pdf_path = os.path.join(output_dir, "spec_sheet.pdf")
    sheet.save(pdf_path, "PDF", resolution=150.0)

    return {
        "output_dir": output_dir,
        "artwork_print_ready": artwork_path,
        "spec_sheet_pdf": pdf_path,
        "placement_json": placement_path,
        "artwork_size_px": [int(artwork.shape[1]), int(artwork.shape[0])],
        "label_mm": [label_width_mm, label_height_mm],
        "bleed_mm": bleed_mm,
        "dpi": dpi,
        "colours": colours,
        "sku": template.get("sku"),
    }
