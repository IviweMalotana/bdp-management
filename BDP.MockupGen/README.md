# BDP.MockupGen — Bottle Label Mockup Generator

A self-contained Python tool that renders realistic bottle-label mockups using
three distinct **application-method pipelines**:

| Method | Real-world process | Visual signature |
|--------|--------------------|------------------|
| `sticker` | Printed adhesive vinyl/paper label | Die-cut edge, contact shadow, vinyl grain |
| `silk_screen` | Ink screen-printed directly on the glass | Fused to glass, slight translucency, raised ink, no edge |
| `hot_stamping` | Metallic foil pressed with heat | Reflective foil, specular highlight, crisp debossed edges |

> This tool is **not** part of the C#/.NET API or the Next.js storefront — it is
> a standalone Python utility living under `BDP.MockupGen/`.

---

## Install

```bash
cd BDP.MockupGen
pip install -r requirements.txt
```

Dependencies: Pillow, opencv-python, numpy, scipy, click, tqdm.

---

## Quick start

```bash
python example/generate_example_assets.py        # synthesize sample assets
python mockup.py --bottle example/bottle.png \
  --logo example/logo.png \
  --template templates/SAMPLE-001.json \
  --method silk_screen --output out.png
```

See `example/README.md` for a full end-to-end walkthrough.

---

## Usage — all three methods

```bash
# Sticker
python mockup.py --bottle b.png --logo l.png --template t.json \
  --method sticker --output sticker.png

# Silk screen
python mockup.py --bottle b.png --logo l.png --template t.json \
  --method silk_screen --output silkscreen.png

# Hot stamping (requires --foil)
python mockup.py --bottle b.png --logo l.png --template t.json \
  --method hot_stamping --foil gold --output hotstamp.png
```

Foils: `gold`, `silver`, `copper`, `rose_gold`, `holographic`, `matte_gold`, `matte_silver`.

#### Sticker substrates

Stickers can be printed on different materials via `--substrate` (default
`matte_paper`):

```bash
python mockup.py --bottle b.png --logo l.png --template t.json \
  --method sticker --substrate textured_linen --output sticker.png
```

Substrates: `matte_paper`, `gloss_vinyl`, `textured_linen`, `kraft`. Each has its
own directional/anisotropic grain, sheen and colour tint.

> **Studio rendering:** the pipeline now estimates a per-pixel surface normal map
> and depth map from the template (`warper.compute_normal_map` /
> `compute_depth_map`, intensity auto-derived from `bottle_type`:
> cylindrical ≈ 0.16, oval ≈ 0.10, square = 0.0). These drive physically-plausible
> shading: silk-screen ink translucency + light-driven emboss + true halftone dot
> grid; hot-stamp specular from `dot(normal, light)` with a sharp falloff, a
> blurred environment reflection and a normal-driven holographic shift; sticker
> directional substrate grain and a depth-aware contact shadow. `analyze_bottle_lighting`
> additionally returns `key_light` (3D), `key_light_intensity`, `fill_ratio`,
> `color_temperature`, `surface_gloss` and `ambient_level`.

### Text overlays

Pass `--text` either a JSON string or a path to a JSON file:

```json
[
  {"text": "RESERVE", "font_path": null, "font_size": 34, "zone": "bottom", "color": "#F0E8C8"}
]
```

Zones: `top`, `center`, `bottom`, `top_left`, `top_right`, `bottom_left`, `bottom_right`.

### Batch mode

CSV columns: `bottle_image,logo_image,method,foil_type,text_json,output_name`

```bash
python mockup.py batch --batch jobs.csv --template t.json --output-dir out/
```

A `tqdm` progress bar is shown; failing rows are reported without aborting the run.

### Bonus tools

```bash
python mockup.py foil-swatches --output swatches.png   # preview all foils
```

Smart method suggestion is available programmatically via
`method_config.suggest_method(logo_colors, bottle_material)`.

---

## Supplier Handoff Pack

The pretty mockup is for the customer; the **supplier pack** is what goes to the
factory. It produces flat, correctly-sized PRODUCTION artwork to impose the design
onto bottles — separate from the warped preview.

```bash
python mockup.py supplier-pack \
  --mark example/logo.png \
  --template templates/SAMPLE-001.json \
  --method hot_stamping --foil gold \
  --text example/texts.json \
  --label-width-mm 60 --label-height-mm 90 \
  --dpi 300 --bleed-mm 3 \
  --out-dir example/supplier_pack
```

Outputs in `--out-dir`:

| File | What it is |
|------|------------|
| `artwork_print_ready.png` | The **flat** label artwork (logo + text) composited at the correct physical size (`label_width_mm × label_height_mm` at `--dpi`) plus `--bleed-mm` bleed on all four sides. **Not** warped onto the bottle. Transparent background for stickers (die-cut), white for silk-screen / hot-stamping. |
| `spec_sheet.pdf` | One-page A4 spec sheet (rendered with Pillow, saved as PDF — no reportlab): SKU, method, foil, label size in mm, bleed, dpi, dominant ink/foil hex colours, an artwork thumbnail, and placement coordinates (label corners + curve) in **px and mm**. |
| `placement.json` | Machine-readable placement spec: `sku`, `method`, `foil`, `label_mm`, `bleed_mm`, `dpi`, `label_corners` (px + mm), `curve_center` (px + mm), and sampled `colours`. |

Physical sizing: `pixels = mm / 25.4 × dpi`, with bleed added on all four sides.
Dominant colours are sampled from the flat artwork with a numpy histogram and
reported as hex (useful for ink / foil matching).

Programmatic use: `supplier_pack.generate_supplier_pack(...)`.

---

## Creating templates

A template (`templates/{sku}.json`) defines the label region on a specific bottle.

### GUI mode (needs a display)

```bash
python template_creator.py --bottle bottle.png --sku MY-SKU
```

Click the 4 label corners in order **tl, tr, br, bl**, then the **center-curve**
point. Press `s` to save, `r` to reset, `q`/Esc to abort.

### Headless mode (no display)

```bash
python template_creator.py --no-gui --sku MY-SKU \
  --dimensions 600,900 \
  --tl 170,380 --tr 430,380 --br 430,700 --bl 170,700 \
  --center 300,540
```

Template JSON shape:

```json
{
  "sku": "MY-SKU",
  "image_dimensions": [600, 900],
  "label_corners": {"tl": [..], "tr": [..], "br": [..], "bl": [..]},
  "center_curve": [300, 540],
  "bottle_type": "cylindrical",
  "bottle_material": "dark_glass",
  "lighting_reference_point": [300, 540],
  "default_method": "silk_screen"
}
```

---

## Quality standards comparison

| Property | Sticker | Silk screen | Hot stamping |
|----------|:-------:|:-----------:|:------------:|
| Edge / die-cut ring | Yes (2 px, darkened) | No | No (crisp clipped) |
| Contact shadow | Yes (soft) | No | No |
| Surface texture | Vinyl grain | Fine screen dots | None |
| Emboss | No | Outward (raised) | Inward (deboss) |
| Translucency | No | Yes | No |
| Metallic / specular | No | No | Yes (directional) |
| Environment reflection | No | No | Yes (subtle) |
| Layer opacity | 1.00 | 0.92 | 1.00 |

---

## Troubleshooting

| Artifact | Likely cause | Fix |
|----------|--------------|-----|
| Label looks flat / "pasted on" | Wrong method for the look | Use `silk_screen` for printed-on-glass, `sticker` for adhesive |
| Logo appears stretched | Template corners wrong order | Re-create template; order must be tl, tr, br, bl |
| Logo bulges too much/little | Cylindrical intensity | Adjust `intensity` in `warper.cylindrical_warp` (default 0.15) |
| Foil too dull | Matte foil or weak highlight | Use a glossy foil; check `specular_sharpness` in `method_config` |
| Silk-screen ink invisible on dark glass | Ink darker than glass | Use a lighter ink/logo colour (translucency uses screen blend) |
| Hard jagged label edge | Expected for hot stamping | For soft edges use sticker/silk-screen |
| `Could not read image` | Bad path / unsupported format | Use PNG/JPG; logos prefer PNG with alpha |
| Text missing | Font not found | `font_path` falls back to DejaVu/PIL default automatically |

---

## Headless / CI notes

- **Template creation** GUI needs an X display. In headless environments use
  `--no-gui` (fully scriptable) — this is the recommended path for CI.
- The render pipeline itself needs **no display** (pure OpenCV/NumPy/PIL).
- All assets in `example/` are **synthesized**, so the tool runs without any
  external photos.

---

## Architecture

```
compositor.generate_mockup()
  ├─ method_config.validate_method_foil / get_method_config
  ├─ template_creator.load_template
  ├─ lighting.analyze_bottle_lighting
  ├─ warper.perspective_warp + cylindrical_warp
  ├─ renderers.{sticker,silkscreen,hotstamp}
  ├─ text_renderer.render_text  (warped + routed through same renderer)
  └─ composite → colour correct → save (+ debug layers)
```
