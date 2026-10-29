"""Build the intro's common glyphs with unchanged outlines and metrics.

Run: python -m pip install 'fonttools[woff]' && python scripts/subset-intro-fonts.py
Full WOFF2 faces stay available for any future/uncommon text: each family lists the
full face first with the font's own cmap range, then the subset, so the subset wins
inside its range and missing glyphs (emoji) never fetch the full file.
The booth menu shows server text, so it gets the KS X 1001 Hangul set instead.
This is an optional asset-generation step, not a build/runtime dependency.
"""

import hashlib
from pathlib import Path
from fontTools import subset
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
intro = root / "src/features/intro"
booth = root / "src/features/signatures"
font_root = root / "public/assets/intro/fonts"


def source_text(folder):
    return "".join(
        path.read_text(encoding="utf-8")
        for path in sorted(folder.rglob("*"))
        if path.suffix in {".js", ".jsx"} and ".test." not in path.name
    )


def base_characters(text):
    characters = set(map(ord, text))
    characters.update(range(0x20, 0x7F))
    characters.update(range(0x2000, 0x2070))
    characters.add(0xA0)
    return characters


# Date/number formatting can introduce characters not written in JSX literals.
intro_characters = base_characters(source_text(intro) + "일월화수목금토요일오전후년시분초")


def ks_x_1001(point):
    # Python's euc_kr also spells other syllables as 8-byte make-up sequences; keep the 2-byte ones.
    try:
        return len(chr(point).encode("euc_kr")) == 2
    except UnicodeEncodeError:
        return False


# Booth titles and descriptions come from the server, so keep every common Hangul syllable.
booth_characters = base_characters(source_text(booth))
booth_characters.update(point for point in range(0xAC00, 0xD7A4) if ks_x_1001(point))
booth_characters.update(range(0x3131, 0x318F))
booth_characters.update(range(0x3000, 0x3040))


def unicode_range(codepoints):
    ranges = []
    first = last = None
    for point in sorted(codepoints):
        if first is not None and point == last + 1:
            last = point
            continue
        if first is not None:
            ranges.append(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}")
        first = last = point
    if first is not None:
        ranges.append(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}")
    return ", ".join(ranges)


def font_face(family, url, span, weight):
    descriptors = f"\n  font-weight: {weight};" if weight is not None else ""
    return (
        f'@font-face {{\n  font-family: "{family}";\n'
        f'  src: url("{url}") format("woff2");{descriptors}\n'
        f'  font-style: normal;\n  font-display: swap;\n'
        f'  unicode-range: {span};\n}}'
    )


def build(relative, characters, target):
    """Subset one font and verify the encoded result, including composite glyphs and advance widths."""
    source = font_root / relative
    original = TTFont(source, recalcTimestamp=False)
    font = TTFont(source, recalcTimestamp=False)
    cmap = original.getBestCmap()
    codepoints = characters.intersection(cmap)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.glyph_names = True
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    target.parent.mkdir(exist_ok=True)
    font.save(target)
    decoded = TTFont(target)
    before, after = original.getGlyphSet(), decoded.getGlyphSet()
    for point in codepoints:
        name = cmap[point]
        assert decoded.getBestCmap()[point] == name
        original_pen, subset_pen = RecordingPen(), RecordingPen()
        before[name].draw(original_pen)
        after[name].draw(subset_pen)
        assert original_pen.value == subset_pen.value, (source.name, point)
        assert original["hmtx"][name] == decoded["hmtx"][name]
    version = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
    print(f"{target.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes; {len(codepoints)} verified characters")
    full = f"/assets/intro/fonts/{relative}"
    subset_url = f"/assets/intro/fonts/{target.relative_to(font_root).as_posix()}?v={version}"
    return (full, unicode_range(cmap)), (subset_url, unicode_range(codepoints))


def write(css_path, header, fonts, characters, prefix):
    css = [header]
    for relative, family, weight in fonts:
        stem = Path(relative).stem
        (full, full_span), (part, part_span) = build(relative, characters, font_root / "subsets" / f"{prefix}{stem}.woff2")
        css.append(font_face(family, full, full_span, weight))
        css.append(font_face(family, part, part_span, weight))
    css_path.write_text("\n".join(css) + "\n", encoding="utf-8")


write(
    intro / "intro-fonts.generated.css",
    "/* Generated by scripts/subset-intro-fonts.py. Full faces come first so the subsets win inside their ranges. */",
    (
        ("gamtan-road-batang/GamtanRoadBatang-Thin.woff2", "MSG Intro Body", 100),
        ("gamtan-road-batang/GamtanRoadBatang-Regular.woff2", "MSG Intro Body", 400),
        ("gamtan-road-batang/GamtanRoadBatang-Bold.woff2", "MSG Intro Body", 700),
        ("chungju-kimsaeng/ChungjuKimSaeng.woff2", "MSG Intro Title", 400),
    ),
    intro_characters,
    "",
)
write(
    booth / "components/booth-fonts.generated.css",
    "/* Generated by scripts/subset-intro-fonts.py. KS X 1001 Hangul subsets with the full faces behind them. */",
    (
        ("gamtan-road-batang/GamtanRoadBatang-Regular.woff2", "Booth Menu Body", None),
        ("chungju-kimsaeng/ChungjuKimSaeng.woff2", "Booth Menu Title", None),
    ),
    booth_characters,
    "booth-",
)
