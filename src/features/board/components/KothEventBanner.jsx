// Figma node 5:26 "버튼 없 배너"(339x627) + 5:32 "라운드 버튼"(213x168).
// 우측 세로 배너 + 그 아래 "N ROUND" 버튼. 제목/일러스트/라운드 숫자가 그림에
// 이미 그려져 있어 여기서는 배치와 클릭 영역만 담당한다.
//
// ⚠️ 이벤트 제목, 라운드 숫자는 banner/button 그림에 구워진 값이다(현재 "KING OF
// HILLS" / "1 ROUND"). GET /koth/clubs 연동 시 값 없는 plate로 교체하고 title/round를
// 텍스트로 겹쳐 그릴 것.
export default function KothEventBanner({ title, round, onOpenRound }) {
  return (
    <>
      <img
        src="/assets/board/banner-koth-event.png"
        alt={`진행 중인 KOTH 이벤트: ${title}`}
        className="absolute left-[80.99%] top-[26.48%] w-[17.66%] h-[58.06%] object-contain pointer-events-none"
      />

      <button
        type="button"
        onClick={onOpenRound}
        aria-label={`${round} 라운드 정보`}
        className="absolute left-[84.27%] top-[68.15%] w-[11.09%] h-[15.56%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-105 active:brightness-95"
      >
        <img
          src="/assets/board/button-round.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">{round} 라운드 정보 보기</span>
      </button>
    </>
  );
}
