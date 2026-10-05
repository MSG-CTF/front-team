import { Link, useNavigate } from "react-router-dom";
import { performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import styles from "./BoardScreen.module.css";

// Figma node 192:163 "설명서"(두루마리) / 97:439 "마이페이지로고" / 10:10 "스코어로".
// 보드 화면 우상단의 원형 이동 버튼. 그림에 아이콘이 이미 그려져 있어 클릭 영역만 얹는다.
// 로그아웃(nav-logout.png)은 시안이 없어 스코어보드 동전 틀에 금색 로그아웃 문양을 넣어 만들었다.
// 로그아웃을 맨 오른쪽(기존 스코어보드 자리)에 두고 나머지 3개를 동전 간격(무대 6.6%)만큼
// 왼쪽으로 옮겼다. 그래서 오른쪽 정렬선(무대 96.35%)은 KoTH 배너·동아리 부스 버튼과 그대로 맞는다.
const NAV_SHIFT = 6.6;
const BUTTONS = [
  {
    key: "rules",
    to: ROUTES.rules,
    label: "규칙 설명서",
    mobileLabel: "규칙",
    src: "/assets/board/nav-rules.png",
    mobileImageWidth: "192.31%",
    mobileImageAnchor: "translate(-49.5%, -46%)",
    box: { left: 75.42 - NAV_SHIFT, top: 2.96, width: 10.47, height: 12.41 },
    hitArea: "left-[49.5%] top-[46%] w-[52%]",
  },
  {
    key: "mypage",
    to: ROUTES.mypage,
    label: "마이 페이지",
    mobileLabel: "마이페이지",
    src: "/assets/board/nav-mypage.png",
    mobileImageWidth: "256.41%",
    mobileImageAnchor: "translate(-50%, -48%)",
    box: { left: 80.68 - NAV_SHIFT, top: 1.2, width: 13.39, height: 15.83 },
    hitArea: "left-1/2 top-[48%] w-[39%]",
  },
  {
    key: "scoreboard",
    to: ROUTES.leaderboard,
    label: "스코어보드",
    mobileLabel: "순위",
    src: "/assets/board/nav-scoreboard.png",
    mobileImageWidth: "238.1%",
    mobileImageAnchor: "translate(-50%, -48%)",
    box: { left: 87.76 - NAV_SHIFT, top: 1.2, width: 12.24, height: 14.54 },
    hitArea: "left-1/2 top-[48%] w-[42%]",
  },
  {
    key: "logout",
    onClick: performLogout,
    label: "로그아웃",
    mobileLabel: "로그아웃",
    src: "/assets/board/nav-logout.png",
    mobileImageWidth: "238.1%",
    mobileImageAnchor: "translate(-50%, -48%)",
    box: { left: 87.76, top: 1.2, width: 12.24, height: 14.54 },
    hitArea: "left-1/2 top-[48%] w-[42%]",
  },
];

export default function BoardNav() {
  const navigate = useNavigate();

  return (
    <>
      <nav className={styles.mobileNav} aria-label="대회 메뉴">
        {BUTTONS.map((button) => {
          const content = <>
            <span className={styles.mobileNavIcon} aria-hidden="true">
              <img
                src={button.src}
                alt=""
                draggable={false}
                style={{ width: button.mobileImageWidth, transform: button.mobileImageAnchor }}
              />
            </span>
            <span>{button.mobileLabel}</span>
          </>;
          return button.to
            ? <Link key={button.key} to={button.to} className={styles.mobileNavPrimary}>{content}</Link>
            : <button key={button.key} type="button" onClick={button.onClick} className={styles.mobileNavPrimary}>{content}</button>;
        })}
        <Link to={ROUTES.koth}>KoTH</Link>
        <Link to={ROUTES.signatures}>동아리 부스</Link>
      </nav>
      <div className={styles.desktopOnly}>
      {BUTTONS.map((button) => (
        <div
          key={button.key}
          className="group absolute pointer-events-none"
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
            onClick={button.onClick ?? (() => navigate(button.to))}
            aria-label={button.label}
            title={button.label}
            className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 cursor-pointer pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1e4c8] ${button.hitArea}`}
          />
        </div>
      ))}
      {/* 열린 문제 목록 버튼과 같은 금테 명판. 오른쪽 끝은 KoTH 배너·로그아웃 동전과 한 선(right 3.65%) */}
      <button
        type="button"
        onClick={() => navigate(ROUTES.signatures)}
        className={`${styles.plaqueButton} absolute bottom-[2%] right-[3.65%]`}
      >
        <span>동아리 부스 둘러보기</span>
        <span aria-hidden="true">→</span>
      </button>
      </div>
    </>
  );
}
