"""Build the board's display-size lossless sprite without changing source art."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "public/assets/board/selection-squirrel-refined.webp"
target = source.with_name("selection-squirrel-refined-320.webp")
with Image.open(source) as original:
    width = 320
    size = (width, round(original.height * width / original.width))
    display = original.convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    display.save(target, format="WEBP", lossless=True, method=6, exact=True)
    with Image.open(target) as decoded:
        assert decoded.size == size
        assert decoded.convert("RGBA").tobytes() == display.tobytes()
    assert target.stat().st_size < source.stat().st_size / 3
print(json.dumps({"source_bytes": source.stat().st_size, "display_bytes": target.stat().st_size,
    "display_size": size, "source_modified": False, "resized_pixels_lossless": True}))
