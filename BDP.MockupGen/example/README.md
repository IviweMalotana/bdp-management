# Example — End-to-End

This folder synthesizes all assets so the generator runs with **zero external files**.

## 1. Generate the sample assets

```bash
cd BDP.MockupGen
python example/generate_example_assets.py
```

This writes:

- `example/bottle.png` — synthetic dark-glass bottle
- `example/logo.png` — transparent emblem + "BDP" wordmark
- `example/texts.json` — a single "RESERVE" text overlay
- `templates/SAMPLE-001.json` — template for the bottle's label region

## 2. Generate one mockup per method

```bash
# Sticker
python mockup.py \
  --bottle example/bottle.png --logo example/logo.png \
  --template templates/SAMPLE-001.json \
  --method sticker --text example/texts.json \
  --output example/expected_sticker.png

# Silk screen
python mockup.py \
  --bottle example/bottle.png --logo example/logo.png \
  --template templates/SAMPLE-001.json \
  --method silk_screen --text example/texts.json \
  --output example/expected_silkscreen.png

# Hot stamping (gold foil)
python mockup.py \
  --bottle example/bottle.png --logo example/logo.png \
  --template templates/SAMPLE-001.json \
  --method hot_stamping --foil gold --text example/texts.json \
  --output example/expected_hotstamp_gold.png
```

Expected outputs:

| File | What you should see |
|------|---------------------|
| `expected_sticker.png` | Flat printed label with a faint die-cut edge and soft contact shadow |
| `expected_silkscreen.png` | Ink fused to the glass, slightly translucent, no edge/shadow |
| `expected_hotstamp_gold.png` | Reflective gold foil with a directional specular highlight and crisp edges |

## 3. Bonus — foil swatch strip

```bash
python mockup.py foil-swatches --output example/foil_swatches.png
```

## Debug layers

Add `--debug` to any command to dump intermediate layers next to the output
(in `<output>_debug/`): warped logo, rendered method layer, and each text layer.
