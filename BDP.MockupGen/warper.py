"""Geometric warping utilities.

Provides perspective warping (planar) and cylindrical mesh warping so a flat
label/logo image can be mapped onto the curved surface of a bottle.
"""

from __future__ import annotations

from typing import Any, Dict, List, Sequence, Tuple

import cv2
import numpy as np


Quad = Sequence[Sequence[float]]


def _to_float_quad(quad: Quad) -> np.ndarray:
    """Convert a 4-point quad into a (4, 2) float32 numpy array."""
    arr = np.asarray(quad, dtype=np.float32)
    if arr.shape != (4, 2):
        raise ValueError(f"Expected a 4x2 quad, got shape {arr.shape}.")
    return arr


def perspective_warp(
    image: np.ndarray,
    source_quad: Quad,
    target_quad: Quad,
    output_size: Tuple[int, int] | None = None,
) -> np.ndarray:
    """Warp ``image`` so its ``source_quad`` maps onto ``target_quad``.

    Args:
        image: source image (H, W, C). RGBA recommended.
        source_quad: 4 points (tl, tr, br, bl) in the source image.
        target_quad: 4 destination points (tl, tr, br, bl).
        output_size: (width, height) of the output canvas. Defaults to the
            input image size.

    Returns:
        The warped image on a transparent (zero) canvas.
    """
    src = _to_float_quad(source_quad)
    dst = _to_float_quad(target_quad)

    if output_size is None:
        h, w = image.shape[:2]
        output_size = (w, h)

    matrix = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        image,
        matrix,
        output_size,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    return warped


def cylindrical_warp(
    image: np.ndarray,
    label_corners: Dict[str, Sequence[float]],
    center_curve: Sequence[float],
    intensity: float = 0.15,
) -> np.ndarray:
    """Deform a (already perspective-mapped) label to follow a cylinder.

    A horizontal sinusoidal displacement is applied via ``cv2.remap`` so the
    middle of the label bulges toward the viewer (controlled by
    ``center_curve``) and the edges recede, simulating wrap on a cylinder.

    Args:
        image: image already placed at the label region (full bottle canvas).
        label_corners: dict with ``tl``, ``tr``, ``br``, ``bl`` points.
        center_curve: [x, y] point marking the visual centre/peak of the curve.
        intensity: 0..1 strength of the horizontal displacement.

    Returns:
        The cylindrically warped image, same size as input.
    """
    h, w = image.shape[:2]

    xs = np.array([label_corners[k][0] for k in ("tl", "tr", "br", "bl")], dtype=np.float32)
    left = float(xs.min())
    right = float(xs.max())
    width = max(right - left, 1.0)
    cx = float(center_curve[0])

    # Build identity maps.
    map_x, map_y = np.meshgrid(
        np.arange(w, dtype=np.float32),
        np.arange(h, dtype=np.float32),
    )

    # Normalised horizontal position across the label region (-1..1 around cx).
    norm = (map_x - cx) / (width / 2.0)
    np.clip(norm, -1.5, 1.5, out=norm)

    # Cylindrical foreshortening: sample further from centre toward the edges.
    displacement = intensity * (width / 2.0) * np.sin(norm * (np.pi / 2.0))
    src_x = map_x + displacement
    src_x = np.clip(src_x, 0, w - 1).astype(np.float32)

    warped = cv2.remap(
        image,
        src_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    return warped


# ---------------------------------------------------------------------------
# Bottle-type driven cylindrical intensity
# ---------------------------------------------------------------------------
#: Default cylindrical warp intensity per ``bottle_type``.
CYLINDRICAL_INTENSITY: Dict[str, float] = {
    "cylindrical": 0.16,
    "oval": 0.10,
    "square": 0.0,
    "flat": 0.0,
}


def intensity_for_bottle_type(bottle_type: str | None) -> float:
    """Return the cylindrical warp intensity to use for ``bottle_type``.

    Cylindrical bottles bulge most (~0.16), oval less (~0.10) and square/flat
    bottles not at all (0.0). Unknown types fall back to the cylindrical value.
    """
    if not bottle_type:
        return CYLINDRICAL_INTENSITY["cylindrical"]
    return CYLINDRICAL_INTENSITY.get(str(bottle_type).lower(), CYLINDRICAL_INTENSITY["cylindrical"])


def compute_depth_map(template: Dict[str, Any]) -> np.ndarray:
    """Estimate a relative depth map for the label region of ``template``.

    The depth encodes how far each pixel of the label recedes from the viewer
    as the surface wraps around the vessel. For a cylinder the centre column
    (``center_curve`` x) bulges toward the viewer (depth ~1.0) and the left/right
    edges recede (depth ->0). The intensity of the curvature is derived from the
    ``bottle_type`` (see :func:`intensity_for_bottle_type`). Pixels outside the
    label region are 0.

    Args:
        template: parsed template dict.

    Returns:
        HxW float32 array, relative depth in 0..1 (1 = closest to viewer).
    """
    w, h = template["image_dimensions"]
    corners = template["label_corners"]
    xs = np.array([corners[k][0] for k in ("tl", "tr", "br", "bl")], dtype=np.float32)
    left = float(xs.min())
    right = float(xs.max())
    half = max((right - left) / 2.0, 1.0)
    cx = float(template["center_curve"][0])

    intensity = intensity_for_bottle_type(template.get("bottle_type"))

    map_x = np.arange(w, dtype=np.float32)[None, :].repeat(h, axis=0)
    norm = np.clip((map_x - cx) / half, -1.0, 1.0)
    # cos profile -> 1 at centre, 0 at the edges. Scaled by curvature intensity.
    profile = np.cos(norm * (np.pi / 2.0))
    flat = max(0.0, 1.0 - intensity / 0.16)  # square bottles stay ~flat
    depth = flat + (1.0 - flat) * profile

    # Mask to the label region.
    mask = _label_mask(template)
    depth = depth.astype(np.float32) * (mask > 0)
    return np.clip(depth, 0.0, 1.0).astype(np.float32)


def compute_normal_map(template: Dict[str, Any]) -> np.ndarray:
    """Estimate per-pixel surface normals for the label region of ``template``.

    Normals are derived from the curvature implied by the label corners and the
    centre curve: across the width the surface turns away from the viewer like a
    cylinder, while a gentle vertical component follows the top/bottom taper of
    the corners. The result is a tangent-space-ish normal map suitable for
    driving specular and holographic shading in the renderers.

    Args:
        template: parsed template dict.

    Returns:
        HxWx3 float32 array of unit normals. The background (outside the label)
        is the flat normal ``[0, 0, 1]``.
    """
    w, h = template["image_dimensions"]
    corners = template["label_corners"]
    xs = np.array([corners[k][0] for k in ("tl", "tr", "br", "bl")], dtype=np.float32)
    ys = np.array([corners[k][1] for k in ("tl", "tr", "br", "bl")], dtype=np.float32)
    left, right = float(xs.min()), float(xs.max())
    top, bottom = float(ys.min()), float(ys.max())
    half_w = max((right - left) / 2.0, 1.0)
    half_h = max((bottom - top) / 2.0, 1.0)
    cx = float(template["center_curve"][0])
    cyv = float(template["center_curve"][1])

    intensity = intensity_for_bottle_type(template.get("bottle_type"))

    grid_x = np.arange(w, dtype=np.float32)[None, :].repeat(h, axis=0)
    grid_y = np.arange(h, dtype=np.float32)[:, None].repeat(w, axis=1)

    # Horizontal turn of the surface (cylinder): nx proportional to sin(angle).
    nx = np.sin(np.clip((grid_x - cx) / half_w, -1.0, 1.0) * (np.pi / 2.0)) * intensity * 6.0
    # Slight vertical curvature toward the centre row (much gentler).
    ny = np.sin(np.clip((grid_y - cyv) / half_h, -1.0, 1.0) * (np.pi / 2.0)) * intensity * 1.5
    nz = np.ones_like(nx)

    normals = np.stack([nx, ny, nz], axis=-1).astype(np.float32)
    norm = np.linalg.norm(normals, axis=-1, keepdims=True)
    norm = np.where(norm < 1e-6, 1.0, norm)
    normals = normals / norm

    mask = (_label_mask(template) > 0)[..., None]
    flat = np.zeros_like(normals)
    flat[..., 2] = 1.0
    normals = np.where(mask, normals, flat)
    return normals.astype(np.float32)


def _label_mask(template: Dict[str, Any]) -> np.ndarray:
    """Filled uint8 polygon mask of the label region."""
    w, h = template["image_dimensions"]
    mask = np.zeros((h, w), np.uint8)
    c = template["label_corners"]
    quad = np.array([c["tl"], c["tr"], c["br"], c["bl"]], dtype=np.int32)
    cv2.fillConvexPoly(mask, quad, 255)
    return mask


def generate_uv_map(template: Dict[str, Any]) -> np.ndarray:
    """Generate a normalised UV map for the label region of ``template``.

    The returned array has shape (H, W, 2) with float values in 0..1 giving the
    (u, v) coordinate of each pixel within the label quad. Pixels outside the
    quad are set to -1.

    Args:
        template: parsed template dict (see template_creator).

    Returns:
        UV map array of shape (H, W, 2).
    """
    w, h = template["image_dimensions"]
    corners = template["label_corners"]
    quad = np.array(
        [corners["tl"], corners["tr"], corners["br"], corners["bl"]],
        dtype=np.float32,
    )
    unit = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], dtype=np.float32)

    # Map label-quad -> unit square.
    matrix = cv2.getPerspectiveTransform(quad, unit)

    ys, xs = np.mgrid[0:h, 0:w]
    pts = np.stack([xs.ravel(), ys.ravel(), np.ones(xs.size)], axis=0).astype(np.float32)
    mapped = matrix @ pts
    mapped /= mapped[2:3, :]
    u = mapped[0].reshape(h, w)
    v = mapped[1].reshape(h, w)

    inside = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    uv = np.full((h, w, 2), -1.0, dtype=np.float32)
    uv[..., 0] = np.where(inside, u, -1.0)
    uv[..., 1] = np.where(inside, v, -1.0)
    return uv


def target_quad_from_template(template: Dict[str, Any]) -> List[List[float]]:
    """Return the label corners of ``template`` as an ordered quad list."""
    c = template["label_corners"]
    return [list(c["tl"]), list(c["tr"]), list(c["br"]), list(c["bl"])]


def source_quad_from_image(image: np.ndarray) -> List[List[float]]:
    """Return the full-image quad (tl, tr, br, bl) for ``image``."""
    h, w = image.shape[:2]
    return [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]]
