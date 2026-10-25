"""Generate display copies without changing pixels, glyphs or font metrics.

Run with Pillow and fonttools[woff]. Original artwork/fonts remain available.
This is an optional asset-generation step, not a build dependency.
"""
from pathlib import Path
import hashlib
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets"

IMAGES = (
    "admin/logo.png",
    "mypage/panel-score.png",
    "mypage/panel-mileage.png",
    "challenge-detail/panel-instance-base.png",
    "challenge-detail/panel-flag.png",
    "challenge-detail/button-submit-blank.png",
    "challenge-detail/button-instance-create-blank.png",
    "challenge-detail/button-instance-extend-blank.png",
    "challenge-detail/button-instance-restart-blank.png",
    "challenge-detail/button-instance-stop-blank.png",
    "board/panel-dice-status-v2.png",
    "board/button-round.png",
    "board/dice.png",
    "board/nav-rules.png",
    "board/nav-mypage.png",
    "board/nav-scoreboard.png",
    "board/nav-logout.png",
    "koth/main-navigation-button.png",
    "rules/main-navigation-button.png",
)

for relative in IMAGES:
    source = ASSETS / relative
    target = source.with_suffix(".webp")
    with Image.open(source) as original:
        original.save(target, format="WEBP", lossless=True, exact=True, method=6,
                      icc_profile=original.info.get("icc_profile", b""))
        with Image.open(target) as decoded:
            assert decoded.size == original.size
            assert decoded.convert("RGBA").tobytes() == original.convert("RGBA").tobytes(), relative
            assert decoded.info.get("icc_profile") == original.info.get("icc_profile"), relative
    assert target.stat().st_size < source.stat().st_size, relative
    print(f"{relative}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; identical RGBA", flush=True)


def verify_font(original, decoded, points):
    before, after = original.getGlyphSet(), decoded.getGlyphSet()
    original_cmap, decoded_cmap = original.getBestCmap(), decoded.getBestCmap()
    for point in points:
        a_name, b_name = original_cmap[point], decoded_cmap[point]
        a, b = DecomposingRecordingPen(before), DecomposingRecordingPen(after)
        before[a_name].draw(a)
        after[b_name].draw(b)
        assert a.value == b.value, hex(point)
        assert original["hmtx"][a_name] == decoded["hmtx"][b_name], hex(point)
    for table, attributes in (("hhea", ("ascent", "descent", "lineGap")),
                              ("OS/2", ("sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent"))):
        assert all(getattr(original[table], key) == getattr(decoded[table], key) for key in attributes)


for relative in (
    "intro/fonts/IMFeENrm28P.ttf",
    "intro/fonts/SongMyung-Regular.ttf",
    "fonts/alegreya/Alegreya-Medium.ttf",
    "leaderboard/fonts/libre-baskerville-400.ttf",
    "leaderboard/fonts/libre-baskerville-600.ttf",
    "leaderboard/fonts/libre-caslon-text-400.ttf",
):
    source = ASSETS / relative
    target = source.with_suffix(".woff2")
    font = TTFont(source, recalcTimestamp=False)
    font.flavor = "woff2"
    font.save(target)
    original, decoded = TTFont(source), TTFont(target)
    assert set(original.getBestCmap()) == set(decoded.getBestCmap())
    verify_font(original, decoded, original.getBestCmap())
    print(f"{relative}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; all glyphs/metrics verified", flush=True)


def unicode_range(points):
    spans = []
    start = end = None
    for point in sorted(points):
        if start is not None and point == end + 1:
            end = point
            continue
        if start is not None:
            spans.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
        start = end = point
    if start is not None:
        spans.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
    return ", ".join(spans)


# A common face handles current interface text. The full face stays first so
# arbitrary server messages and challenge/team names still have every glyph.
characters = set(range(0x20, 0x100)) | set(range(0x2000, 0x2070))
for path in sorted((ROOT / "src").rglob("*")):
    if path.suffix in {".js", ".jsx"} and ".test." not in path.name:
        characters.update(map(ord, path.read_text(encoding="utf-8")))

for source_name, family, weight, output_name in (
    ("intro/fonts/gamtan-road-batang/GamtanRoadBatang-Regular.woff2", "MSG Login Body", "400", "login"),
    ("intro/fonts/SongMyung-Regular.woff2", "Board Choice Korean", "400 500", "board-choice"),
):
    source = ASSETS / source_name
    original = TTFont(source, recalcTimestamp=False)
    points = characters.intersection(original.getBestCmap())
    font = TTFont(source, recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.glyph_names = True
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    target = ASSETS / "fonts/ui" / f"{output_name}-common.woff2"
    target.parent.mkdir(exist_ok=True)
    font.save(target)
    decoded = TTFont(target)
    assert set(decoded.getBestCmap()) == points
    verify_font(original, decoded, points)
    version = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
    css = ["/* Generated by scripts/optimize-ui-assets.py; full face preserves arbitrary text. */"]
    for url, span in ((f"/assets/{source_name}", None),
                      (f"/assets/fonts/ui/{target.name}?v={version}", unicode_range(points))):
        css.append(f'@font-face {{\n  font-family: "{family}";\n  src: url("{url}") format("woff2");\n'
                   f'  font-style: normal;\n  font-weight: {weight};\n  font-display: swap;'
                   + (f"\n  unicode-range: {span};" if span else "") + "\n}")
    (ROOT / f"src/styles/{output_name}-fonts.generated.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    print(f"{output_name}: {len(points)} common glyphs, {target.stat().st_size:,} bytes; full fallback retained", flush=True)
