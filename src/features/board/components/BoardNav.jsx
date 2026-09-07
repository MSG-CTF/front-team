import { useNavigate } from "react-router-dom";
import { performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";

// Figma node 192:163 "설명서"(두루마리) / 97:439 "마이페이지로고" / 10:10 "스코어로".
// 보드 화면 우상단의 3개 이동 버튼. 그림에 아이콘이 이미 그려져 있어 클릭 영역만 얹는다.
const BUTTONS = [
  {
    key: "rules",
    to: ROUTES.rules,
    label: "규칙 설명서",
    src: "/assets/board/nav-rules.png",
    className: "left-[75.42%] top-[2.96%] w-[10.47%] h-[12.41%]",
  },
  {
    key: "mypage",
    to: ROUTES.mypage,
    label: "마이 페이지",
    src: "/assets/board/nav-mypage.png",
    className: "left-[80.68%] top-[1.2%] w-[13.39%] h-[15.83%]",
  },
  {
    key: "scoreboard",
    to: ROUTES.leaderboard,
    label: "스코어보드",
    src: "/assets/board/nav-scoreboard.png",
    className: "left-[87.76%] top-[1.2%] w-[12.24%] h-[14.54%]",
  },
];

export default function BoardNav() {
  const navigate = useNavigate();

  return (
    <>
      {BUTTONS.map((button) => (
        <button
          key={button.key}
          type="button"
          onClick={() => navigate(button.to)}
          aria-label={button.label}
          className={`absolute border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95 ${button.className}`}
        >
          <img
            src={button.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
          <span className="sr-only">{button.label}</span>
        </button>
      ))}
      {/* 로그아웃 - 이 3개 아이콘과 달리 Figma에 그려진 그림이 없어서(시안 없음)
          그림 없는 화면 왼쪽 아래 여백에 반투명 텍스트 버튼으로만 얹었다. */}
      <button
        type="button"
        onClick={performLogout}
        className="absolute bottom-[2%] left-[1%] rounded-[0.4cqw] border border-[#c9a86a]/60 bg-[#2b1609]/70 px-[0.9cqw] py-[0.45cqw] font-inria-serif text-[0.8cqw] text-[#f1e4c8] transition-colors hover:bg-[#2b1609]/90"
      >
        로그아웃
      </button>
    </>
  );
}
