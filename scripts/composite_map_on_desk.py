"""Composite the folded Amazon map onto the desk-surface tabletop."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

DESK = Path(__file__).resolve().parents[1] / "public" / "images" / "desk"


def knock_white(im: Image.Image, bright: int = 245) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    # simple edge flood for near-white
    from collections import deque

    def is_bg(r, g, b, a):
        if a == 0:
            return True
        return min(r, g, b) >= bright and max(r, g, b) - min(r, g, b) <= 28

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(*px[x, y]):
                q.append((x, y))
                seen[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y][x] and is_bg(*px[x, y]):
                q.append((x, y))
                seen[y][x] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True
                if is_bg(*px[nx, ny]):
                    q.append((nx, ny))
    return im


def main() -> None:
    desk_path = DESK / "desk-surface.png"
    backup = DESK / "desk-surface.pre-map.png"
    if not backup.exists():
        Image.open(desk_path).save(backup)

    # Prefer AI-composited desk if present
    ai = DESK / "desk-surface-with-map-raw.png"
    assets_ai = Path(
        r"C:\Users\thoma\.cursor\projects\c-Users-thoma-OneDrive-Documents-GitHub-echoes-of-the-basin\assets\desk-surface-with-map-raw.png"
    )
    if assets_ai.exists():
        assets_ai.replace  # noqa: B018 — silence
        import shutil

        shutil.copy2(assets_ai, ai)

    if ai.exists():
        im = Image.open(ai).convert("RGBA")
        im = knock_white(im, bright=248)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im.save(desk_path)
        print(f"used AI composite -> {desk_path} {im.size}")
        return

    desk = Image.open(backup).convert("RGBA")
    mp = knock_white(Image.open(DESK / "map-folded.png"), bright=248)
    bbox = mp.getbbox()
    if bbox:
        mp = mp.crop(bbox)

    dw, dh = desk.size
    # Map covers left-center of tabletop (~top 22% of desk asset is wood surface)
    target_w = int(dw * 0.38)
    ratio = target_w / mp.width
    mp = mp.resize((target_w, max(1, int(mp.height * ratio))), Image.Resampling.LANCZOS)
    mp = mp.rotate(-6, expand=True, resample=Image.Resampling.BICUBIC)

    # Soft contact shadow
    shadow = Image.new("RGBA", mp.size, (0, 0, 0, 0))
    alpha = mp.split()[3]
    shadow_draw = Image.new("L", mp.size, 0)
    shadow_draw.paste(alpha, (4, 6))
    shadow_draw = shadow_draw.filter(ImageFilter.GaussianBlur(8))
    shadow = Image.merge(
        "RGBA",
        (
            Image.new("L", mp.size, 20),
            Image.new("L", mp.size, 14),
            Image.new("L", mp.size, 8),
            ImageOps.invert(ImageOps.invert(shadow_draw).point(lambda v: int(v * 0.45))),
        ),
    )
    # simpler shadow from alpha
    sh = Image.new("RGBA", mp.size, (0, 0, 0, 0))
    sh.putalpha(alpha.point(lambda v: int(v * 0.35)))
    sh = sh.filter(ImageFilter.GaussianBlur(6))

    # Place on tabletop: left-center, near top of desk furniture
    x = int(dw * 0.10)
    y = int(dh * 0.06)
    layer = Image.new("RGBA", desk.size, (0, 0, 0, 0))
    layer.paste(sh, (x + 6, y + 8), sh)
    layer.paste(mp, (x, y), mp)
    out = Image.alpha_composite(desk, layer)
    out.save(desk_path)
    print(f"composited map onto desk -> {desk_path} {out.size} at ({x},{y}) map={mp.size}")


if __name__ == "__main__":
    main()
