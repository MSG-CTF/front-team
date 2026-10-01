// 게임 글꼴은 홍보 페이지의 첫 표시를 기다리게 하지 않는다
export const GAME_FONT_STYLESHEETS = [
  "https://fonts.googleapis.com/css2?family=Abyssinica+SIL&family=IM+Fell+English&family=Inria+Serif&family=Kode+Mono&family=Song+Myung&display=swap",
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css",
];

export function isIntroPath(pathname) {
  return pathname === "/" || pathname === "/guide" || pathname === "/guide/";
}

function addHeadLink(document, id, attributes) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  for (const [name, value] of Object.entries(attributes)) {
    link.setAttribute(name, value);
  }
  document.head.appendChild(link);
}

export function ensureGameFonts(document, pathname) {
  if (isIntroPath(pathname)) return;
  GAME_FONT_STYLESHEETS.forEach((href, index) => {
    addHeadLink(document, `msg-game-fonts-${index}`, { rel: "stylesheet", href });
  });
}

// 첫 화면의 그림은 먼저 받고 글꼴은 CSS가 필요한 것을 고른 뒤 받는다
export function preloadIntroResources(document, pathname) {
  if (pathname !== "/") return;
  addHeadLink(document, "msg-intro-cover-desktop", {
    rel: "preload", as: "image", href: "/assets/intro/hero-plaza.webp",
    media: "(min-width: 681px)", fetchpriority: "high",
  });
  addHeadLink(document, "msg-intro-cover-mobile", {
    rel: "preload", as: "image", href: "/assets/intro/hero-plaza-mobile.webp",
    imagesrcset: "/assets/intro/hero-plaza-mobile.webp 1x, /assets/intro/hero-plaza.webp 2x",
    media: "(max-width: 680px)", fetchpriority: "high",
  });
  addHeadLink(document, "msg-intro-event-logo", {
    rel: "preload", as: "image", href: "/assets/intro/event-logo.webp",
    fetchpriority: "high",
  });
}
