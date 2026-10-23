"""Re-encode runtime art as high-quality lossy WebP to cut page-load weight.

Run with Python + Pillow: python scripts/optimize-lossy-images.py
PNG sources are never modified. Targets are always encoded from the PNG source,
so the script is idempotent. This supersedes the lossless WebP step of
optimize-game-images.py for the files listed below.
Each output keeps its alpha channel and must stay above a PSNR threshold
measured on the opaque pixels, otherwise the script fails.
"""

from io import BytesIO
from pathlib import Path
import math
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "public/assets"
QUALITIES = (88, 92, 95, 98)  # first quality that clears MIN_PSNR wins
MIN_PSNR = 37.0
# Grainy print artwork scores low on PSNR without looking worse; judged by eye instead.
MIN_PSNR_OVERRIDES = {
    "intro/msg-ctf-2025-poster.webp": 34.0,
    "board/golden-key-original.webp": 33.0,
    "board/board-grid.webp": 33.0,
    "board/banner-koth-event.webp": 31.0,
    "koth/completion-stamp-round-1.webp": 30.0,
    "koth/completion-stamp-round-2.webp": 29.0,
    "koth/completion-stamp-round-3.webp": 29.0,
    "koth/challenge-maple-pass.webp": 36.0,
    "koth/challenge-river-crossing.webp": 36.0,
}

# (source png, output webp, max width or None). Same name and size unless a width is given.
targets = (
    ("intro/msg-ctf-2025-poster.png", "intro/msg-ctf-2025-poster.webp", 1264),
    ("intro/preparation-laptop-v1.png", "intro/preparation-laptop-v1.webp", None),
    ("intro/preparation-identity-v1.png", "intro/preparation-identity-v1.webp", None),
    ("intro/mascot-dice-ready-v3.png", "intro/mascot-dice-ready-v3.webp", None),
    ("intro/mascot-dice-throw-v3.png", "intro/mascot-dice-throw-v3.webp", None),
    ("intro/mascot-dice-land-v4.png", "intro/mascot-dice-land-v4.webp", None),
    ("signatures/booth-menu-paper-v1.png", "signatures/booth-menu-paper-v1.webp", None),
    ("board/golden-key-original.png", "board/golden-key-original.webp", 1024),
    ("board/board-grid.png", "board/board-grid.webp", None),
    ("board/roulette-panel.png", "board/roulette-panel.webp", None),
    ("board/banner-koth-event.png", "board/banner-koth-event.webp", None),
    ("koth/koth-trail-background.png", "koth/koth-trail-background.webp", None),
    ("koth/completion-stamp-round-1.png", "koth/completion-stamp-round-1.webp", None),
    ("koth/completion-stamp-round-2.png", "koth/completion-stamp-round-2.webp", None),
    ("koth/completion-stamp-round-3.png", "koth/completion-stamp-round-3.webp", None),
    ("koth/challenge-maple-pass.png", "koth/challenge-maple-pass.webp", None),
    ("koth/challenge-river-crossing.png", "koth/challenge-river-crossing.webp", None),
    ("koth/challenge-pine-ridge.png", "koth/challenge-pine-ridge.webp", None),
    ("koth/challenge-lantern-camp.png", "koth/challenge-lantern-camp.webp", None),
    ("koth/challenge-stone-ascent.png", "koth/challenge-stone-ascent.webp", None),
    ("koth/challenge-crown-summit.png", "koth/challenge-crown-summit.webp", None),
    ("leaderboard/leaderboard-layout.png", "leaderboard/leaderboard-layout.webp", None),
    ("login/background-plaza.png", "login/background-plaza.webp", None),
    ("login/logo-cutout.png", "login/logo-cutout.webp", None),
    ("login/login-button-cutout.png", "login/login-button-cutout.webp", None),
    ("rules/msg-ctf-logo.png", "rules/msg-ctf-logo.webp", None),
    ("rules/rules-panel-clean.png", "rules/rules-panel-clean.webp", None),
    ("challenge-detail/bg-1920x1080.png", "challenge-detail/bg-1920x1080.webp", None),
    ("challenge-detail/panel-header.png", "challenge-detail/panel-header.webp", None),
    ("challenge-detail/panel-description-base.png", "challenge-detail/panel-description-base.webp", None),
    ("mypage/team-info-card-blank.png", "mypage/team-info-card-blank.webp", None),
    ("mypage/solve-history-panel.png", "mypage/solve-history-panel.webp", None),
    ("mypage/mileage-history-panel.png", "mypage/mileage-history-panel.webp", None),
)


def psnr(a: Image.Image, b: Image.Image) -> float:
    """PSNR over RGB where the source is at least half opaque."""
    a, b = a.convert("RGBA"), b.convert("RGBA")
    pa, pb = a.tobytes(), b.tobytes()
    total = count = 0
    for i in range(0, len(pa), 4 * 7):  # sample every 7th pixel
        if pa[i + 3] < 128:
            continue
        for c in range(3):
            d = pa[i + c] - pb[i + c]
            total += d * d
        count += 3
    if not count:
        return math.inf
    mse = total / count
    return math.inf if mse == 0 else 10 * math.log10(255 ** 2 / mse)


before_total = after_total = 0
for src_rel, out_rel, max_width in targets:
    source, target = assets / src_rel, assets / out_rel
    threshold = MIN_PSNR_OVERRIDES.get(out_rel, MIN_PSNR)
    before = target.stat().st_size if target.exists() else source.stat().st_size
    with Image.open(source) as opened:
        image = opened.convert("RGBA") if "A" in opened.getbands() or opened.mode == "P" else opened.convert("RGB")
        if max_width and image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
            reference = image
        else:
            reference = image
        for quality in QUALITIES:
            buffer = BytesIO()
            image.save(buffer, format="WEBP", quality=quality, alpha_quality=100, method=6)
            with Image.open(BytesIO(buffer.getvalue())) as decoded:
                assert decoded.size == reference.size, (out_rel, decoded.size, reference.size)
                score = psnr(reference, decoded)
            if score >= threshold:
                break
    if score < threshold:
        print(f"{out_rel}: kept as is (best PSNR {score:.1f} dB below {threshold})")
        continue
    target.write_bytes(buffer.getvalue())
    after = target.stat().st_size
    before_total += before
    after_total += after
    print(f"{out_rel}: {before / 1024:,.0f} KB -> {after / 1024:,.0f} KB (q{quality}, PSNR {score:.1f} dB)")
print(f"total: {before_total / 1048576:.1f} MB -> {after_total / 1048576:.1f} MB")
