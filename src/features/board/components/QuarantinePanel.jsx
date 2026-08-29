import { formatRemaining } from "../../../utils/time.js";
import { QUARANTINE_NOTICE_LINES } from "../data/previewBoardData.js";

// Figma node 309:100 "QuarantinePanel" (무인도 클릭, 146:19) — BoardGrid 위에 뜨는 오버레이.
// 프레임 / 일러스트 / 모래시계 / 진행바 + 샘플 카운트다운("00:27:45")이
// quarantine-panel.png에 함께 그려져 있고, 위로 삐져나온 다람쥐(309:101) ·
// 닫기 버튼(309:103) · 안내 문구(309:104)만 얹는다.
//
// ⚠️ 라이브 카운트다운은 아직 겹쳐 그리지 않는다(plate에 샘플 값이 구워져 있어
// 이중으로 보임). 값 없는 plate 재추출 후 aria 정보를 화면 텍스트로 승격할 것.
export default function QuarantinePanel({ releasedInSeconds, onClose }) {
  return (
    <div
      className="absolute left-[24.22%] top-[30.09%] w-[46.67%] h-[51.76%]"
      role="dialog"
      aria-modal="true"
      aria-label={`무인도 — 해제까지 ${formatRemaining(releasedInSeconds)}`}
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

      {/* 안내 문구 — 패널 하단 파치먼트 영역 */}
      <p className="absolute left-[15%] top-[85.5%] w-[62%] whitespace-pre-line font-inria-serif text-[0.9cqw] leading-snug text-[#4a3a24]">
        {QUARANTINE_NOTICE_LINES.join("\n")}
      </p>

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
