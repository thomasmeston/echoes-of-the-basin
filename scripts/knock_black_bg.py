"""Remove near-black studio backgrounds from desk cutouts via edge flood-fill."""
from collections import deque
from pathlib import Path

from PIL import Image

DESK = Path(__file__).resolve().parents[1] / "public" / "images" / "desk"


def is_bg(r: int, g: int, b: int, a: int, dark: int = 28) -> bool:
    if a == 0:
        return True
    if max(r, g, b) <= dark:
        return True
    if a < 140 and max(r, g, b) <= 45:
        return True
    return False


def flood_clear_black(im: Image.Image, dark: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a, dark=dark):
            q.append((x, y))
            seen[y][x] = True

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx]:
                continue
            r, g, b, a = px[nx, ny]
            if is_bg(r, g, b, a, dark=dark):
                seen[ny][nx] = True
                q.append((nx, ny))
            else:
                seen[ny][nx] = True
    return im


def tight_crop(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def main() -> None:
    for name, dark in (("map-folded-raw.png", 35), ("map-folded.png", 35)):
        path = DESK / name
        if not path.exists():
            continue
        im = flood_clear_black(Image.open(path), dark=dark)
        im = tight_crop(im)
        out = DESK / "map-folded.png"
        im.save(out)
        print(f"{name} -> map-folded.png {im.size}")
        break


if __name__ == "__main__":
    main()
