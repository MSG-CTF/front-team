import { Link, useNavigate } from "react-router-dom";
import { performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import styles from "./BoardScreen.module.css";

// Figma node 192:163 "설명서"(두루마리) / 97:439 "마이페이지로고" / 10:10 "스코어로".
// 보드 화면 우상단의 3개 이동 버튼. 그림에 아이콘이 이미 그려져 있어 클릭 영역만 얹는다.
const BUTTONS = [
  {
    key: "rules",
    to: ROUTES.rules,
    label: "규칙 설명서",
    mobileLabel: "규칙",
    src: "/assets/board/nav-rules.png",
    mobileImageWidth: "192.31%",
    mobileImageAnchor: "translate(-49.5%, -46%)",
    className: "left-[75.42%] top-[2.96%] w-[10.47%] h-[12.41%]",
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
    className: "left-[80.68%] top-[1.2%] w-[13.39%] h-[15.83%]",
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
    className: "left-[87.76%] top-[1.2%] w-[12.24%] h-[14.54%]",
    hitArea: "left-1/2 top-[48%] w-[42%]",
  },
];

export default function BoardNav() {
  const navigate = useNavigate();

  return (
    <>
      <nav className={styles.mobileNav} aria-label="대회 메뉴">
        {BUTTONS.map((button) => (
          <Link key={button.key} to={button.to} className={styles.mobileNavPrimary}>
            <span className={styles.mobileNavIcon} aria-hidden="true">
              <img
                src={button.src}
                alt=""
                draggable={false}
                style={{ width: button.mobileImageWidth, transform: button.mobileImageAnchor }}
              />
            </span>
            <span>{button.mobileLabel}</span>
          </Link>
        ))}
        <Link to={ROUTES.koth}>KoTH</Link>
        <Link to={ROUTES.signatures}>동아리 부스</Link>
        <button type="button" onClick={performLogout}>로그아웃</button>
      </nav>
      <div className={styles.desktopOnly}>
      {BUTTONS.map((button) => (
        <div
          key={button.key}
          className={`group absolute pointer-events-none ${button.className}`}
        >
          <img
            src={button.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-150 group-hover:brightness-110 group-active:brightness-95"
          />
          <button
            type="button"
            onClick={() => navigate(button.to)}
            aria-label={button.label}
            className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 cursor-pointer pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1e4c8] ${button.hitArea}`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => navigate(ROUTES.signatures)}
        className="absolute bottom-[2%] right-[3.65%] border-0 bg-[#2b1609]/80 px-[1.1cqw] py-[0.55cqw] font-inria-serif text-[1cqw] text-[#f1e4c8] hover:bg-[#2b1609] focus-visible:outline focus-visible:outline-[#f1e4c8]"
      >
        동아리 부스 둘러보기 →
      </button>
      {/* 로그아웃 - 이 3개 아이콘과 달리 Figma에 그려진 그림이 없어서(시안 없음)
          반투명 텍스트 버튼으로 얹었다. 우상단 이동 아이콘 바로 아래, KoTH 배너(top 26.48%) 위 여백.
          오른쪽 끝(right 3.65%)은 스코어보드 아이콘·KoTH 배너·동아리 부스 버튼과 한 선. */}
      <button
        type="button"
        onClick={performLogout}
        className="absolute right-[3.65%] top-[17.5%] rounded-[0.4cqw] border border-[#c9a86a]/60 bg-[#2b1609]/70 px-[0.9cqw] py-[0.45cqw] font-inria-serif text-[0.8cqw] text-[#f1e4c8] transition-colors hover:bg-[#2b1609]/90"
      >
        로그아웃
      </button>
      </div>
    </>
  );
}
