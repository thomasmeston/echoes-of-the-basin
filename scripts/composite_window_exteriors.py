"""Composite illustrated window crops onto transparent full-size plates.

Does NOT write bg-room.png. Overlay sits on top of the room plate.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESK = ROOT / "public" / "images" / "desk"
OUT = DESK / "window"

# Thomas Dev Mode measure 2026-08-12 (viewport 2149×1081, bgZoom 1.11).
BBOX = {"x": 1128, "y": 197, "w": 187, "h": 252}


def cover_bottom(src: Image.Image, tw: int, th: int) -> Image.Image:
    """Scale to cover, keep the bottom (river) if we crop vertically."""
    src = src.convert("RGB")
    sw, sh = src.size
    scale = max(tw / sw, th / sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = max(0, nh - th)
    return resized.crop((left, top, left + tw, top + th))


def composite(raw_name: str, dest_name: str) -> None:
    raw = Image.open(OUT / raw_name)
    crop = cover_bottom(raw, BBOX["w"], BBOX["h"]).convert("RGBA")
    plate = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    plate.paste(crop, (BBOX["x"], BBOX["y"]), crop)
    dest = OUT / dest_name
    plate.save(dest, "PNG")
    print(f"wrote {dest} bbox={BBOX}")


def main() -> None:
    bg = Image.open(DESK / "bg-room.png")
    if bg.size != (1536, 1024):
        raise SystemExit(f"unexpected bg-room size {bg.size}; update BBOX")
    composite("exterior-day-raw.png", "exterior-day.png")
    composite("exterior-night-raw.png", "exterior-night.png")


if __name__ == "__main__":
    main()
