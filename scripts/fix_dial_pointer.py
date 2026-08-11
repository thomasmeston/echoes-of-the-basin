"""Rebuild radio-dial.png with a single outward-pointing triangle."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from knock_white_bg import flood_clear, tight_crop

DESK = Path(__file__).resolve().parents[1] / "public" / "images" / "desk"


def main() -> None:
    # Prefer a fresh generated candidate, else previous good dial
    for candidate in (
        DESK / "radio-dial-out-v2.png",
        Path(__file__).resolve().parents[1].parent  # noop placeholder
        / "_unused",
        DESK / "radio-dial.prev.png",
        DESK / "radio-dial-outward-raw.png",
    ):
        if candidate.exists():
            src = candidate
            break
    else:
        src = DESK / "radio-dial.png"

    # Also check Cursor assets folder
    assets = Path(
        r"C:\Users\thoma\.cursor\projects\c-Users-thoma-OneDrive-Documents-GitHub-echoes-of-the-basin\assets"
    )
    for name in ("radio-dial-out-v2.png", "radio-dial-outward-raw.png"):
        p = assets / name
        if p.exists():
            src = p
            break

    print(f"source: {src}")
    im = Image.open(src).convert("RGBA")
    im = flood_clear(im, bright=228)
    im = tight_crop(im)
    w, h = im.size
    cx, cy = w / 2, h / 2
    px = im.load()

    face_r = None
    for y in range(int(cy), 2, -1):
        r, g, b, a = px[int(cx), y]
        if a < 20:
            continue
        if max(r, g, b) < 75 and (r + g + b) / 3 < 55:
            face_r = cy - y
            break
    if not face_r or face_r < 40:
        face_r = min(w, h) * 0.40

    # Sample brass away from the marker
    brass = px[int(cx), int(cy - face_r * 0.25)][:3]

    # Soft brass patch covering any existing indicator(s) at 12 o'clock
    patch = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patch)
    band_top = cy - face_r * 1.02
    band_bot = cy - face_r * 0.70
    pd.ellipse(
        [cx - face_r * 0.14, band_top, cx + face_r * 0.14, band_bot],
        fill=(*brass, 255),
    )
    patch = patch.filter(ImageFilter.GaussianBlur(2.5))
    im = Image.alpha_composite(im, patch)

    # Single outward triangle — tip UP toward rim
    marker = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    md = ImageDraw.Draw(marker)
    tip = (cx, cy - face_r * 0.98)
    left = (cx - face_r * 0.06, cy - face_r * 0.84)
    right = (cx + face_r * 0.06, cy - face_r * 0.84)
    md.polygon([tip, left, right], fill=(236, 220, 176, 255))
    md.line([tip, left, right, tip], fill=(55, 48, 36, 200), width=max(2, int(w * 0.003)))
    im = Image.alpha_composite(im, marker)

    out = DESK / "radio-dial.png"
    im.save(out)
    print(f"wrote {out} size={im.size} face_r={face_r:.1f}")


if __name__ == "__main__":
    main()
