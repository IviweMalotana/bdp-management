"""Bottle lighting analysis.

Extracts a lighting profile from the bottle photo under the label region so
that rendered labels can be shaded to match the original scene.
"""

from __future__ import annotations

from typing import Any, Dict, List

import cv2
import numpy as np


def _ensure_bgr(image: np.ndarray) -> np.ndarray:
    """Return a 3-channel BGR image regardless of input channel count."""
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image


def analyze_bottle_lighting(
    bottle_image: np.ndarray,
    label_region_mask: np.ndarray,
) -> Dict[str, Any]:
    """Analyse lighting under the label region of a bottle photo.

    Args:
        bottle_image: BGR or BGRA bottle photo as a numpy array.
        label_region_mask: uint8 mask (H, W), non-zero where the label sits.

    Returns:
        Dict with keys:
            average_luminance: float 0..255 mean luminance under the label.
            highlight_direction: [dx, dy] unit-ish vector of brightening,
                from Sobel gradients.
            shadow_depth: float 0..1, how dark the shadow side is.
            bottle_base_color: [r, g, b] dominant colour under the label.
            surface_type: heuristic string ("glossy" / "matte").
    """
    bgr = _ensure_bgr(bottle_image)
    h, w = bgr.shape[:2]

    mask = label_region_mask
    if mask.shape[:2] != (h, w):
        mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
    mask_bool = mask > 0
    if not np.any(mask_bool):
        mask_bool = np.ones((h, w), dtype=bool)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    region_vals = gray[mask_bool]
    average_luminance = float(region_vals.mean())

    # Highlight direction via Sobel gradient, averaged within the region.
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=5)
    dx = float(gx[mask_bool].mean())
    dy = float(gy[mask_bool].mean())
    norm = (dx * dx + dy * dy) ** 0.5
    if norm > 1e-6:
        highlight_direction: List[float] = [dx / norm, dy / norm]
    else:
        highlight_direction = [0.0, -1.0]

    # Shadow depth: spread between dark and bright pixels in the region.
    p5 = float(np.percentile(region_vals, 5))
    p95 = float(np.percentile(region_vals, 95))
    shadow_depth = float(np.clip((p95 - p5) / 255.0, 0.0, 1.0))

    # Dominant base colour (BGR -> RGB) via mean of region pixels.
    region_pixels = bgr[mask_bool].astype(np.float32)
    mean_bgr = region_pixels.mean(axis=0)
    bottle_base_color = [
        int(round(mean_bgr[2])),
        int(round(mean_bgr[1])),
        int(round(mean_bgr[0])),
    ]

    # Surface heuristic: high local contrast / bright highlights -> glossy.
    surface_type = "glossy" if (p95 > 200 and shadow_depth > 0.4) else "matte"

    return {
        "average_luminance": average_luminance,
        "highlight_direction": highlight_direction,
        "shadow_depth": shadow_depth,
        "bottle_base_color": bottle_base_color,
        "surface_type": surface_type,
    }


def build_shading_map(
    bottle_image: np.ndarray,
    label_region_mask: np.ndarray,
    average_luminance: float,
) -> np.ndarray:
    """Build a per-pixel multiplicative shading map normalised around 1.0.

    Brighter areas of the original bottle (relative to the label-region mean)
    yield values > 1.0, darker areas < 1.0. Useful to modulate rendered labels.
    """
    bgr = _ensure_bgr(bottle_image)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    base = max(average_luminance, 1.0)
    shading = gray / base
    shading = cv2.GaussianBlur(shading, (0, 0), sigmaX=9)
    return np.clip(shading, 0.6, 1.4)
