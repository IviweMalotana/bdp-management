"""Sticker (printed vinyl/paper label) rendering pipeline."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Optional, Sequence, Tuple

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from render_utils import (  # noqa: E402
    contact_shadow,
    make_noise,
    merge_rgba,
    split_rgba,
)
from method_config import get_substrate  # noqa: E402


def _vinyl_texture(shape: Tuple[int, int], opacity: float, seed: int = 7) -> np.ndarray:
    """Return a subtle vinyl grain multiplier map (float ~1.0)."""
    noise = make_noise(shape, seed=seed, scale=1.5)
    grain = 1.0 + (noise - 0.5) * 2.0 * opacity
    return grain.astype(np.float32)


def _substrate_grain(
    shape: Tuple[int, int],
    substrate: Dict[str, Any],
    seed: int = 7,
) -> np.ndarray:
    """Procedural, directional/anisotropic substrate grain multiplier (~1.0).

    The grain is generated as noise then smeared along the substrate's grain
    angle to give a photographic, fibre-like (anisotropic) texture. Isotropic
    substrates fall back to near-round grain.
    """
    h, w = shape
    opacity = float(substrate.get("grain", 0.10))
    anis = float(np.clip(substrate.get("anisotropy", 0.3), 0.0, 1.0))
    angle = float(substrate.get("grain_angle_deg", 0.0))

    noise = make_noise(shape, seed=seed, scale=1.2)

    # Directional smear: a long, thin gaussian rotated to ``angle``.
    length = 1.0 + anis * 9.0
    sigma_x = max(length, 0.5)
    sigma_y = max(length * (1.0 - 0.9 * anis), 0.5)
    smeared = cv2.GaussianBlur(noise, (0, 0), sigmaX=sigma_x, sigmaY=sigma_y)
    if abs(angle) > 1e-3:
        m = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), angle, 1.0)
        smeared = cv2.warpAffine(
            smeared, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT
        )
    smeared = (smeared - smeared.min()) / max(float(np.ptp(smeared)), 1e-6)

    grain = 1.0 + (smeared - 0.5) * 2.0 * opacity
    return grain.astype(np.float32)


def render_sticker(
    warped_logo: np.ndarray,
    template: Dict[str, Any],
    lighting_profile: Dict[str, Any],
    config: Dict[str, Any],
    normal_map: Optional[np.ndarray] = None,
    depth_map: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Render a sticker label layer.

    Features: a thin darkened edge (die-cut look), a photographic directional
    substrate grain (selectable via ``config['substrate']``), a depth-driven
    contact shadow, edge ambient occlusion and a gentle lighting match to the
    bottle's average luminance.

    Args:
        warped_logo: warped RGBA label.
        template: bottle template.
        lighting_profile: lighting profile dict.
        config: method config.
        normal_map: optional HxWx3 surface normals (for edge sheen).
        depth_map: optional HxW relative depth (drives the contact shadow).

    Returns:
        RGBA uint8 layer the size of the warped logo canvas.
    """
    rgb, alpha = split_rgba(warped_logo)
    h, w = alpha.shape

    substrate = get_substrate(config.get("substrate"))

    # --- Edge / die-cut ring -------------------------------------------------
    if config.get("has_edge"):
        thickness = max(int(config.get("edge_thickness_px", 2)), 1)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (thickness * 2 + 1,) * 2)
        eroded = cv2.erode((alpha > 0.5).astype(np.uint8), kernel)
        edge_ring = ((alpha > 0.5).astype(np.uint8) - eroded).astype(bool)
        darken = float(config.get("edge_color_darken", 0.15))
        rgb[edge_ring] *= (1.0 - darken)

    # --- Substrate grain (anisotropic/directional) ---------------------------
    grain = _substrate_grain((h, w), substrate)
    rgb *= grain[..., None]

    # Substrate tint (e.g. kraft warmth).
    tint = np.array(substrate.get("tint", (1.0, 1.0, 1.0)), dtype=np.float32)
    rgb *= tint[None, None, :]

    # --- Substrate sheen (driven by the normal map if available) ------------
    sheen = float(substrate.get("sheen", 0.0))
    if sheen > 0.0:
        if normal_map is not None and normal_map.shape[:2] == (h, w):
            light = np.array(
                lighting_profile.get("key_light", [0.0, -1.0, 1.0]), dtype=np.float32
            )
            ln = float(np.linalg.norm(light))
            if ln > 1e-6:
                light = light / ln
            ndl = np.clip((normal_map * light[None, None, :]).sum(axis=-1), 0.0, 1.0)
        else:
            ndl = np.full((h, w), 0.5, dtype=np.float32)
        rgb += (ndl[..., None] * 255.0 * sheen)

    # --- Lighting match (gentle) --------------------------------------------
    avg = float(lighting_profile.get("average_luminance", 128.0))
    factor = np.clip(0.85 + (avg / 255.0) * 0.3, 0.7, 1.15)
    rgb *= factor

    # --- Edge ambient occlusion ---------------------------------------------
    inner = cv2.GaussianBlur(alpha, (0, 0), sigmaX=2.0)
    ao = np.clip(inner, 0, 1)
    rgb *= (0.92 + 0.08 * ao)[..., None]

    rgb = np.clip(rgb, 0, 255)
    sticker_rgba = merge_rgba(rgb, alpha * float(config.get("opacity", 1.0)))

    # --- Soft contact shadow (composited behind the sticker) -----------------
    if config.get("has_contact_shadow"):
        shadow_a = contact_shadow(
            alpha,
            blur=int(config.get("shadow_blur", 4)),
            opacity=float(config.get("shadow_opacity", 0.2)),
        )
        # Depth modulates contact: receding (low-depth) areas cast more occlusion.
        if depth_map is not None and depth_map.shape[:2] == (h, w):
            occ = 1.0 - np.clip(depth_map, 0.0, 1.0)
            shadow_a = shadow_a * (0.7 + 0.6 * occ)
        # Offset shadow slightly down for grounding.
        shadow_a = np.roll(np.clip(shadow_a, 0, 1), shift=2, axis=0)
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
