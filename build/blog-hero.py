#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = ["pillow==11.3.0"]
# ///
"""Regenerate the blog hero title card's width table and, given a PNG, its background.

    ./build/blog-hero.py [background.png]

Always rewrites `_data/blog-hero/open-sans-400.json`: the advance widths, in em, of the
site's Open Sans 400, which the card's template adds up to set its lines. Rerun it when the
font files change.

Given the card's 16:9 background as a PNG, also rewrites `default-bg.webp` (1888x1062, twice
the widest card) and `default-og.webp` (the link preview: the same image centre-cropped to
1200x630) in `static/assets/media/blog-hero/`.

The site build never runs this. Without uv, install Pillow and run it with `python3`.
"""

import json
import pathlib
import sys

from PIL import Image, ImageFont

SITE = pathlib.Path(__file__).resolve().parent.parent
FONT = SITE / "static/fonts/open-sans/opensans-latin-normal-400-v20.woff2"
WIDTHS = SITE / "_data/blog-hero/open-sans-400.json"
ART = SITE / "static/assets/media/blog-hero"

# Printable ASCII and the punctuation and accents titles use. The template counts any other
# character as 0.6em.
GLYPHS = [chr(c) for c in range(32, 127)] + list("’‘“”–—…×éèüöäñç")


def write_widths():
    font = ImageFont.truetype(str(FONT), 1000, layout_engine=ImageFont.Layout.BASIC)
    table = {c: int(font.getlength(c) + 0.5) / 1000 for c in sorted(GLYPHS)}
    WIDTHS.write_text(json.dumps(table, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def write_background(png):
    im = Image.open(png).convert("RGB")
    im.resize((1888, 1062), Image.LANCZOS).save(ART / "default-bg.webp", "WEBP", quality=85, method=6)
    keep = round(im.width * 630 / 1200)
    top = (im.height - keep) // 2
    og = im.crop((0, top, im.width, top + keep)).resize((1200, 630), Image.LANCZOS)
    og.save(ART / "default-og.webp", "WEBP", quality=90, method=6)


if __name__ == "__main__":
    if len(sys.argv) > 2:
        sys.exit(__doc__)
    write_widths()
    if len(sys.argv) == 2:
        write_background(sys.argv[1])
