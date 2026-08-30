// Figma node 309:78 "BoardGrid" (951x714) + 104:458 "주사위" + 100:454 "람쥐"(말).
// 36칸은 board-grid.png 한 장에 통째로 그려져 있고(개별 BoardCell로 분해하지 않음 -
// Figma 컴포넌트 설명), 그 위에 말, 주사위, (칸 클릭용) 히트스팟만 얹는다.
//
// TODO(board): 칸별 클릭 히트스팟은 GET /board 응답의 칸 좌표(아직 명세 없음 - README.md
// 2절 미해결)가 확정되면 36칸 전체로 생성한다. 지금은 시안의 샘플 히트스팟 2개만 둔다.
const SAMPLE_CELL_HOTSPOTS = [
  // Figma node 148:74 / 148:69 - 투명 클릭 영역
  { cellIndex: 3, className: "left-[35.78%] top-[33.98%] w-[2.86%] h-[5.37%]" },
  { cellIndex: 18, className: "left-[65.63%] top-[65.56%] w-[3.65%] h-[3.7%]" },
];

export default function BoardTrack({ piecePosition, onSelectCell, onRollDice, canRoll }) {
  return (
    <div className="absolute left-[23.33%] top-[26.76%] w-[49.53%] h-[66.11%]">
      <img
        src="/assets/board/board-grid.png"
        alt="게임 보드판"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* 팀 말(다람쥐) - 현재 위치. 좌표 매핑은 board API 확정 후 칸 -> 좌표 테이블로 교체. */}
      <img
        src="/assets/board/piece-squirrel.png"
        alt={`내 팀 말 (현재 ${piecePosition}번 칸)`}
        className="absolute left-[46.7%] top-[77%] w-[17.4%] -scale-x-100 object-contain pointer-events-none"
      />

      {/* 중앙 주사위 - 클릭 시 굴리기 */}
      <button
        type="button"
        onClick={onRollDice}
        disabled={!canRoll}
        aria-label="주사위 굴리기"
        className="absolute left-[37.5%] top-[39%] w-[22%] h-[16%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:brightness-90"
      >
        <img
          src="/assets/board/dice.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">주사위 굴리기</span>
      </button>

      {SAMPLE_CELL_HOTSPOTS.map((hotspot) => (
        <button
          key={hotspot.cellIndex}
          type="button"
          onClick={() => onSelectCell(hotspot.cellIndex)}
          aria-label={`${hotspot.cellIndex}번 칸 선택`}
          className={`absolute border-0 bg-transparent p-0 cursor-pointer ${hotspot.className}`}
        >
          <span className="sr-only">{hotspot.cellIndex}번 칸</span>
        </button>
      ))}
    </div>
  );
}
