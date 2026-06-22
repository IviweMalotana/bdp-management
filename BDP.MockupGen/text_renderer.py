"""Text overlay rendering.

Renders a text string to a transparent RGBA image (via PIL), positions it in a
named zone of the label, and returns it so the compositor can warp it the same
way as the logo and route it through the same method renderer.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont


# Named zones expressed as relative (x, y) anchor in 0..1 of the label.
ZONE_ANCHORS: Dict[str, Tuple[float, float]] = {
    "top": (0.5, 0.15),
    "center": (0.5, 0.5),
    "bottom": (0.5, 0.85),
    "top_left": (0.2, 0.15),
    "top_right": (0.8, 0.15),
    "bottom_left": (0.2, 0.85),
    "bottom_right": (0.8, 0.85),
}


def _load_font(font_path: Optional[str], font_size: int) -> ImageFont.ImageFont:
    """Load a TTF font, falling back to PIL's default if unavailable."""
    if font_path and os.path.exists(font_path):
        try:
            return ImageFont.truetype(font_path, font_size)
        except OSError:
            pass
    try:
        return ImageFont.truetype("DejaVuSans.ttf", font_size)
    except OSError:
        return ImageFont.load_default()


def render_text(
    text_config: Dict[str, Any],
    label_dimensions: Tuple[int, int],
    template: Dict[str, Any],
    method: str,
    foil_type: Optional[str] = None,
) -> np.ndarray:
    """Render a single text overlay to an RGBA numpy array.

    Args:
        text_config: dict with keys ``text``, optional ``font_path``,
            ``font_size``, ``zone`` and ``color`` (RGB tuple or hex string).
        label_dimensions: (width, height) of the flat label canvas.
        template: the bottle template (unused directly but kept for parity).
        method: application method (affects default colour choices).
        foil_type: foil for hot stamping (text rendered light so the foil
            renderer can map it).

    Returns:
        RGBA uint8 array of shape (height, width, 4).
    """
    width, height = int(label_dimensions[0]), int(label_dimensions[1])
    text = str(text_config.get("text", ""))
    font_size = int(text_config.get("font_size", max(height // 8, 12)))
    font = _load_font(text_config.get("font_path"), font_size)

    color = text_config.get("color")
    if color is None:
        # For hot stamping render white so the reflectivity mask is uniform.
        color = (255, 255, 255) if method == "hot_stamping" else (240, 240, 240)
    if isinstance(color, str):
        color = _hex_to_rgb(color)

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    zone = text_config.get("zone", "center")
    ax, ay = ZONE_ANCHORS.get(zone, ZONE_ANCHORS["center"])

    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        offx, offy = bbox[0], bbox[1]
    except (AttributeError, TypeError):
        tw, th = draw.textsize(text, font=font)  # type: ignore[attr-defined]
        offx = offy = 0

    px = int(ax * width - tw / 2 - offx)
    py = int(ay * height - th / 2 - offy)

    draw.text((px, py), text, font=font, fill=(int(color[0]), int(color[1]), int(color[2]), 255))

    return np.array(canvas, dtype=np.uint8)


def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    """Convert ``#RRGGBB`` to an (r, g, b) tuple."""
    v = value.lstrip("#")
    if len(v) != 6:
        raise ValueError(f"Invalid hex colour: {value!r}")
    return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
