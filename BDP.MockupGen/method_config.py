"""Central configuration for the three label application methods.

This module defines the per-method rendering parameters (``METHOD_CONFIGS``),
the available foil colours for hot stamping (``FOIL_COLORS``) and a small
validation helper (:func:`validate_method_foil`).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Method identifiers
# ---------------------------------------------------------------------------
STICKER = "sticker"
SILK_SCREEN = "silk_screen"
HOT_STAMPING = "hot_stamping"

VALID_METHODS: Tuple[str, ...] = (STICKER, SILK_SCREEN, HOT_STAMPING)


# ---------------------------------------------------------------------------
# Per-method rendering configuration
# ---------------------------------------------------------------------------
METHOD_CONFIGS: Dict[str, Dict[str, Any]] = {
    STICKER: {
        "has_edge": True,
        "edge_thickness_px": 2,
        "edge_color_darken": 0.15,
        "has_contact_shadow": True,
        "shadow_blur": 4,
        "shadow_opacity": 0.20,
        "surface_texture": "vinyl",
        "texture_opacity": 0.12,
        "substrate": "matte_paper",
        "blend_mode": "normal",
        "opacity": 1.0,
        "has_emboss": False,
        "emboss_intensity": 0.0,
        "emboss_direction": None,
        "has_screen_texture": False,
        "screen_texture_opacity": 0.0,
        "is_metallic": False,
        "specular_sharpness": 0.0,
        "environment_reflection": False,
        "ink_translucency": False,
    },
    SILK_SCREEN: {
        "has_edge": False,
        "edge_thickness_px": 0,
        "edge_color_darken": 0.0,
        "has_contact_shadow": False,
        "shadow_blur": 0,
        "shadow_opacity": 0.0,
        "surface_texture": None,
        "texture_opacity": 0.0,
        "blend_mode": "normal",
        "opacity": 0.92,
        "has_emboss": True,
        "emboss_intensity": 0.15,
        "emboss_direction": "outward",
        "has_screen_texture": True,
        "screen_texture_opacity": 0.06,
        "is_metallic": False,
        "specular_sharpness": 0.0,
        "environment_reflection": False,
        "ink_translucency": True,
    },
    HOT_STAMPING: {
        "has_edge": False,
        "edge_thickness_px": 0,
        "edge_color_darken": 0.0,
        "has_contact_shadow": False,
        "shadow_blur": 0,
        "shadow_opacity": 0.0,
        "surface_texture": None,
        "texture_opacity": 0.0,
        "blend_mode": "normal",
        "opacity": 1.0,
        "has_emboss": True,
        "emboss_intensity": 0.25,
        "emboss_direction": "inward",
        "has_screen_texture": False,
        "screen_texture_opacity": 0.0,
        "is_metallic": True,
        "specular_sharpness": 0.9,
        "environment_reflection": True,
        "ink_translucency": False,
    },
}


# ---------------------------------------------------------------------------
# Foil colours (hot stamping only)
# ---------------------------------------------------------------------------
# Each entry is either a single RGB tuple, or for special foils a dict with a
# ``"type"`` key describing how it should be rendered.
FOIL_COLORS: Dict[str, Any] = {
    "gold": (201, 162, 39),          # #C9A227
    "silver": (192, 192, 192),       # #C0C0C0
    "copper": (184, 115, 51),        # #B87333
    "rose_gold": (183, 110, 121),    # pinkish gold
    "holographic": {
        "type": "gradient",
        "stops": [
            (255, 0, 128),
            (128, 0, 255),
            (0, 200, 255),
            (0, 255, 128),
            (255, 220, 0),
        ],
    },
    "matte_gold": (170, 138, 60),
    "matte_silver": (160, 160, 160),
}

VALID_FOILS: Tuple[str, ...] = tuple(FOIL_COLORS.keys())


# ---------------------------------------------------------------------------
# Sticker substrate library
# ---------------------------------------------------------------------------
# Each substrate describes the look of the physical material the sticker is
# printed on. ``grain`` is base texture opacity, ``anisotropy`` biases the grain
# direction (0 = isotropic, 1 = strongly directional), ``sheen`` adds a soft
# specular response, and ``tint`` is a multiplicative RGB colour cast.
SUBSTRATES: Dict[str, Dict[str, Any]] = {
    "matte_paper": {
        "grain": 0.10,
        "anisotropy": 0.25,
        "grain_angle_deg": 0.0,
        "sheen": 0.04,
        "tint": (1.0, 1.0, 1.0),
    },
    "gloss_vinyl": {
        "grain": 0.05,
        "anisotropy": 0.10,
        "grain_angle_deg": 0.0,
        "sheen": 0.22,
        "tint": (1.0, 1.0, 1.0),
    },
    "textured_linen": {
        "grain": 0.18,
        "anisotropy": 0.85,
        "grain_angle_deg": 35.0,
        "sheen": 0.06,
        "tint": (0.99, 0.985, 0.96),
    },
    "kraft": {
        "grain": 0.16,
        "anisotropy": 0.45,
        "grain_angle_deg": 12.0,
        "sheen": 0.03,
        "tint": (0.92, 0.82, 0.66),
    },
}

DEFAULT_SUBSTRATE = "matte_paper"

VALID_SUBSTRATES: Tuple[str, ...] = tuple(SUBSTRATES.keys())


def get_substrate(substrate: Optional[str]) -> Dict[str, Any]:
    """Return the substrate config (defaults to ``matte_paper``)."""
    name = substrate or DEFAULT_SUBSTRATE
    if name not in SUBSTRATES:
        raise ValueError(
            f"Unknown substrate {name!r}. Valid substrates: {', '.join(VALID_SUBSTRATES)}"
        )
    return SUBSTRATES[name]

# Foils that should be rendered with a reduced specular response.
MATTE_FOILS: Tuple[str, ...] = ("matte_gold", "matte_silver")


def get_method_config(method: str) -> Dict[str, Any]:
    """Return the rendering configuration for ``method``.

    Raises:
        ValueError: if ``method`` is not a known application method.
    """
    if method not in METHOD_CONFIGS:
        raise ValueError(
            f"Unknown application method {method!r}. "
            f"Valid methods: {', '.join(VALID_METHODS)}"
        )
    return METHOD_CONFIGS[method]


def get_foil_color(foil_type: str) -> Any:
    """Return the colour definition for ``foil_type``."""
    if foil_type not in FOIL_COLORS:
        raise ValueError(
            f"Unknown foil type {foil_type!r}. "
            f"Valid foils: {', '.join(VALID_FOILS)}"
        )
    return FOIL_COLORS[foil_type]


def is_matte_foil(foil_type: str) -> bool:
    """Return True if ``foil_type`` is a matte (low-specular) foil."""
    return foil_type in MATTE_FOILS


def validate_method_foil(method: str, foil: Optional[str]) -> None:
    """Validate a (method, foil) combination.

    - ``foil`` is required (and must be valid) only for hot stamping.
    - For sticker / silk-screen a ``foil`` value must NOT be supplied.

    Raises:
        ValueError: on any invalid combination.
    """
    if method not in VALID_METHODS:
        raise ValueError(
            f"Unknown application method {method!r}. "
            f"Valid methods: {', '.join(VALID_METHODS)}"
        )

    if method == HOT_STAMPING:
        if foil is None:
            raise ValueError(
                "Hot stamping requires a foil_type "
                f"(one of: {', '.join(VALID_FOILS)})."
            )
        if foil not in FOIL_COLORS:
            raise ValueError(
                f"Unknown foil type {foil!r}. "
                f"Valid foils: {', '.join(VALID_FOILS)}"
            )
    else:
        if foil is not None:
            raise ValueError(
                f"foil_type is only valid for {HOT_STAMPING!r}; "
                f"method {method!r} does not use a foil."
            )


def suggest_method(
    logo_colors: List[Tuple[int, int, int]],
    bottle_material: str,
) -> str:
    """Bonus: suggest a sensible application method.

    Heuristic:
      * Mostly metallic/gold logo colours on dark glass -> hot stamping.
      * Single light flat colour on dark glass -> silk screen.
      * Multi-colour / photographic logo -> sticker.

    Args:
        logo_colors: list of dominant RGB colours in the logo.
        bottle_material: e.g. "dark_glass", "clear_glass", "plastic".

    Returns:
        One of the values in :data:`VALID_METHODS`.
    """
    if not logo_colors:
        return SILK_SCREEN

    distinct = len({tuple(c) for c in logo_colors})
    dark = "dark" in (bottle_material or "")

    def is_metallic(c: Tuple[int, int, int]) -> bool:
        r, g, b = c
        return r > 120 and g > 90 and b < 120 and abs(r - g) < 80

    metallic_share = sum(1 for c in logo_colors if is_metallic(c)) / len(logo_colors)

    if metallic_share >= 0.5 and dark:
        return HOT_STAMPING
    if distinct <= 2 and dark:
        return SILK_SCREEN
    if distinct <= 2:
        return SILK_SCREEN
    return STICKER
