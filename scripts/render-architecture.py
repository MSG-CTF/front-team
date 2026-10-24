"""README용 시스템 아키텍처 이미지를 그린다.

기술 로고는 simple-icons CDN에서 받아 오므로 인터넷 연결이 필요하다.
사용법: pip install pillow resvg-py && python scripts/render-architecture.py (결과: docs/readme/architecture.png)
"""
import io
import urllib.request
from pathlib import Path

import resvg_py
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "readme" / "architecture.png"
FONTS = Path("C:/Windows/Fonts")
S = 2
bold = lambda n: ImageFont.truetype(str(FONTS / "malgunbd.ttf"), n * S)
reg = lambda n: ImageFont.truetype(str(FONTS / "malgun.ttf"), n * S)
s = lambda v: int(v * S)

LOGOS = {
    "chrome": ("googlechrome", "4285F4", "Browser"),
    "figma": ("figma", "F24E1E", "Figma"),
    "react": ("react", "61DAFB", "React"),
    "vite": ("vite", "646CFF", "Vite"),
    "tailwind": ("tailwindcss", "06B6D4", "Tailwind"),
    "three": ("threedotjs", "000000", "Three.js"),
    "axios": ("axios", "5A29E4", "Axios"),
    "router": ("reactrouter", "CA4245", "Router"),
    "nginx": ("nginx", "009639", "NGINX"),
    "django": ("django", "092E20", "Django"),
    "docker": ("docker", "2496ED", "Docker"),
    "github": ("github", "181717", "GitHub"),
    "actions": ("githubactions", "2088FF", "Actions"),
    "python": ("python", "3776AB", "Python"),
}
_cache = {}


def logo(key, size=56):
    if key not in _cache:
        slug, color, _ = LOGOS[key]
        url = f"https://cdn.simpleicons.org/{slug}/{color}"
        svg = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})).read().decode()
        png = bytes(resvg_py.svg_to_bytes(svg_string=svg, width=size * S, height=size * S))
        _cache[key] = Image.open(io.BytesIO(png)).convert("RGBA")
    return _cache[key]


W, H = 1700, 880
img = Image.new("RGB", (W * S, H * S), "#ffffff")
d = ImageDraw.Draw(img)

d.text((s(50), s(28)), "MSG CTF 시스템 아키텍처", font=bold(30), fill="#2b2118")


def panel(x, y, w, h, title, color, fill, keys):
    d.rounded_rectangle((s(x), s(y), s(x + w), s(y + h)), radius=s(14), fill=fill, outline=color, width=s(3))
    d.text((s(x + 20), s(y + 14)), title, font=bold(20), fill=color)
    n = len(keys)
    step = min(92, (w - 40) // max(n, 1))
    ox = x + (w - step * n) / 2
    for i, key in enumerate(keys):
        cx = ox + step * i + step / 2
        im = logo(key)
        img.paste(im, (s(cx) - im.width // 2, s(y + 52)), im)
        label = LOGOS[key][2]
        tw = d.textlength(label, font=reg(13)) / S
        d.text((s(cx - tw / 2), s(y + 116)), label, font=reg(13), fill="#3a2e22")


def note(x, y, lines, color="#3a2e22"):
    for i, line in enumerate(lines):
        d.text((s(x), s(y + i * 22)), line, font=reg(14), fill=color)


def arrow(a, b, color="#6b5b4a", label="", off=(0, -24)):
    d.line([(s(a[0]), s(a[1])), (s(b[0]), s(b[1]))], fill=color, width=s(3))
    dx = (b[0] > a[0]) - (b[0] < a[0])
    dy = (b[1] > a[1]) - (b[1] < a[1])
    d.polygon([(s(b[0]), s(b[1])), (s(b[0] - dx * 14 - dy * 8), s(b[1] - dy * 14 + dx * 8)),
               (s(b[0] - dx * 14 + dy * 8), s(b[1] - dy * 14 - dx * 8))], fill=color)
    if label:
        mx, my = (a[0] + b[0]) / 2 + off[0], (a[1] + b[1]) / 2 + off[1]
        tw = d.textlength(label, font=reg(14)) / S
        d.text((s(mx - tw / 2), s(my)), label, font=reg(14), fill=color)


panel(40, 320, 210, 190, "사용자", "#2f6fb5", "#e8f1fb", ["chrome"])
note(62, 470, ["참가자 · 운영자"])
panel(330, 100, 500, 170, "디자인", "#F24E1E", "#fdeceb", ["figma"])
panel(330, 320, 500, 190, "프론트엔드", "#009639", "#e3f5e9", ["nginx", "react", "vite", "tailwind", "three", "axios"])
note(350, 476, ["React SPA를 NGINX가 서빙, /api는 백엔드로 전달"])
panel(930, 320, 250, 190, "백엔드 API", "#c05621", "#fdeedd", ["django", "python"])
note(950, 476, ["인증 · 보드 · 문제 · 결제"])
panel(1280, 320, 380, 190, "문제 실행", "#6b46c1", "#f0e9fb", ["docker"])
note(1300, 476, ["스케줄러가 노드에 인스턴스 생성"])
panel(330, 620, 500, 170, "CI / CD", "#2088ff", "#e4f0ff", ["actions", "docker", "github"])
panel(930, 620, 250, 170, "KoTH 문제 서버", "#0f766e", "#e2f4f2", ["docker"])
panel(1280, 620, 380, 170, "문제 저장소", "#2b2118", "#f1ece4", ["github"])

arrow((250, 415), (330, 415), label="HTTPS")
arrow((580, 270), (580, 320), label="시안", off=(26, -8))
arrow((830, 415), (930, 415), label="/api/v1")
arrow((1180, 415), (1280, 415), label="내부 토큰", off=(0, -26))
arrow((580, 620), (580, 510), label="이미지 배포", off=(46, 0))
arrow((1015, 510), (1015, 620))
arrow((1095, 620), (1095, 510))
note(1105, 555, ["15분 점수 수집", "팀 토큰 검증"])
# 문제 저장소 -> 백엔드 (꺾인 선)
col = "#9a8c7a"
pts = [(1280, 740), (1230, 740), (1230, 460), (1186, 460)]
d.line([(s(x), s(y)) for x, y in pts], fill=col, width=s(3), joint="curve")
d.polygon([(s(1180), s(460)), (s(1194), s(452)), (s(1194), s(468))], fill=col)
d.text((s(1242), s(560)), "발행본 가져오기", font=reg(14), fill=col)

img.save(OUT, optimize=True)
print(OUT, img.size)
