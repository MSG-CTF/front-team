"""Create smaller display copies without changing the artwork's aspect ratio.

Originals remain the high-density/zoom fallback. Festival copies retain 4:4:4
color; stamp copies use lossless WebP so translucent edges stay unchanged.
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parents[1]
assets = root / "public/assets"
targets = [("signatures/club-festival-v1.webp", (768, 1024))]
targets += [(f"koth/completion-stamp-round-{i}.webp", (384,)) for i in (1, 2, 3)]
for name, widths in targets:
    source = assets / name
    with Image.open(source) as original:
        for width in widths:
            resized = original.resize((width, round(original.height * width / original.width)), Image.Resampling.LANCZOS)
            is_stamp = name.startswith("koth/")
            target = source.with_name(f"{source.stem}-{width}.{'webp' if is_stamp else 'avif'}")
            settings = {"lossless": True, "method": 6, "exact": True} if is_stamp else {"quality": 85, "speed": 5, "subsampling": "4:4:4"}
            resized.save(target, **settings, icc_profile=original.info.get("icc_profile", b""))
            with Image.open(target) as decoded:
                assert decoded.size == resized.size
                if "A" in resized.getbands():
                    assert decoded.getchannel("A").tobytes() == resized.getchannel("A").tobytes()
                diff = ImageStat.Stat(ImageChops.difference(resized.convert("RGB"), decoded.convert("RGB")))
                mse = sum(diff.sum2) / (resized.width * resized.height * 3)
                psnr = 10 * math.log10(255 ** 2 / mse) if mse else math.inf
                assert psnr >= 40, (name, width, psnr)
                assert decoded.info.get("icc_profile", b"") == original.info.get("icc_profile", b"")
            assert target.stat().st_size < source.stat().st_size
            print(f"{target.relative_to(assets)}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; PSNR {psnr:.2f} dB", flush=True)

# Rules uses only these source pixels on mobile. Keep all four border strips
# intact; border-image has no fill, so its center is never painted.
with Image.open(assets / "challenge-detail/panel-board.webp") as source:
    original = source.convert("RGBA")
    frame = original.copy()
    # Keep a small sampling margin beyond the CSS slice/crop boundaries too
    frame.paste((0, 0, 0, 0), (36, 36, frame.width - 36, frame.height - 36))
    patch = original.crop((192, 192, 528, 528))
    for name, image in (("paper-frame.webp", frame), ("paper-texture.webp", patch)):
        target = assets / "rules" / name
        image.save(target, lossless=True, exact=True, method=6, icc_profile=source.info.get("icc_profile", b""))
        with Image.open(target) as decoded:
            assert decoded.convert("RGBA").tobytes() == image.tobytes()
        print(f"rules/{name}: {target.stat().st_size:,} bytes; identical painted pixels", flush=True)
