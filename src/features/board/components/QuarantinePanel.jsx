import { useState } from "react";
import { formatRemaining } from "../../../utils/time.js";
import { QUARANTINE_NOTICE_LINES } from "../data/boardContent.js";

// Figma node 309:100 "QuarantinePanel" (무인도 클릭, 146:19) - BoardGrid 위에 뜨는 오버레이.
// 프레임 / 일러스트 / 모래시계 / 진행바 + 샘플 카운트다운이
// quarantine-panel.png에 함께 그려져 있고, 위로 삐져나온 다람쥐(309:101), 
// 닫기 버튼(309:103), 안내 문구(309:104)만 얹는다.
export default function QuarantinePanel({
  releasedInSeconds,
  isMutating,
  freeEscapeCards,
  onEscape,
  onUseFreeEscape,
  onClose,
}) {
  const [escapeCode, setEscapeCode] = useState("");

  const submitEscape = (event) => {
    event.preventDefault();
    const code = escapeCode.trim();
    if (!code || isMutating) return;
    onEscape(code);
  };

  return (
    <div
      className="absolute left-[24.22%] top-[30.09%] z-40 h-[51.76%] w-[46.67%]"
      role="dialog"
      aria-modal="true"
      aria-label={
        releasedInSeconds == null
          ? "무인도"
          : `무인도 - 해제까지 ${formatRemaining(releasedInSeconds)}`
      }
    >
      {/* 위로 삐져나온 다람쥐 */}
      <img
        src="/assets/board/piece-squirrel.png"
        alt=""
        aria-hidden="true"
        className="absolute left-[19%] top-[-9%] w-[18.4%] -scale-x-100 object-contain pointer-events-none"
      />

      {/* 패널 본체(프레임 + 일러스트 + 진행바) */}
      <img
        src="/assets/board/quarantine-panel.png"
        alt=""
        aria-hidden="true"
        className="absolute left-0 top-[9.8%] w-full h-[90.2%] object-contain pointer-events-none drop-shadow-[0_4px_60px_rgba(0,0,0,0.35)]"
      />

      <div className="absolute left-[65.4%] top-[65%] z-10 flex h-[6%] w-[17%] items-center justify-center rounded-[0.3cqw] bg-[#472719] font-inria-serif text-[0.8cqw] text-[#f8d48b]">
        {releasedInSeconds == null ? null : formatRemaining(releasedInSeconds)}
      </div>

      {/* 안내 문구 - 패널 하단 파치먼트 영역 */}
      <p className="absolute left-[15%] top-[85.5%] w-[62%] whitespace-pre-line font-inria-serif text-[0.9cqw] leading-snug text-[#4a3a24]">
        {QUARANTINE_NOTICE_LINES.join("\n")}
      </p>

      <form
        onSubmit={submitEscape}
        className="absolute left-[42%] top-[72%] z-20 flex w-[42%] gap-[0.35cqw]"
      >
        <input
          type="text"
          value={escapeCode}
          disabled={isMutating}
          onChange={(event) => setEscapeCode(event.target.value)}
          placeholder="탈출 코드"
          aria-label="무인도 탈출 코드"
          className="min-w-0 flex-1 rounded-[0.25cqw] border border-[#8a5728] bg-[#fff2cf] px-[0.4cqw] py-[0.24cqw] font-inria-serif text-[0.62cqw] text-[#3e2818]"
        />
        <button
          type="submit"
          disabled={isMutating || !escapeCode.trim()}
          className="rounded-[0.25cqw] border border-[#70411e] bg-[#75451f] px-[0.55cqw] font-inria-serif text-[0.6cqw] font-bold text-[#fff2cf] disabled:cursor-not-allowed disabled:opacity-60"
        >
          탈출
        </button>
      </form>

      {freeEscapeCards.length > 0 && (
        <div className="absolute left-[42%] top-[79%] z-20 w-[42%]">
          {freeEscapeCards.map((card) => (
            <button
              key={card.cardId}
              type="button"
              disabled={isMutating}
              onClick={() => onUseFreeEscape(card.cardId)}
              className="w-full rounded-[0.25cqw] border border-[#9c672f] bg-[#3d2818] px-[0.4cqw] py-[0.22cqw] font-inria-serif text-[0.58cqw] text-[#f8d48b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {card.name || "무료 탈출 카드"} 사용
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-[10.5%] top-[19%] w-[4.5%] aspect-square border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95"
      >
        <img
          src="/assets/board/icon-close.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">닫기</span>
      </button>
    </div>
  );
}
