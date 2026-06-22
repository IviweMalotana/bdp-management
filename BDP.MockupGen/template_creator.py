"""Template creation tool.

A template describes where a label sits on a particular bottle photo (the four
label corners, the centre curve point, and some metadata). Templates are stored
as JSON under ``templates/{sku}.json``.

Two modes:
  * GUI mode (default): opens a cv2 window; click the 4 label corners
    (tl, tr, br, bl order) then 1 centre-curve point, then press 's' to save.
  * Headless / programmatic mode (``--no-gui``): build a template purely from
    CLI arguments. Required because headless environments have no display.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List, Optional, Sequence, Tuple

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

CORNER_ORDER: Tuple[str, ...] = ("tl", "tr", "br", "bl")


def build_template(
    sku: str,
    image_dimensions: Sequence[int],
    label_corners: Dict[str, Sequence[float]],
    center_curve: Sequence[float],
    bottle_type: str = "cylindrical",
    bottle_material: str = "dark_glass",
    lighting_reference_point: Optional[Sequence[float]] = None,
    default_method: str = "silk_screen",
) -> Dict[str, Any]:
    """Assemble a template dict from explicit values.

    Args:
        sku: stock-keeping unit / template identifier.
        image_dimensions: [width, height] of the reference bottle image.
        label_corners: dict with tl/tr/br/bl -> [x, y].
        center_curve: [x, y] centre-of-curve point.
        bottle_type: geometry hint, e.g. "cylindrical".
        bottle_material: e.g. "dark_glass".
        lighting_reference_point: [x, y]; defaults to centre of the label.
        default_method: default application method for this SKU.

    Returns:
        A fully-formed template dict.
    """
    for key in CORNER_ORDER:
        if key not in label_corners:
            raise ValueError(f"label_corners missing required corner {key!r}.")

    if lighting_reference_point is None:
        xs = [label_corners[k][0] for k in CORNER_ORDER]
        ys = [label_corners[k][1] for k in CORNER_ORDER]
        lighting_reference_point = [
            float(sum(xs) / len(xs)),
            float(sum(ys) / len(ys)),
        ]

    return {
        "sku": sku,
        "image_dimensions": [int(image_dimensions[0]), int(image_dimensions[1])],
        "label_corners": {
            k: [float(label_corners[k][0]), float(label_corners[k][1])]
            for k in CORNER_ORDER
        },
        "center_curve": [float(center_curve[0]), float(center_curve[1])],
        "bottle_type": bottle_type,
        "bottle_material": bottle_material,
        "lighting_reference_point": [
            float(lighting_reference_point[0]),
            float(lighting_reference_point[1]),
        ],
        "default_method": default_method,
    }


def save_template(template: Dict[str, Any], templates_dir: str = TEMPLATES_DIR) -> str:
    """Write ``template`` to ``templates/{sku}.json`` and return the path."""
    os.makedirs(templates_dir, exist_ok=True)
    path = os.path.join(templates_dir, f"{template['sku']}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(template, fh, indent=2)
    return path


def load_template(path: str) -> Dict[str, Any]:
    """Load and minimally validate a template JSON file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Template not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        template = json.load(fh)
    required = {"sku", "image_dimensions", "label_corners", "center_curve"}
    missing = required - set(template)
    if missing:
        raise ValueError(f"Template {path} missing keys: {', '.join(sorted(missing))}")
    for key in CORNER_ORDER:
        if key not in template["label_corners"]:
            raise ValueError(f"Template {path} missing corner {key!r}.")
    return template


def create_template_gui(
    bottle_image_path: str,
    sku: str,
    bottle_type: str = "cylindrical",
    bottle_material: str = "dark_glass",
    default_method: str = "silk_screen",
    templates_dir: str = TEMPLATES_DIR,
) -> str:
    """Interactive cv2 tool to click the label region. Returns saved path.

    Click order: tl, tr, br, bl, then the centre-curve point. Press 's' to save,
    'r' to reset, 'q'/Esc to abort.
    """
    import cv2  # imported lazily so headless mode doesn't require a display

    image = cv2.imread(bottle_image_path)
    if image is None:
        raise FileNotFoundError(f"Could not read bottle image: {bottle_image_path}")
    h, w = image.shape[:2]

    points: List[Tuple[int, int]] = []
    labels = ["tl", "tr", "br", "bl", "center_curve"]

    def on_mouse(event: int, x: int, y: int, flags: int, param: Any) -> None:
        if event == cv2.EVENT_LBUTTONDOWN and len(points) < 5:
            points.append((x, y))

    window = f"Template: {sku} (click tl,tr,br,bl,center | s=save r=reset q=quit)"
    cv2.namedWindow(window, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window, on_mouse)

    while True:
        disp = image.copy()
        for i, (px, py) in enumerate(points):
            cv2.circle(disp, (px, py), 6, (0, 0, 255), -1)
            cv2.putText(
                disp, labels[i], (px + 8, py),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2,
            )
        if len(points) >= 4:
            quad = points[:4]
            for i in range(4):
                cv2.line(disp, quad[i], quad[(i + 1) % 4], (0, 255, 255), 2)
        cv2.imshow(window, disp)
        key = cv2.waitKey(20) & 0xFF
        if key in (ord("q"), 27):
            cv2.destroyAllWindows()
            raise KeyboardInterrupt("Template creation aborted by user.")
        if key == ord("r"):
            points.clear()
        if key == ord("s"):
            if len(points) < 5:
                print(f"Need 5 points, have {len(points)}.")
                continue
            break

    cv2.destroyAllWindows()
    corners = {k: list(points[i]) for i, k in enumerate(CORNER_ORDER)}
    template = build_template(
        sku=sku,
        image_dimensions=[w, h],
        label_corners=corners,
        center_curve=list(points[4]),
        bottle_type=bottle_type,
        bottle_material=bottle_material,
        default_method=default_method,
    )
    return save_template(template, templates_dir)


def _parse_point(value: str) -> List[float]:
    parts = value.replace(" ", "").split(",")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError(f"Point must be 'x,y', got {value!r}.")
    return [float(parts[0]), float(parts[1])]


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entry point for template creation."""
    parser = argparse.ArgumentParser(description="Create a bottle label template.")
    parser.add_argument("--bottle", help="Path to the bottle image.")
    parser.add_argument("--sku", required=True, help="Template SKU / id.")
    parser.add_argument("--no-gui", action="store_true", help="Headless mode.")
    parser.add_argument("--dimensions", help="WIDTH,HEIGHT (no-gui mode).")
    parser.add_argument("--tl", type=_parse_point, help="Top-left x,y.")
    parser.add_argument("--tr", type=_parse_point, help="Top-right x,y.")
    parser.add_argument("--br", type=_parse_point, help="Bottom-right x,y.")
    parser.add_argument("--bl", type=_parse_point, help="Bottom-left x,y.")
    parser.add_argument("--center", type=_parse_point, help="Center curve x,y.")
    parser.add_argument("--bottle-type", default="cylindrical")
    parser.add_argument("--bottle-material", default="dark_glass")
    parser.add_argument("--default-method", default="silk_screen")
    parser.add_argument("--templates-dir", default=TEMPLATES_DIR)
    args = parser.parse_args(argv)

    if args.no_gui:
        if not (args.dimensions and args.tl and args.tr and args.br and args.bl and args.center):
            parser.error(
                "--no-gui requires --dimensions, --tl, --tr, --br, --bl, --center."
            )
        dims = [int(x) for x in args.dimensions.split(",")]
        template = build_template(
            sku=args.sku,
            image_dimensions=dims,
            label_corners={"tl": args.tl, "tr": args.tr, "br": args.br, "bl": args.bl},
            center_curve=args.center,
            bottle_type=args.bottle_type,
            bottle_material=args.bottle_material,
            default_method=args.default_method,
        )
        path = save_template(template, args.templates_dir)
    else:
        if not args.bottle:
            parser.error("GUI mode requires --bottle.")
        path = create_template_gui(
            bottle_image_path=args.bottle,
            sku=args.sku,
            bottle_type=args.bottle_type,
            bottle_material=args.bottle_material,
            default_method=args.default_method,
            templates_dir=args.templates_dir,
        )

    print(f"Saved template: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
