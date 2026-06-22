"""Hot-stamping (metallic foil) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Sequence, Tuple

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from render_utils import emboss_layer, make_noise, merge_rgba, split_rgba  # noqa: E402
from method_config import FOIL_COLORS, get_foil_color, is_matte_foil  # noqa: E402


def _reflectivity_mask(rgb: np.ndarray) -> np.ndarray:
    """Grayscale luminance reflectivity mask (float 0..1) from logo rgb."""
    gray = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0
    gray = cv2.normalize(gray, None, 0.0, 1.0, cv2.NORM_MINMAX)
    return gray.astype(np.float32)


def _holographic_map(shape: Tuple[int, int], stops: Sequence[Sequence[int]]) -> np.ndarray:
    """Build a diagonal multi-stop gradient + noise for holographic foil."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    t = (xx + yy).astype(np.float32)
    t = (t - t.min()) / max(float(np.ptp(t)), 1e-6)
    n = len(stops) - 1
    pos = t * n
    idx = np.clip(pos.astype(int), 0, n - 1)
    frac = (pos - idx)[..., None]
    stops_arr = np.array(stops, dtype=np.float32)
    c0 = stops_arr[idx]
    c1 = stops_arr[np.clip(idx + 1, 0, n)]
    grad = c0 * (1 - frac) + c1 * frac
    noise = make_noise(shape, seed=21, scale=2.0)[..., None]
    grad = np.clip(grad + (noise - 0.5) * 60.0, 0, 255)
    return grad.astype(np.float32)


def render_hotstamp(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    foil_type: str = "gold",
) -> np.ndarray:
    """Render a hot-stamped metallic foil layer.

    Features: a luminance-derived reflectivity mask drives the metallic shading;
    the foil colour is applied (holographic uses a gradient map + noise); a
    directional specular highlight is added from the lighting highlight
    direction; a faint fake environment reflection; an inward (debossed) emboss;
    and crisp hard edges.

    Returns:
        RGBA uint8 layer.
    """
    if foil_type not in FOIL_COLORS:
        raise ValueError(f"Unknown foil type {foil_type!r}.")

    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    refl = _reflectivity_mask(rgb)

    foil = get_foil_color(foil_type)
    if isinstance(foil, dict) and foil.get("type") == "gradient":
        base_color = _holographic_map((h, w), foil["stops"])
    else:
        base_color = np.ones((h, w, 3), np.float32) * np.array(foil, np.float32)[None, None, :]

    # Metallic shading: modulate foil colour by reflectivity (dark->bright range).
    shade = 0.45 + 0.85 * refl
    metal = base_color * shade[..., None]

    # --- Directional specular highlight -------------------------------------
    hd = lighting_profile.get("highlight_direction", [0.0, -1.0])
    sharp = float(config.get("specular_sharpness", 0.9))
    if is_matte_foil(foil_type):
        sharp *= 0.3
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    yy = (yy / h) - 0.5
    xx = (xx / w) - 0.5
    proj = xx * hd[0] + yy * hd[1]
    proj = (proj - proj.min()) / max(float(np.ptp(proj)), 1e-6)
    spec = np.power(np.clip(proj, 0, 1), 1.0 + 8.0 * sharp)
    metal += (spec[..., None] * 255.0 * (0.6 if not is_matte_foil(foil_type) else 0.2))

    # --- Fake environment reflection ----------------------------------------
    if config.get("environment_reflection"):
        env = make_noise((h, w), seed=33, scale=6.0)
        env = cv2.GaussianBlur(env, (0, 0), sigmaX=4.0)
        metal += (env[..., None] - 0.5) * 50.0

    # --- Inward emboss (deboss) ---------------------------------------------
    if config.get("has_emboss"):
        emb = emboss_layer(
            alpha,
            intensity=float(config.get("emboss_intensity", 0.25)),
            direction=config.get("emboss_direction", "inward"),
        )
        metal += (emb * 255.0)[..., None]

    metal = np.clip(metal, 0, 255)

    # Crisp hard edges: threshold alpha instead of feathering.
    hard_alpha = (alpha > 0.5).astype(np.float32) * float(config.get("opacity", 1.0))

    return merge_rgba(metal, hard_alpha)
