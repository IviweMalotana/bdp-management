"""Shared low-level helpers used by the method renderers."""

from __future__ import annotations

from typing import Tuple

import cv2
import numpy as np


def ensure_rgba(image: np.ndarray) -> np.ndarray:
    """Return ``image`` as a 4-channel uint8 RGBA array."""
    if image.ndim == 2:
        rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        alpha = np.full(image.shape[:2], 255, np.uint8)
        return np.dstack([rgb, alpha])
    if image.shape[2] == 3:
        alpha = np.full(image.shape[:2], 255, np.uint8)
        return np.dstack([image, alpha])
    return image.astype(np.uint8)


def split_rgba(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Split an RGBA image into (rgb float32 0..255, alpha float32 0..1)."""
    rgba = ensure_rgba(image)
    rgb = rgba[..., :3].astype(np.float32)
    alpha = rgba[..., 3].astype(np.float32) / 255.0
    return rgb, alpha


def merge_rgba(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Merge rgb (float 0..255) + alpha (float 0..1) into uint8 RGBA."""
    rgb_u = np.clip(rgb, 0, 255).astype(np.uint8)
    alpha_u = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    return np.dstack([rgb_u, alpha_u])


def alpha_mask(image: np.ndarray) -> np.ndarray:
    """Return the alpha channel of an RGBA image as uint8 (0..255)."""
    return ensure_rgba(image)[..., 3]


def make_noise(shape: Tuple[int, int], seed: int = 0, scale: float = 1.0) -> np.ndarray:
    """Return float32 noise in 0..1 of the given (h, w) shape."""
    rng = np.random.default_rng(seed)
    noise = rng.random(shape, dtype=np.float32)
    if scale != 1.0:
        noise = cv2.GaussianBlur(noise, (0, 0), sigmaX=max(scale, 0.5))
        noise = (noise - noise.min()) / max(float(np.ptp(noise)), 1e-6)
    return noise


def soft_light_blend(base: np.ndarray, blend: np.ndarray) -> np.ndarray:
    """Photoshop-style soft-light blend. Inputs/outputs float 0..1."""
    b = base
    s = blend
    return np.where(
        s <= 0.5,
        b - (1 - 2 * s) * b * (1 - b),
        b + (2 * s - 1) * (np.where(b <= 0.25, ((16 * b - 12) * b + 4) * b, np.sqrt(b)) - b),
    )


def screen_blend(base: np.ndarray, blend: np.ndarray) -> np.ndarray:
    """Screen blend. Inputs/outputs float 0..1."""
    return 1.0 - (1.0 - base) * (1.0 - blend)


def emboss_layer(
    alpha: np.ndarray,
    intensity: float,
    direction: str,
) -> np.ndarray:
    """Produce a signed emboss highlight/shadow map from an alpha mask.

    Args:
        alpha: float 0..1 mask of the printed area.
        intensity: 0..1 strength.
        direction: "outward" (raised) or "inward" (debossed).

    Returns:
        float32 map roughly in -intensity..intensity to add to luminance.
    """
    a = (alpha * 255.0).astype(np.float32)
    gx = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)
    # Light coming from top-left.
    emboss = (gx + gy)
    m = np.abs(emboss).max()
    if m > 1e-6:
        emboss /= m
    if direction == "inward":
        emboss = -emboss
    return emboss * intensity


def contact_shadow(alpha: np.ndarray, blur: int, opacity: float) -> np.ndarray:
    """Return a soft drop/contact shadow alpha map (float 0..1)."""
    shadow = cv2.GaussianBlur(alpha.astype(np.float32), (0, 0), sigmaX=max(blur, 1))
    return np.clip(shadow * opacity, 0, 1)
