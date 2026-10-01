"""Repackage the original intro fonts as WOFF2 without changing their glyphs.

Run with Python + fonttools[woff]. Original TTF files remain the source assets.
"""

from pathlib import Path
from fontTools.ttLib.woff2 import compress

font_root = Path(__file__).resolve().parents[1] / "public/assets/intro/fonts"
for relative in (
    "gamtan-road-batang/GamtanRoadBatang-Thin.ttf",
    "gamtan-road-batang/GamtanRoadBatang-Regular.ttf",
    "gamtan-road-batang/GamtanRoadBatang-Bold.ttf",
    "chungju-kimsaeng/ChungjuKimSaeng.ttf",
):
    source = font_root / relative
    target = source.with_suffix(".woff2")
    compress(source, target)
    print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
