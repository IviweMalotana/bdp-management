"""Method-specific rendering pipelines.

Each renderer takes a warped RGBA logo (already mapped to the bottle canvas),
the template, a lighting profile and the method config, and returns an RGBA
layer ready to be composited onto the bottle.
"""

from .sticker_renderer import render_sticker
from .silkscreen_renderer import render_silkscreen
from .hotstamp_renderer import render_hotstamp

__all__ = ["render_sticker", "render_silkscreen", "render_hotstamp"]
