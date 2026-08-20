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

# How much of the original ruling to keep (0 = gone, 1 = original bold lines).
RULING_KEEP_CORE = 0.22
RULING_KEEP_EDGE = 0.08
MARGIN_KEEP_CORE = 0.28
MARGIN_KEEP_EDGE = 0.1


def _runs(idxs: list[int]) -> list[tuple[int, int]]:
    if not idxs:
        return []
    groups: list[tuple[int, int]] = []
    start = prev = idxs[0]
    for i in idxs[1:]:
        if i == prev + 1:
            prev = i
        else:
            groups.append((start, prev))
            start = prev = i
    groups.append((start, prev))
    return groups


def fade_ruling(clean: Image.Image) -> Image.Image:
    """Thin and wash notebook lines toward paper; keep the pixel-art look."""
    src = clean.convert("RGB")
    out = src.copy()
    w, h = src.size
    pix = src.load()

    row_mean: list[float] = []
    for y in range(h):
        total = 0
        n = 0
        for x in range(0, w, 4):
            r, g, b = pix[x, y]
            total += r + g + b
            n += 3
        row_mean.append(total / n)
    med = sorted(row_mean)[h // 2]
    dark = [y for y, m in enumerate(row_mean) if m < med - 12]
    dark_set = set(dark)

    for y0, y1 in _runs(dark):
        if y1 - y0 < 2 or y0 <= 2:
            continue
        mid = (y0 + y1) // 2
        sample_y = y0 - 8
        while sample_y > 0 and sample_y in dark_set:
            sample_y -= 1
        sample_y = max(0, sample_y)
        paper = src.crop((0, sample_y, w, sample_y + 1))
        for y in range(y0, y1 + 1):
            dist = abs(y - mid)
            keep = RULING_KEEP_CORE if dist <= 1 else RULING_KEEP_EDGE if dist <= 2 else 0.0
            line = src.crop((0, y, w, y + 1))
            out.paste(Image.blend(paper, line, keep), (0, y))

    redness: list[float] = []
    for x in range(w):
        total = 0
        n = 0
        for y in range(0, h, 4):
            r, g, _b = pix[x, y]
            total += r - g
            n += 1
        redness.append(total / n)
    red_cols = [x for x, v in enumerate(redness) if v > 15]

    for x0, x1 in _runs(red_cols):
        mid = (x0 + x1) // 2
        sample_x = min(w - 1, x1 + 10)
        paper = out.crop((sample_x, 0, sample_x + 1, h))
        for x in range(x0, x1 + 1):
            dist = abs(x - mid)
            keep = MARGIN_KEEP_CORE if dist <= 1 else MARGIN_KEEP_EDGE if dist <= 2 else 0.0
            line = out.crop((x, 0, x + 1, h))
            out.paste(Image.blend(paper, line, keep), (x, 0))

    return out


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
    clean = fade_ruling(Image.open(SRC).convert("RGB"))
    weathered = mild_weather(clean, random.Random(1968))
    out = Image.blend(clean, weathered, WEATHER_AMOUNT)
    out.convert("RGBA").save(DST, "PNG")
    print(f"wrote {DST} size={out.size} weather={WEATHER_AMOUNT}")


if __name__ == "__main__":
    main()
