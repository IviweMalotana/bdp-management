"""Silk-screen (direct ink print on glass) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Sequence, Tuple

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from render_utils import (  # noqa: E402
    emboss_layer,
    make_noise,
    merge_rgba,
    screen_blend,
    soft_light_blend,
    split_rgba,
)


def _screen_dot_texture(shape: Tuple[int, int], opacity: float, seed: int = 11) -> np.ndarray:
    """Fine halftone-like dot texture as a multiplier (~1.0)."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    dots = (np.sin(xx * 1.6) * np.sin(yy * 1.6) + 1.0) / 2.0
    noise = make_noise(shape, seed=seed)
    combined = 0.5 * dots + 0.5 * noise
    return (1.0 + (combined - 0.5) * 2.0 * opacity).astype(np.float32)


def render_silkscreen(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    bottle_base_color: Sequence[int],
) -> np.ndarray:
    """Render a silk-screen ink layer.

    Features: ink translucency (light ink over a dark bottle blended via
    soft-light/screen at the configured opacity), a subtle outward emboss to
    suggest raised ink, a fine screen-dot texture, and minimal ambient
    occlusion. There is intentionally no edge or contact shadow -- the ink is
    fused to the glass.

    Returns:
        RGBA uint8 layer.
    """
    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    base = np.array(bottle_base_color, dtype=np.float32) / 255.0
    base_lum = float(base.mean())

    ink = rgb / 255.0

    if config.get("ink_translucency", False):
        # Light ink on dark glass -> screen; dark ink on light glass -> soft light.
        base_tile = np.ones((h, w, 3), np.float32) * base[None, None, :]
        if ink.mean() > base_lum:
            blended = screen_blend(base_tile, ink)
        else:
            blended = soft_light_blend(base_tile, ink)
        # Mix between raw ink and blended ink for translucency.
        ink = 0.4 * ink + 0.6 * blended

    rgb = ink * 255.0

    # --- Subtle outward emboss ----------------------------------------------
    if config.get("has_emboss"):
        emb = emboss_layer(
            alpha,
            intensity=float(config.get("emboss_intensity", 0.15)),
            direction=config.get("emboss_direction", "outward"),
        )
        rgb += (emb * 255.0)[..., None]

    # --- Fine screen-dot texture --------------------------------------------
    if config.get("has_screen_texture"):
        tex = _screen_dot_texture((h, w), float(config.get("screen_texture_opacity", 0.06)))
        rgb *= tex[..., None]

    # --- Minimal AO ----------------------------------------------------------
    soft = cv2.GaussianBlur(alpha, (0, 0), sigmaX=1.0)
    rgb *= (0.97 + 0.03 * soft)[..., None]

    out_alpha = alpha * float(config.get("opacity", 0.92))
    return merge_rgba(rgb, out_alpha)
