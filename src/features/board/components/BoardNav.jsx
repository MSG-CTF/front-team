import { Link, useNavigate } from "react-router-dom";
import { useId, useRef } from "react";
import { performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { preloadGameArtwork } from "../../../routes/pageResources.js";
import styles from "./BoardScreen.module.css";

// Figma node 192:163 "설명서"(두루마리) / 97:439 "마이페이지로고" / 10:10 "스코어로".
// 보드 화면 우상단의 원형 이동 버튼. 그림에 아이콘이 이미 그려져 있어 클릭 영역만 얹는다.
// 로그아웃(nav-logout.webp)은 시안이 없어 스코어보드 동전 틀에 금색 로그아웃 문양을 넣어 만들었다.
// 로그아웃을 맨 오른쪽(기존 스코어보드 자리)에 두고 나머지 3개를 동전 간격(무대 5.47%)만큼
// 왼쪽으로 옮겼다. 줄 전체는 NAV_ALIGN 만큼 오른쪽으로 옮겨 로그아웃 동전의 보이는 오른쪽 끝을
// KoTH 배너·동아리 부스 버튼과 같은 오른쪽 여백선(무대 97.5%)에 맞춘다.
// 위 끝은 동전마다 그림 여백이 달라 top 을 따로 줄여 주사위판과 같은 위 여백선(무대 4.444%)에 맞춘다.
const NAV_SHIFT = 5.47;
const NAV_ALIGN = 3.18;
const preparePage = (path) => ({
  onPointerEnter: () => preloadGameArtwork(document, path),
  onFocus: () => preloadGameArtwork(document, path),
  onPointerDown: () => preloadGameArtwork(document, path),
});
const BUTTONS = [
  {
    key: "rules",
    to: ROUTES.rules,
    label: "규칙 설명서",
    mobileLabel: "규칙",
    src: "/assets/board/nav-rules.webp",
    mobileViewBox: "46 8 108 108",
    imageSize: [201, 134],
    // 원본 PNG가 두 원형 버튼보다 장식을 크게 채워 실제 보이는 크기를 따로 줄인다.
    box: { left: 77.83 - NAV_SHIFT + NAV_ALIGN, top: 3.785, width: 7.46, height: 8.81 },
    hitArea: "left-[49.5%] top-[46%] w-[52%]",
  },
  {
    key: "mypage",
    to: ROUTES.mypage,
    label: "마이 페이지",
    mobileLabel: "마이페이지",
    // 흰 테두리를 지운 뒤에도 브라우저가 예전 이미지를 캐시로 보여줘 주소에 버전을 붙였다
    src: "/assets/board/nav-mypage.webp?v=2",
    mobileViewBox: "78 29.5 100 100",
    imageSize: [257, 171],
    box: { left: 82.09 - NAV_SHIFT + NAV_ALIGN, top: 2.262, width: 9.88, height: 11.68 },
    hitArea: "left-1/2 top-[48%] w-[39%]",
  },
  {
    key: "scoreboard",
    to: ROUTES.leaderboard,
    label: "스코어보드",
    mobileLabel: "순위",
    src: "/assets/board/nav-scoreboard.webp",
    mobileViewBox: "67 26 100 100",
    imageSize: [235, 157],
    box: { left: 87.98 - NAV_SHIFT + NAV_ALIGN, top: 2.468, width: 9.04, height: 10.69 },
    hitArea: "left-1/2 top-[48%] w-[42%]",
  },
  {
    key: "logout",
    onClick: performLogout,
    label: "로그아웃",
    mobileLabel: "로그아웃",
    src: "/assets/board/nav-logout.webp",
    mobileViewBox: "67 26 100 100",
    imageSize: [235, 157],
    box: { left: 87.98 + NAV_ALIGN, top: 2.468, width: 9.04, height: 10.69 },
    hitArea: "left-1/2 top-[48%] w-[42%]",
  },
];

// Normalize the visible artwork, including a small transparent margin, instead
// of enlarging each PNG's different empty canvas inside a clipped square.
function MobileNavArtwork({ button, menu = false }) {
  const id = useId();
  return (
    <svg className={styles.mobileNavIcon} viewBox={button.mobileViewBox} aria-hidden="true" focusable="false" data-mobile-nav-icon={menu ? "menu" : button.key}>
      <image href={button.src} width={button.imageSize[0]} height={button.imageSize[1]} />
      {menu && <>
        <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="#513615" /><stop offset="1" stopColor="#211609" /></linearGradient></defs>
        <circle cx="117" cy="76" r="30" fill={`url(#${id})`} />
        <path d="M101 65h32M101 76h32M101 87h32" fill="none" stroke="#f1cf7f" strokeWidth="5" strokeLinecap="round" />
      </>}
    </svg>
  );
}

export default function BoardNav() {
  const navigate = useNavigate();
  const mobileMenu = useRef(null);
  const closeMenu = () => { if (mobileMenu.current) mobileMenu.current.open = false; };

  return (
    <>
      <nav className={styles.mobileNav} aria-label="대회 메뉴">
        {BUTTONS.filter(button => button.to).map(button => <Link key={button.key} to={button.to} {...preparePage(button.to)} className={styles.mobileNavPrimary}>
          <MobileNavArtwork button={button} />
          <span>{button.mobileLabel}</span>
        </Link>)}
        <details ref={mobileMenu} className={styles.mobileMenu} onKeyDown={event => { if (event.key === "Escape") { closeMenu(); mobileMenu.current?.querySelector("summary")?.focus(); } }}>
          <summary aria-label="대회 전체 메뉴"><MobileNavArtwork button={BUTTONS[3]} menu /><span>메뉴</span></summary>
          <div className={styles.mobileMenuItems} onClick={closeMenu}>
        {BUTTONS.filter(button => !button.to).map((button) => {
          const content = <>
            <MobileNavArtwork button={button} />
            <span>{button.mobileLabel}</span>
          </>;
          return button.to
            ? <Link key={button.key} to={button.to} className={styles.mobileNavPrimary}>{content}</Link>
            : <button key={button.key} type="button" onClick={button.onClick} className={styles.mobileNavPrimary}>{content}</button>;
        })}
        <Link to={ROUTES.koth} {...preparePage(ROUTES.koth)}>KoTH</Link>
        <Link to={ROUTES.signatures} {...preparePage(ROUTES.signatures)}>동아리 부스</Link>
          </div>
        </details>
      </nav>
      <div className={styles.desktopOnly}>
      {BUTTONS.map((button) => (
        <div
          key={button.key}
          className={`${styles.navCoin} group absolute pointer-events-none`}
          style={{ left: `${button.box.left}%`, top: `${button.box.top}%`, width: `${button.box.width}%`, height: `${button.box.height}%` }}
        >
          <img
            src={button.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-150 group-hover:brightness-110 group-active:brightness-95"
          />
          <button
            type="button"
            {...(button.to ? preparePage(button.to) : {})}
            onClick={button.onClick ?? (() => navigate(button.to))}
            aria-label={button.label}
            title={button.label}
            className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 cursor-pointer pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1e4c8] ${button.hitArea}`}
          />
        </div>
      ))}
      {/* 열린 문제 목록 버튼과 같은 금테 명판. 오른쪽 끝은 KoTH 배너·로그아웃 동전과 같은 오른쪽 여백선,
          아래 끝은 열린 문제 패널과 같은 아래 여백선에 둔다 */}
      <button
        type="button"
        {...preparePage(ROUTES.signatures)}
        onClick={() => navigate(ROUTES.signatures)}
        className={`${styles.plateFrame} ${styles.plaqueButton} ${styles.boothButton} absolute bottom-[4.4444%] right-[2.5%]`}
      >
        <span>동아리 부스 둘러보기</span>
        <span aria-hidden="true">→</span>
      </button>
      </div>
    </>
  );
}
