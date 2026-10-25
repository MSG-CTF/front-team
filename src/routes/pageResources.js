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
  // 로그인은 원래 영문 글꼴과 안내용 한글 글꼴을 로컬에서 읽는다
  if (isIntroPath(pathname) || pathname === "/login" || pathname === "/login/") return;
  GAME_FONT_STYLESHEETS.forEach((href, index) => {
    addHeadLink(document, `msg-game-fonts-${index}`, { rel: "stylesheet", href });
  });
}

// 로그인 확인 후 대회 시간과 페이지 코드를 기다리는 동안 현재 화면의 그림을 받는다
// 보드에서 이동할 화면을 가리키거나 누를 때에도 같은 요청을 재사용한다
export function preloadGameArtwork(document, pathname) {
  const path = pathname.replace(/\/$/, "");
  let href;
  const attributes = { rel: "preload", as: "image", fetchpriority: "high" };
  if (path === "/rules") href = "/assets/login/background-plaza.webp";
  else if (path === "/koth") href = "/assets/koth/koth-trail-background.webp";
  else if (path === "/signatures" || path.startsWith("/signatures/clubs/")) {
    const small = document.defaultView?.matchMedia("(max-width: 600px) and (max-resolution: 1dppx), (max-width: 460px) and (max-resolution: 2dppx)").matches;
    if (small) {
      href = "/assets/signatures/club-festival-v1-1024.avif";
      attributes.type = "image/avif";
      attributes.imagesrcset = "/assets/signatures/club-festival-v1-768.avif 768w, /assets/signatures/club-festival-v1-1024.avif 1024w";
      attributes.imagesizes = "max(100vw, min(150dvh, 111vw))";
    } else href = "/assets/signatures/club-festival-v1.webp";
  }
  if (href) addHeadLink(document, `msg-game-art-${href.split("/").at(-1)}`, { ...attributes, href });
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
