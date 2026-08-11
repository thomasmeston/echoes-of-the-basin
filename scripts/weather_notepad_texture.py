"""Age notebook_texture.png lightly for the field-notes slide-out.

Blends a mild weather pass over the clean pad (~35%) so the result
sits between pristine cream and the heavy aged look.
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "notebook_texture.clean.png"
DST = ROOT / "public" / "images" / "notebook_texture.png"

# 0 = clean pad, 1 = full mild-weather pass
WEATHER_AMOUNT = 0.22


def mild_weather(clean: Image.Image, rng: random.Random) -> Image.Image:
    w, h = clean.size
    img = clean.convert("RGBA")

    r, g, b, a = img.split()
    r = r.point(lambda v: min(255, int(v * 1.01 + 4)))
    g = g.point(lambda v: min(255, int(v * 0.995 + 1)))
    b = b.point(lambda v: max(0, int(v * 0.94)))
    img = Image.merge("RGBA", (r, g, b, a))
    img = ImageEnhance.Color(img).enhance(0.94)
    base = img.convert("RGB")

    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    max_pad = min(w, h) // 2 - 2
    for i in range(36):
        pad = min(max_pad, int(i * min(w, h) / 80))
        tone = int(i * 3.6)
        if w - pad <= pad or h - pad <= pad:
            break
        vd.ellipse([pad, pad, w - pad, h - pad], fill=tone)
    vignette = ImageOps.invert(vignette)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=max(12, w // 14)))
    edge_mask = vignette.point(lambda v: min(255, int(max(0, v - 70) * 0.7)))
    warm = Image.new("RGB", (w, h), (190, 160, 110))
    base = Image.composite(Image.blend(base, warm, 0.28), base, edge_mask)

    corners = Image.new("L", (w, h), 0)
    cd = ImageDraw.Draw(corners)
    rad = int(min(w, h) * 0.32)
    for ox, oy in ((0, 0), (w, 0), (0, h), (w, h)):
        cd.ellipse([ox - rad, oy - rad, ox + rad, oy + rad], fill=110)
    corners = corners.filter(ImageFilter.GaussianBlur(radius=max(22, w // 10)))
    corner_tint = Image.blend(base, Image.new("RGB", (w, h), (170, 135, 85)), 0.25)
    base = Image.composite(corner_tint, base, corners)

    spots = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(spots)
    for _ in range(14):
        x = rng.randint(0, w)
        y = rng.randint(0, h)
        spot_r = rng.randint(1, max(2, w // 80))
        alpha = rng.randint(8, 16)
        sd.ellipse(
            [x - spot_r, y - spot_r, x + spot_r, y + spot_r],
            fill=(155, 110, 58, alpha),
        )
    spots = spots.filter(ImageFilter.GaussianBlur(radius=1.6))
    base = Image.alpha_composite(base.convert("RGBA"), spots).convert("RGB")

    # One soft ring only
    stains = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cx = int(w * 0.62)
    cy = int(h * 0.48)
    rx, ry = w // 7, h // 8
    od = ImageDraw.Draw(stains)
    od.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        outline=(145, 100, 55, 24),
        width=max(2, w // 120),
    )
    stains = stains.filter(ImageFilter.GaussianBlur(radius=2.4))
    base = Image.alpha_composite(base.convert("RGBA"), stains).convert("RGB")
    return base


def main() -> None:
    clean = Image.open(SRC).convert("RGB")
    weathered = mild_weather(clean, random.Random(1968))
    out = Image.blend(clean, weathered, WEATHER_AMOUNT)
    out.convert("RGBA").save(DST, "PNG")
    print(f"wrote {DST} size={out.size} weather={WEATHER_AMOUNT}")


if __name__ == "__main__":
    main()
