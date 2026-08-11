"""Download a free Mixkit paper SFX into public/audio/."""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio" / "paper_unfold.mp3"
CREDIT = ROOT / "public" / "audio" / "CREDITS-audio.txt"


def main() -> None:
    url = "https://mixkit.co/free-sound-effects/paper/"
    html = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "ignore")
    # Mixkit embeds JSON-ish asset data; also look for preview URLs
    previews = re.findall(
        r"https://assets\.mixkit\.co/active_storage/sfx/(\d+)/\1-preview\.mp3", html
    )
    # Prefer names that sound like page/paper movement
    slug_hits = re.findall(
        r'data- rum|"slug"\s*:\s*"([^"]+)"|free-sound-effects/([a-z0-9-]+)/', html
    )
    print("preview ids", sorted(set(previews))[:30])

    # Try dedicated paper-slide / page-turn pages
    candidates = [
        "https://mixkit.co/free-sound-effects/download/1530/",  # paper slide often ~1530 from CDN path guess
        "https://assets.mixkit.co/active_storage/sfx/1530/1530-preview.mp3",
        "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
        "https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3",
        "https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3",
    ]

    # Parse next-data if present
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    chosen = None
    if m:
        data = json.loads(m.group(1))
        blob = json.dumps(data)
        Path(ROOT / "scripts" / "_mixkit_paper.json").write_text(blob[:200000], encoding="utf-8")
        # find objects with paper in name and preview url
        for match in re.finditer(
            r'"name"\s*:\s*"([^"]*(?:[Pp]aper|[Pp]age)[^"]*)"[^{}]{0,400}?"preview[^"]*"\s*:\s*"(https:[^"]+preview\.mp3)"',
            blob,
        ):
            print("hit", match.group(1), match.group(2))
            if chosen is None and "crumple" not in match.group(1).lower():
                chosen = (match.group(1), match.group(2))
        if chosen is None:
            for match in re.finditer(
                r'"previewUrl"\s*:\s*"(https:[^"]+preview\.mp3)"', blob
            ):
                print("previewUrl", match.group(1))

    if chosen:
        name, src = chosen
        urllib.request.urlretrieve(src, OUT)
        print("saved", OUT, "from", name, "size", OUT.stat().st_size)
    else:
        # fallback: paper slide preview 1530 (short movement)
        src = candidates[1]
        urllib.request.urlretrieve(src, OUT)
        name = "Mixkit paper slide (preview id 1530)"
        print("fallback saved", OUT, "size", OUT.stat().st_size)

    note = (
        "Audio credits (free / royalty-free):\n"
        f"- paper_unfold.mp3 — {name} via Mixkit (https://mixkit.co/free-sound-effects/paper/), "
        "Mixkit License (free for commercial use).\n"
    )
    CREDIT.write_text(note, encoding="utf-8")
    print(CREDIT)


if __name__ == "__main__":
    main()
