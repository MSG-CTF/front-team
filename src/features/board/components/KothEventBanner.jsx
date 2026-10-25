import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { preloadGameArtwork } from "../../../routes/pageResources.js";
import styles from "./BoardScreen.module.css";

// Figma node 5:26 "버튼 없 배너"(339x627) + 5:32 "라운드 버튼"(213x168).
// 우측 세로 배너 + 그 아래 "N ROUND" 버튼. 제목/일러스트/라운드 숫자가 그림에
// 이미 그려져 있어 여기서는 배치와 클릭 영역만 담당한다.
//
// ⚠️ 이벤트 제목, 라운드 숫자는 banner/button 그림에 구워진 값이다(현재 "KING OF
// HILLS" / "1 ROUND"). GET /koth/clubs 연동 시 값 없는 plate로 교체하고 title/round를
// 텍스트로 겹쳐 그릴 것.
// 데스크톱 배치는 BoardScreen.module.css 의 .kothBanner/.kothRound 가 맡는다.
// 배너의 보이는 오른쪽 끝은 오른쪽 여백선(무대 97.5%), 보이는 위 끝은 열린 문제 패널 위선에 맞추고
// 라운드 단추는 배너와 같이 움직인다. 아래 % 좌표는 시안 원래 자리다.
export default function KothEventBanner() {
  const navigate = useNavigate();

  return (
    <>
      <img
        src="/assets/board/banner-koth-event.webp"
        alt="KOTH 이벤트 배너"
        className={`${styles.kothBanner} absolute left-[81.45%] top-[26.48%] w-[17.66%] h-[58.06%] object-contain pointer-events-none`}
      />

      <button
        type="button"
        onPointerEnter={() => preloadGameArtwork(document, ROUTES.koth)}
        onFocus={() => preloadGameArtwork(document, ROUTES.koth)}
        onPointerDown={() => preloadGameArtwork(document, ROUTES.koth)}
        onClick={() => navigate(ROUTES.koth)}
        aria-label="KOTH 페이지로 이동"
        className={`${styles.kothRound} absolute left-[84.73%] top-[68.15%] w-[11.09%] h-[15.56%] border-0 bg-transparent p-0 cursor-pointer`}
      >
        <img
          src="/assets/board/button-round.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">KOTH 페이지로 이동</span>
      </button>
    </>
  );
}
