"""Remove light studio backgrounds from desk cutouts via edge flood-fill."""
from collections import deque
from pathlib import Path

from PIL import Image

DESK = Path(__file__).resolve().parents[1] / "public" / "images" / "desk"


def is_bg(r: int, g: int, b: int, a: int, bright: int = 225, chroma: int = 28) -> bool:
    if a == 0:
        return True
    if min(r, g, b) >= bright and max(r, g, b) - min(r, g, b) <= chroma:
        return True
    # leftover semi-transparent studio fog
    if a < 140 and min(r, g, b) >= 210:
        return True
    return False


def flood_clear(im: Image.Image, bright: int = 225) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a, bright=bright):
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
            if is_bg(r, g, b, a, bright=bright):
                seen[ny][nx] = True
                q.append((nx, ny))
            else:
                seen[ny][nx] = True

    # harden remaining near-white fringe on opaque subject edge
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if min(r, g, b) >= 235 and max(r, g, b) - min(r, g, b) <= 20:
                px[x, y] = (0, 0, 0, 0)
            elif a < 90 and min(r, g, b) > 200:
                px[x, y] = (0, 0, 0, 0)

    return im


def tight_crop(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def process(name: str, bright: int = 225) -> None:
    path = DESK / name
    im = flood_clear(Image.open(path), bright=bright)
    im = tight_crop(im)
    im.save(path)
    print(f"{name}: {im.size}")


def main() -> None:
    for name in [
        "radio-dial.png",
        "meter-needle.png",
        "lamp.png",
        "plant.png",
        "mic-lollipop.png",
    ]:
        process(name, bright=222)

    # papers: cream paper is subject — only clear pure white edge fog
    process("papers.png", bright=248)

    needle = Image.open(DESK / "meter-needle.png")
    needle.save(DESK / "meter-needle-l.png")
    needle.save(DESK / "meter-needle-r.png")
    print("needles synced")


if __name__ == "__main__":
    main()
