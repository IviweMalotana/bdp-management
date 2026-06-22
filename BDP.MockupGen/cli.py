"""Command-line interface for the Bottle Label Mockup Generator."""

from __future__ import annotations

import csv
import json
import os
from typing import Any, Dict, List, Optional

import click

from compositor import generate_mockup
from method_config import (
    HOT_STAMPING,
    VALID_FOILS,
    VALID_METHODS,
    get_foil_color,
)


def _parse_text_overlays(text: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    """Parse a JSON string or a path to a JSON file into overlay list."""
    if not text:
        return None
    if os.path.exists(text):
        with open(text, "r", encoding="utf-8") as fh:
            return json.load(fh)
    return json.loads(text)


@click.group(invoke_without_command=True)
@click.pass_context
@click.option("--bottle", type=click.Path(exists=True), help="Bottle image path.")
@click.option("--logo", type=click.Path(exists=True), help="Logo image path.")
@click.option("--template", type=click.Path(exists=True), help="Template JSON path.")
@click.option("--method", type=click.Choice(VALID_METHODS), help="Application method.")
@click.option("--foil", type=click.Choice(VALID_FOILS), default=None, help="Foil (hot stamping).")
@click.option("--text", "text", default=None, help="Text overlays JSON string or file path.")
@click.option("--output", type=click.Path(), default="mockup.png", help="Output PNG path.")
@click.option("--debug", is_flag=True, default=False, help="Dump debug layers.")
def cli(
    ctx: click.Context,
    bottle: Optional[str],
    logo: Optional[str],
    template: Optional[str],
    method: Optional[str],
    foil: Optional[str],
    text: Optional[str],
    output: str,
    debug: bool,
) -> None:
    """Generate bottle label mockups. Run with no subcommand for single mode."""
    if ctx.invoked_subcommand is not None:
        return
    if not (bottle and logo and template and method):
        click.echo(ctx.get_help())
        raise click.UsageError("--bottle, --logo, --template and --method are required.")

    overlays = _parse_text_overlays(text)
    out = generate_mockup(
        bottle_image=bottle,
        logo_image=logo,
        template_path=template,
        application_method=method,
        foil_type=foil,
        text_overlays=overlays,
        output_path=output,
        debug_mode=debug,
    )
    click.echo(f"Wrote {out}")


@cli.command()
@click.option("--batch", "batch_csv", type=click.Path(exists=True), required=True,
              help="CSV with columns: bottle_image,logo_image,method,foil_type,text_json,output_name")
@click.option("--template", type=click.Path(exists=True), required=True, help="Template JSON path.")
@click.option("--output-dir", type=click.Path(), default="batch_output", help="Output directory.")
@click.option("--debug", is_flag=True, default=False)
def batch(batch_csv: str, template: str, output_dir: str, debug: bool) -> None:
    """Generate many mockups from a CSV file."""
    from tqdm import tqdm

    os.makedirs(output_dir, exist_ok=True)
    with open(batch_csv, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    errors: List[str] = []
    for row in tqdm(rows, desc="Mockups", unit="img"):
        try:
            overlays = _parse_text_overlays(row.get("text_json") or None)
            foil = (row.get("foil_type") or "").strip() or None
            out_name = row.get("output_name") or "out.png"
            generate_mockup(
                bottle_image=row["bottle_image"],
                logo_image=row["logo_image"],
                template_path=template,
                application_method=row["method"].strip(),
                foil_type=foil,
                text_overlays=overlays,
                output_path=os.path.join(output_dir, out_name),
                debug_mode=debug,
            )
        except Exception as exc:  # noqa: BLE001 - report and continue batch
            errors.append(f"{row.get('output_name', '?')}: {exc}")

    if errors:
        click.echo(f"Completed with {len(errors)} error(s):")
        for e in errors:
            click.echo(f"  - {e}")
    else:
        click.echo(f"Done. {len(rows)} mockup(s) written to {output_dir}")


@cli.command("foil-swatches")
@click.option("--output", type=click.Path(), default="foil_swatches.png")
@click.option("--width", type=int, default=160)
@click.option("--height", type=int, default=120)
def foil_swatches(output: str, width: int, height: int) -> None:
    """Bonus: generate a preview swatch strip of all foil colours."""
    import numpy as np
    import cv2
    from renderers.hotstamp_renderer import _holographic_map  # noqa

    swatches = []
    for foil in VALID_FOILS:
        color = get_foil_color(foil)
        if isinstance(color, dict):
            patch = _holographic_map((height, width), color["stops"])
        else:
            patch = np.ones((height, width, 3), np.float32) * np.array(color, np.float32)
        patch = np.clip(patch, 0, 255).astype(np.uint8)
        cv2.putText(patch, foil, (6, height - 10), cv2.FONT_HERSHEY_SIMPLEX,
                    0.4, (0, 0, 0), 1, cv2.LINE_AA)
        swatches.append(patch)
    strip = np.hstack(swatches)
    cv2.imwrite(output, cv2.cvtColor(strip, cv2.COLOR_RGB2BGR))
    click.echo(f"Wrote {output} ({len(VALID_FOILS)} foils)")


def main() -> None:
    """Entry point used by ``mockup.py`` and ``console_scripts``."""
    cli()  # pylint: disable=no-value-for-parameter


if __name__ == "__main__":
    main()
