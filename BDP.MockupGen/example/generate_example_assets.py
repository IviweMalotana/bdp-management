"""Synthesize sample assets so the tool is runnable with zero external files.

Creates, in this directory:
  * bottle.png   -- a synthetic dark-glass cylindrical bottle.
  * logo.png     -- a transparent-background emblem + text logo.
  * texts.json   -- sample text overlays.
  * ../templates/SAMPLE-001.json -- a template matching the bottle's label area.

Run:
    python example/generate_example_assets.py
"""

from __future__ import annotations

import json
import os
from typing import Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATES_DIR = os.path.join(ROOT, "templates")

BOTTLE_W, BOTTLE_H = 600, 900
SKU = "SAMPLE-001"


def _font(size: int) -> ImageFont.ImageFont:
    for name in ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_bottle() -> Image.Image:
    """Draw a dark-glass bottle with a vertical highlight gradient."""
    img = Image.new("RGB", (BOTTLE_W, BOTTLE_H), (235, 235, 238))
    draw = ImageDraw.Draw(img)

    cx = BOTTLE_W // 2
    body_w = 300
    left = cx - body_w // 2
    right = cx + body_w // 2

    # Neck.
    draw.rectangle([cx - 45, 60, cx + 45, 180], fill=(20, 45, 30))
    draw.rectangle([cx - 55, 40, cx + 55, 75], fill=(35, 60, 45))
    # Shoulder + body.
    draw.rounded_rectangle([left, 180, right, 840], radius=40, fill=(18, 42, 28))

    # Cylindrical shading: brighten the centre, darken the edges.
    body = np.array(img).astype(np.float32)
    xs = np.arange(BOTTLE_W)
    shade = 1.0 - 0.55 * np.abs((xs - cx) / (body_w / 2.0)).clip(0, 1)
    highlight = np.exp(-(((xs - (cx - 50)) / 30.0) ** 2)) * 70.0
    col_factor = shade[None, :, None]
    body[:, :, :] *= col_factor
    body[180:840, :, :] += highlight[None, :, None]
    img = Image.fromarray(np.clip(body, 0, 255).astype(np.uint8))
    return img


def make_logo() -> Image.Image:
    """Transparent emblem + wordmark logo."""
    w, h = 360, 240
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Emblem ring.
    draw.ellipse([w // 2 - 70, 20, w // 2 + 70, 160], outline=(245, 240, 225, 255), width=8)
    draw.polygon(
        [(w // 2, 45), (w // 2 - 40, 135), (w // 2 + 40, 135)],
        fill=(245, 240, 225, 255),
    )
    # Wordmark.
    font = _font(46)
    text = "BDP"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, 165), text, font=font, fill=(245, 240, 225, 255))
    return img


def make_template() -> dict:
    """Template whose label region sits on the front of the bottle body."""
    cx = BOTTLE_W // 2
    top = 380
    bottom = 700
    half = 130
    corners = {
        "tl": [cx - half, top],
        "tr": [cx + half, top],
        "br": [cx + half, bottom],
        "bl": [cx - half, bottom],
    }
    return {
        "sku": SKU,
        "image_dimensions": [BOTTLE_W, BOTTLE_H],
        "label_corners": corners,
        "center_curve": [cx, (top + bottom) // 2],
        "bottle_type": "cylindrical",
        "bottle_material": "dark_glass",
        "lighting_reference_point": [cx - 50, (top + bottom) // 2],
        "default_method": "silk_screen",
    }


def make_texts() -> list:
    return [
        {"text": "RESERVE", "font_size": 34, "zone": "bottom", "color": "#F0E8C8"},
    ]


def main() -> None:
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

    bottle_path = os.path.join(HERE, "bottle.png")
    logo_path = os.path.join(HERE, "logo.png")
    texts_path = os.path.join(HERE, "texts.json")
    template_path = os.path.join(TEMPLATES_DIR, f"{SKU}.json")

    make_bottle().save(bottle_path)
    make_logo().save(logo_path)
    with open(texts_path, "w", encoding="utf-8") as fh:
        json.dump(make_texts(), fh, indent=2)
    with open(template_path, "w", encoding="utf-8") as fh:
        json.dump(make_template(), fh, indent=2)

    print("Wrote:")
    for p in (bottle_path, logo_path, texts_path, template_path):
        print(f"  {p}")


if __name__ == "__main__":
    main()
