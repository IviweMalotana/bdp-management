"""Silk-screen (direct ink print on glass) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Optional, Sequence, Tuple

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from render_utils import (  # noqa: E402
    emboss_layer,
    merge_rgba,
    screen_blend,
    soft_light_blend,
    split_rgba,
)


def _halftone_dot_grid(
    shape: Tuple[int, int],
    opacity: float,
    spacing: int = 4,
    seed: int = 11,
) -> np.ndarray:
    """Return a true halftone dot-grid multiplier map (~1.0).

    A regular grid of soft circular dots (period ``spacing`` px) rather than
    random noise, reproducing the mesh signature of screen printing.
    """
    h, w = shape
    spacing = max(int(spacing), 2)
    yy, xx = np.mgrid[0:h, 0:w]
    # Distance from each pixel to the nearest grid node.
    dx = ((xx % spacing) - spacing / 2.0)
    dy = ((yy % spacing) - spacing / 2.0)
    dist = np.sqrt(dx * dx + dy * dy) / (spacing / 2.0)
    # Dot is bright at the node centre, fading out toward the cell edge.
    dot = np.clip(1.0 - dist, 0.0, 1.0)
    dot = dot ** 1.5
    grid = 1.0 - (dot * opacity)
    return grid.astype(np.float32)


def render_silkscreen(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    bottle_base_color: Sequence[int],
    normal_map: Optional[np.ndarray] = None,
    depth_map: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Render a silk-screen ink layer.

    Features: physically-reasoned ink translucency that blends the ink over the
    sampled vessel base colour, a positive (outward) emboss whose highlight side
    is driven by the scene key-light direction, a true fine halftone dot grid
    (not random noise), and minimal ambient occlusion. There is intentionally no
    edge or contact shadow -- the ink is fused to the glass.

    Returns:
        RGBA uint8 layer.
    """
    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    base = np.array(bottle_base_color, dtype=np.float32) / 255.0
    base_lum = float(base.mean())

    ink = rgb / 255.0

    if config.get("ink_translucency", False):
        # Translucency: ink film partially transmits the vessel colour beneath.
        # Light ink on dark glass -> screen; dark ink on light glass -> soft light.
        base_tile = np.ones((h, w, 3), np.float32) * base[None, None, :]
        if ink.mean() > base_lum:
            blended = screen_blend(base_tile, ink)
        else:
            blended = soft_light_blend(base_tile, ink)
        # Translucency factor: glossier/darker glass shows more show-through.
        trans = float(np.clip(0.6 - 0.25 * base_lum, 0.35, 0.7))
        ink = (1.0 - trans) * ink + trans * blended

    rgb = ink * 255.0

    # --- Positive (outward) emboss driven by light direction ----------------
    if config.get("has_emboss"):
        light = lighting_profile.get("key_light", lighting_profile.get("highlight_direction", [0.0, -1.0]))
        lx, ly = float(light[0]), float(light[1])
        a = (alpha * 255.0).astype(np.float32)
        gx = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)
        # Highlight where the raised-ink slope faces the light.
        emb = -(gx * lx + gy * ly)
        m = float(np.abs(emb).max())
        if m > 1e-6:
            emb /= m
        emb *= float(config.get("emboss_intensity", 0.15))
        if config.get("emboss_direction", "outward") == "inward":
            emb = -emb
        rgb += (emb * 255.0)[..., None]

    # --- True halftone dot grid ---------------------------------------------
    if config.get("has_screen_texture"):
        tex = _halftone_dot_grid(
            (h, w),
            float(config.get("screen_texture_opacity", 0.06)),
            spacing=int(config.get("halftone_spacing", 4)),
        )
        rgb *= tex[..., None]

    # --- Minimal AO ----------------------------------------------------------
    soft = cv2.GaussianBlur(alpha, (0, 0), sigmaX=1.0)
    rgb *= (0.97 + 0.03 * soft)[..., None]

    rgb = np.clip(rgb, 0, 255)
    out_alpha = alpha * float(config.get("opacity", 0.92))
    return merge_rgba(rgb, out_alpha)
