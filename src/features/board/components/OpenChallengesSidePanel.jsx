import { formatOpenChallengeNumber } from "../utils/boardOverlays.js";

// Figma node 518:300 "열린 문제" - 주사위판 아래 "열린 문제 목록 보기"를 누르면 보드
// 왼쪽에 뜨는 양피지 세로 패널. 패널/번호 배지/화살표/"전체 문제 보기"/닫기 버튼은
// Figma 원본 에셋이고, 좌표는 1920x1080 무대 기준 %로 옮겼다(패널 32,179 / 284x814).
// 행을 누르면 문제 상세로, 하단 버튼은 열린 문제 목록 페이지로 이동한다.
// 데이터는 GET /board/opened_challenges(연 순서 오름차순).
export function OpenChallengesToggle({ isOpen, count, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="board-open-challenges-panel"
      // 닫힘 시안(555:319) 62,165 / 열림 시안(518:317) 56,155
      className={`absolute z-30 whitespace-nowrap border-0 bg-transparent p-0 font-pretendard text-[1.25cqw] leading-normal text-white [text-shadow:0_0.08cqw_0.25cqw_rgba(0,0,0,0.85)] hover:text-[#ffd98a] focus-visible:outline focus-visible:outline-[0.12cqw] focus-visible:outline-[#ffe090] ${isOpen ? "left-[2.92%] top-[14.35%]" : "left-[3.23%] top-[15.28%]"}`}
    >
      {/* 시안은 열린 상태에서도 같은 문구를 쓴다. 열림 여부는 aria-expanded로 전달 */}
      열린 문제 목록 보기
      {count > 0 && <span className="sr-only"> ({count}개)</span>}
    </button>
  );
}

export default function OpenChallengesSidePanel({ challenges, onSelectChallenge, onViewAll, onClose }) {
  return (
    <aside
      id="board-open-challenges-panel"
      aria-label="열린 문제"
      className="absolute left-[1.67%] top-[16.57%] z-40 h-[75.37%] w-[14.79%]"
    >
      <img
        src="/assets/board/open-challenges-panel.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
      <h2 className="sr-only">열린 문제</h2>

      <button
        type="button"
        onClick={onClose}
        aria-label="열린 문제 패널 닫기"
        className="absolute left-[76.06%] top-[5.41%] h-[2.58%] w-[8.1%] border-0 bg-transparent p-0 hover:brightness-125"
      >
        <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </button>

      <ol className="absolute left-[15.14%] top-[26.41%] m-0 flex h-[57.2%] w-[69.4%] list-none flex-col overflow-y-auto p-0">
        {challenges.map((challenge, index) => (
          <li key={challenge.challengeId} className="shrink-0 border-b border-[#844618]">
            <button
              type="button"
              onClick={() => onSelectChallenge(challenge.challengeId)}
              aria-label={`${formatOpenChallengeNumber(index)}번 ${challenge.title || "문제"}${challenge.isSolved ? ", 해결함" : ""} 상세 보기`}
              className="flex h-[3.26cqw] w-full items-center gap-[0.42cqw] border-0 bg-transparent p-0 text-left hover:bg-[#f6ead2]/60 focus-visible:outline focus-visible:outline-[0.1cqw] focus-visible:outline-[#844618]"
            >
              <span aria-hidden="true" className="relative grid h-[1.51cqw] w-[1.41cqw] shrink-0 place-items-center">
                <img
                  src="/assets/board/open-challenges-badge.png"
                  alt=""
                  // 푼 문제는 같은 배지를 초록 계열로 돌려 구분한다
                  className={`absolute inset-0 h-full w-full object-contain ${challenge.isSolved ? "[filter:hue-rotate(95deg)_saturate(0.8)]" : ""}`}
                />
                <span className="relative font-pretendard text-[0.68cqw] text-white">
                  {challenge.isSolved ? "✓" : formatOpenChallengeNumber(index)}
                </span>
              </span>
              <span className="min-w-0 flex-1 pt-[0.05cqw]">
                <strong className="block truncate font-pretendard text-[0.68cqw] font-bold leading-normal text-black">
                  {challenge.title || challenge.challengeId}
                </strong>
                <span className="block truncate font-pretendard text-[0.52cqw] leading-normal text-black">
                  {[challenge.category, challenge.isSolved ? "해결" : null].filter(Boolean).join(" · ") || "-"}
                </span>
              </span>
              <img
                src="/assets/board/open-challenges-chevron.png"
                alt=""
                aria-hidden="true"
                className="h-[1.41cqw] w-[1.15cqw] shrink-0 object-contain"
              />
            </button>
          </li>
        ))}
        {challenges.length === 0 && (
          <li className="pt-[1cqw] text-center font-pretendard text-[0.62cqw] leading-relaxed text-[#613d15]">
            아직 연 문제가 없습니다.
            <br />
            문제 칸에 도착하면 문제를 골라 열 수 있습니다.
          </li>
        )}
      </ol>

      <button
        type="button"
        onClick={onViewAll}
        aria-label="전체 문제 보기"
        className="absolute left-[32.39%] top-[85.01%] h-[6.14%] w-[34.51%] border-0 bg-transparent p-0 hover:brightness-110"
      >
        <img src="/assets/board/open-challenges-view-all.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </button>
    </aside>
  );
}
