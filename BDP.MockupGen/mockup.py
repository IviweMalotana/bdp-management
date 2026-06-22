"""Convenience entry point. Delegates to the click CLI in ``cli.py``.

Usage:
    python mockup.py --bottle b.png --logo l.png --template t.json --method sticker
    python mockup.py batch --batch jobs.csv --template t.json --output-dir out/
    python mockup.py foil-swatches --output swatches.png
"""

from cli import main

if __name__ == "__main__":
    main()
