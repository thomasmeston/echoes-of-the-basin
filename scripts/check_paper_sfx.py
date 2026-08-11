from pathlib import Path

p = Path(__file__).resolve().parents[1] / "public" / "audio" / "paper_unfold.mp3"
data = p.read_bytes()
print("size", len(data))
print("header", data[:32].hex())
print("nonzero bytes", sum(1 for b in data if b != 0), "of", len(data))

try:
    import struct
    # try mutagen
    from mutagen.mp3 import MP3

    audio = MP3(p)
    print("mutagen length", audio.info.length, "bitrate", audio.info.bitrate)
except Exception as e:
    print("mutagen", e)

# Also list audio folder
for f in sorted(p.parent.iterdir()):
    if f.is_file():
        print(f.name, f.stat().st_size)
