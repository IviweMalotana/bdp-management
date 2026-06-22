"""Hot-stamping (metallic foil) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Optional, Sequence, Tuple

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
    return _gradient_from_t(t, stops, noise_seed=21)


def _gradient_from_t(
    t: np.ndarray,
    stops: Sequence[Sequence[int]],
    noise_seed: int = 21,
) -> np.ndarray:
    """Map a 0..1 parameter field ``t`` through multi-stop colour ``stops``."""
    n = len(stops) - 1
    pos = np.clip(t, 0.0, 1.0) * n
    idx = np.clip(pos.astype(int), 0, n - 1)
    frac = (pos - idx)[..., None]
    stops_arr = np.array(stops, dtype=np.float32)
    c0 = stops_arr[idx]
    c1 = stops_arr[np.clip(idx + 1, 0, n)]
    grad = c0 * (1 - frac) + c1 * frac
    noise = make_noise(t.shape, seed=noise_seed, scale=2.0)[..., None]
    grad = np.clip(grad + (noise - 0.5) * 40.0, 0, 255)
    return grad.astype(np.float32)


def render_hotstamp(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    foil_type: str = "gold",
    normal_map: Optional[np.ndarray] = None,
    depth_map: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Render a hot-stamped metallic foil layer.

    Features: a luminance-derived reflectivity mask drives the metallic shading;
    the foil colour is applied; a sharp specular highlight is computed from
    ``dot(normal, light_dir)`` raised to a high power (~8) so the glint is tight;
    a subtle blurred environment-reflection gradient; an inward (debossed)
    emboss; and -- for holographic foil -- an angle-dependent gradient whose
    hue shift is driven by the surface normal map. Supports gold, silver,
    copper, rose_gold, holographic, matte_gold and matte_silver.

    Returns:
        RGBA uint8 layer.
    """
    if foil_type not in FOIL_COLORS:
        raise ValueError(f"Unknown foil type {foil_type!r}.")

    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    refl = _reflectivity_mask(rgb)

    # Light direction (3D). Fall back to a frontal top-left key light.
    light = np.array(
        lighting_profile.get("key_light", [-0.4, -0.6, 0.7]), dtype=np.float32
    )
    ln = float(np.linalg.norm(light))
    if ln > 1e-6:
        light = light / ln

    # Surface normals: use the supplied map, else assume flat facing the viewer.
    if normal_map is not None and normal_map.shape[:2] == (h, w):
        normals = normal_map.astype(np.float32)
    else:
        normals = np.zeros((h, w, 3), np.float32)
        normals[..., 2] = 1.0

    ndl = np.clip((normals * light[None, None, :]).sum(axis=-1), 0.0, 1.0)

    foil = get_foil_color(foil_type)
    if isinstance(foil, dict) and foil.get("type") == "gradient":
        # Holographic: the gradient parameter is driven by the surface normal's
        # horizontal component so the colour shift tracks the curvature/angle.
        t = (normals[..., 0] * 0.5 + 0.5)
        # add a diagonal component for richness
        yy, xx = np.mgrid[0:h, 0:w]
        diag = (xx + yy).astype(np.float32)
        diag = (diag - diag.min()) / max(float(np.ptp(diag)), 1e-6)
        t = np.clip(0.6 * t + 0.4 * diag, 0.0, 1.0)
        base_color = _gradient_from_t(t, foil["stops"], noise_seed=21)
    else:
        base_color = np.ones((h, w, 3), np.float32) * np.array(foil, np.float32)[None, None, :]

    # Metallic shading: modulate foil colour by reflectivity and normal-facing.
    shade = 0.45 + 0.55 * refl + 0.30 * ndl
    metal = base_color * shade[..., None]

    # --- Sharp specular from dot(normal, light) -----------------------------
    sharp = float(config.get("specular_sharpness", 0.9))
    spec_power = 8.0
    spec_strength = 0.9
    if is_matte_foil(foil_type):
        spec_power = 3.0
        spec_strength = 0.25
    spec = np.power(ndl, spec_power) * sharp
    metal += (spec[..., None] * 255.0 * spec_strength)

    # --- Subtle blurred environment-reflection gradient ---------------------
    if config.get("environment_reflection"):
        yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None].repeat(w, axis=1)
        # smooth vertical light/dark sweep (a faux studio softbox)
        env = 0.5 + 0.5 * np.sin(yy * np.pi * 1.5 + 0.4)
        env = cv2.GaussianBlur(env, (0, 0), sigmaX=8.0)
        strength = 30.0 if not is_matte_foil(foil_type) else 12.0
        metal += (env[..., None] - 0.5) * strength

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
