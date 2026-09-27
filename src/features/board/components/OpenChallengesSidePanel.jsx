import { formatOpenChallengeNumber } from "../utils/boardOverlays.js";

// Figma node 518:300 "열린 문제" - 주사위판 아래 "열린 문제 목록 보기"를 누르면 보드
// 왼쪽에 뜨는 양피지 세로 패널. 행을 누르면 문제 상세로, 하단 링크는 열린 문제 목록
// 페이지로 이동한다. 데이터는 GET /board/opened_challenges(연 순서 오름차순).
export function OpenChallengesToggle({ isOpen, count, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="board-open-challenges-panel"
      className="absolute left-[2.6%] top-[15.6%] z-30 border-0 bg-transparent p-0 font-song-myung text-[0.78cqw] text-[#f6e7c8] [text-shadow:0_0.08cqw_0.25cqw_rgba(0,0,0,0.85)] hover:text-[#ffd98a] focus-visible:outline focus-visible:outline-[0.12cqw] focus-visible:outline-[#ffe090]"
    >
      열린 문제 목록 {isOpen ? "닫기" : "보기"}
      {count > 0 && <span className="ml-[0.3cqw] text-[0.62cqw] text-[#ffd98a]">({count})</span>}
    </button>
  );
}

export default function OpenChallengesSidePanel({ challenges, onSelectChallenge, onViewAll, onClose }) {
  return (
    <aside
      id="board-open-challenges-panel"
      aria-label="열린 문제"
      className="absolute left-[2.4%] top-[19%] z-40 flex h-[73%] w-[13.4%] flex-col rounded-[0.5cqw] border-[0.18cqw] border-[#8a5a2b] bg-[#ecdcbc] px-[0.7cqw] pb-[0.9cqw] pt-[0.6cqw] text-[#3b2616] shadow-[0_0.6cqw_1.6cqw_rgba(30,12,2,0.55),inset_0_0_0_0.14cqw_#f7ecd6,inset_0_0_1.8cqw_rgba(120,76,32,0.35)]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-[0.35cqw] rounded-[0.3cqw] border border-[#b58a55]/70" />
      <button
        type="button"
        onClick={onClose}
        aria-label="열린 문제 패널 닫기"
        className="relative z-10 ml-auto grid h-[1.15cqw] w-[1.15cqw] place-items-center rounded-full border border-[#c7a26b] bg-[#2d1a10] p-0 text-[0.7cqw] leading-none text-[#f1e2c2] hover:bg-[#4a2a17]"
      >
        ×
      </button>

      <header className="relative z-10 mt-[0.2cqw] text-center">
        <span aria-hidden="true" className="block text-[0.9cqw] leading-none text-[#a8452a]">🍁</span>
        <h2 className="m-0 mt-[0.15cqw] font-song-myung text-[1.45cqw] font-normal leading-tight text-[#3b2616]">열린 문제</h2>
        <span aria-hidden="true" className="mx-auto mt-[0.3cqw] block h-px w-[80%] bg-gradient-to-r from-transparent via-[#8a5a2b] to-transparent" />
      </header>

      <ol className="relative z-10 m-0 mt-[0.6cqw] flex min-h-0 flex-1 list-none flex-col overflow-y-auto p-0">
        {challenges.map((challenge, index) => (
          <li key={challenge.challengeId} className="border-b border-[#b89567]/70">
            <button
              type="button"
              onClick={() => onSelectChallenge(challenge.challengeId)}
              aria-label={`${formatOpenChallengeNumber(index)}번 ${challenge.title || "문제"}${challenge.isSolved ? ", 해결함" : ""} 상세 보기`}
              className="flex w-full items-center gap-[0.45cqw] border-0 bg-transparent px-[0.15cqw] py-[0.55cqw] text-left hover:bg-[#f6ead2] focus-visible:outline focus-visible:outline-[0.1cqw] focus-visible:outline-[#8a5a2b]"
            >
              <span
                aria-hidden="true"
                className={`grid h-[1.2cqw] w-[1.2cqw] shrink-0 place-items-center rounded-full border border-[#d6b77f] font-inria-serif text-[0.52cqw] font-bold text-[#f7e7c6] ${challenge.isSolved ? "bg-[#4b6b34]" : "bg-[#7a2420]"}`}
              >
                {challenge.isSolved ? "✓" : formatOpenChallengeNumber(index)}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate font-inria-serif text-[0.62cqw] text-[#2c1a0e]">{challenge.title || challenge.challengeId}</strong>
                <span className="block truncate font-inria-serif text-[0.48cqw] text-[#6d5238]">
                  {[challenge.category, challenge.isSolved ? "해결" : null].filter(Boolean).join(" · ") || "-"}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[0.8cqw] leading-none text-[#6d5238]">›</span>
            </button>
          </li>
        ))}
        {challenges.length === 0 && (
          <li className="px-[0.2cqw] py-[1cqw] text-center font-song-myung text-[0.6cqw] text-[#6d5238]">
            아직 연 문제가 없습니다.
            <br />
            문제 칸에 도착하면 문제를 골라 열 수 있습니다.
          </li>
        )}
      </ol>

      <button
        type="button"
        onClick={onViewAll}
        className="relative z-10 mx-auto mt-[0.6cqw] border-0 bg-transparent p-0 font-song-myung text-[0.58cqw] text-[#7a2420] underline underline-offset-[0.15cqw] hover:text-[#a8452a]"
      >
        전체 문제 보기
      </button>
    </aside>
  );
}
