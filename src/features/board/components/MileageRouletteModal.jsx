import { useEffect, useRef, useState } from "react";
import {
  ROULETTE_SEGMENTS,
  ROULETTE_SEGMENT_ANGLE,
  buildRouletteGradient,
  getRouletteRotation,
} from "../utils/boardOverlays.js";

const SPIN_DURATION_MS = 3200;

// Figma node 555:306 "룰렛" - 보드 위 가운데 뜨는 MILEAGE ROULETTE 모달.
// 왼쪽은 창가 삽화 + 휠, 오른쪽은 제목/남은 기회/SPIN 버튼. 휠 숫자는 명세 값
// (50·100·150·200)으로 그린다. 결과는 서버 응답(mileage_gained) 칸에 멈춰 보여준다.
// 룰렛칸마다 1회만 돌릴 수 있어 남은 기회는 1/1 -> 0/1로 표시한다.
export default function MileageRouletteModal({ event, isMutating, onSpin, onClose }) {
  const [rotation, setRotation] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  // 결과 칸에 멈춘 뒤에만 결과를 보여준다(응답 직후 한 프레임 먼저 보이는 것 방지)
  const [revealedToken, setRevealedToken] = useState(null);
  const rotationRef = useRef(0);
  const settledTokenRef = useRef(null);

  const isSuccess = event.status === "success";
  const mileageGained = event.result?.mileageGained;

  useEffect(() => {
    if (!isSuccess) return undefined;
    const token = event.token;
    if (settledTokenRef.current !== token) {
      settledTokenRef.current = token;
      const next = getRouletteRotation(mileageGained, rotationRef.current);
      if (next == null) {
        // 휠에 없는 값이 와도 결과는 그대로 보여준다
        setRevealedToken(token);
        return undefined;
      }
      rotationRef.current = next;
      setRotation(next);
      setIsSettling(true);
    }
    // StrictMode에서 effect가 다시 실행돼도 공개 타이머는 새로 건다
    const timer = window.setTimeout(() => {
      setIsSettling(false);
      setRevealedToken(token);
    }, SPIN_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [event.token, isSuccess, mileageGained]);

  const isSpinning = isMutating && !isSuccess;
  const showResult = isSuccess && revealedToken === event.token;
  const chancesLeft = isSuccess ? 0 : 1;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#1b0d05]/45" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mileage-roulette-title"
        className="relative flex h-[40%] w-[45%] overflow-hidden rounded-[0.6cqw] border-[0.22cqw] border-[#8a5a2b] bg-[#efe1c4] shadow-[0_1cqw_2.4cqw_rgba(20,8,2,0.6),inset_0_0_0_0.18cqw_#f8eedb,inset_0_0_2.4cqw_rgba(120,76,32,0.3)]"
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-[0.45cqw] rounded-[0.35cqw] border border-[#b58a55]/70" />
        <span aria-hidden="true" className="absolute left-1/2 top-[-0.1cqw] z-20 h-[0.9cqw] w-[0.9cqw] -translate-x-1/2 rotate-45 border border-[#c9a15f] bg-[#7a2420]" />

        {(isSuccess || !isSpinning) && (
          <button
            type="button"
            onClick={onClose}
            disabled={!showResult}
            aria-label="룰렛 닫기"
            title={isSuccess ? "닫기" : "룰렛을 돌린 뒤 닫을 수 있습니다"}
            className="absolute right-[1.1cqw] top-[0.9cqw] z-30 grid h-[1.3cqw] w-[1.3cqw] place-items-center rounded-full border border-[#c7a26b] bg-[#2d1a10] p-0 text-[0.8cqw] leading-none text-[#f1e2c2] hover:bg-[#4a2a17] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        )}

        {/* 왼쪽: 창가 삽화 위 휠 */}
        <div className="relative h-full w-[46%] overflow-hidden bg-[radial-gradient(circle_at_40%_35%,#f6e6c3_0%,#caa77a_45%,#6b4526_100%)]">
          <span aria-hidden="true" className="absolute left-[6%] top-[6%] text-[1.4cqw]">🍁</span>
          <span aria-hidden="true" className="absolute bottom-[6%] left-[5%] text-[1.5cqw]">🏮</span>
          <span aria-hidden="true" className="absolute bottom-[8%] right-[4%] text-[1.2cqw]">🍂</span>

          <div className="absolute left-1/2 top-1/2 aspect-square h-[82%] -translate-x-1/2 -translate-y-1/2">
            <span aria-hidden="true" className="absolute left-1/2 top-[-4%] z-20 h-0 w-0 -translate-x-1/2 border-x-[0.55cqw] border-t-[1.1cqw] border-x-transparent border-t-[#c9a15f] drop-shadow" />
            <span aria-hidden="true" className="absolute left-1/2 top-[-3.2%] z-30 h-[0.45cqw] w-[0.45cqw] -translate-x-1/2 rounded-full bg-[#b3261e] shadow-[0_0_0.3cqw_#ff8a70]" />
            <div
              aria-hidden="true"
              className="roulette-wheel absolute inset-0 rounded-full border-[0.35cqw] border-[#c9a15f] shadow-[0_0.3cqw_0.8cqw_rgba(0,0,0,0.45),inset_0_0_0_0.15cqw_#5a1714]"
              style={{
                background: buildRouletteGradient(),
                transform: `rotate(${rotation}deg)`,
                transition: isSettling ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.7, 0.18, 1)` : "none",
                animation: isSpinning ? "roulette-idle-spin 0.9s linear infinite" : "none",
              }}
            >
              {ROULETTE_SEGMENTS.map((value, index) => (
                <span
                  key={index}
                  className="absolute left-1/2 top-0 h-1/2 w-[1.8cqw] -translate-x-1/2 origin-bottom pt-[6%] text-center font-inria-serif leading-none"
                  style={{ transform: `rotate(${index * ROULETTE_SEGMENT_ANGLE + ROULETTE_SEGMENT_ANGLE / 2}deg)` }}
                >
                  <span className={`block text-[0.72cqw] font-bold ${index % 2 === 0 ? "text-[#f6e7c8]" : "text-[#5a1714]"}`}>{value}</span>
                  <span className={`block text-[0.42cqw] ${index % 2 === 0 ? "text-[#f6e7c8]/80" : "text-[#5a1714]/80"}`}>M</span>
                </span>
              ))}
              <span className="absolute left-1/2 top-1/2 grid h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[0.2cqw] border-[#c9a15f] bg-[radial-gradient(circle,#7b5a36_0%,#3a2414_70%)] text-[1.1cqw] text-[#e5c68a]">
                ✦
              </span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 제목 / 설명 / 남은 기회 / SPIN */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-[1.6cqw] text-center">
          <span aria-hidden="true" className="text-[0.75cqw] leading-none text-[#a8452a]">🍁</span>
          <h2 id="mileage-roulette-title" className="m-0 mt-[0.2cqw] font-im-fell text-[1.55cqw] font-normal tracking-[0.06em] text-[#3b2616]">
            MILEAGE&nbsp;&nbsp;ROULETTE
          </h2>
          <span aria-hidden="true" className="mt-[0.2cqw] block h-px w-[70%] bg-gradient-to-r from-transparent via-[#8a5a2b] to-transparent" />
          <p className="m-0 mt-[0.55cqw] font-song-myung text-[0.66cqw] text-[#5b4128]">
            {showResult ? "룰렛 결과가 나왔습니다" : "룰렛을 돌려 마일리지를 획득하세요"}
          </p>

          <div className="mt-[0.7cqw] w-[78%] rounded-[0.3cqw] border border-[#c9ad83] bg-[#e5d3b0]/80 px-[0.6cqw] py-[0.4cqw]" role="status" aria-live="polite">
            {showResult ? (
              <>
                <span className="block font-song-myung text-[0.55cqw] text-[#6d5238]">획득 마일리지</span>
                <strong className="block font-inria-serif text-[1.3cqw] text-[#7a2420]">+{mileageGained} M</strong>
                <span className="block font-song-myung text-[0.52cqw] text-[#6d5238]">총 마일리지 {event.result?.totalMileage ?? "-"}</span>
              </>
            ) : (
              <>
                <span className="block font-song-myung text-[0.55cqw] text-[#6d5238]">남은 기회</span>
                <strong className="block font-inria-serif text-[1.2cqw] font-normal text-[#3b2616]">
                  <span aria-hidden="true" className="mr-[0.6cqw] text-[0.7cqw] text-[#a8452a]">❦</span>
                  {chancesLeft} / 1
                  <span aria-hidden="true" className="ml-[0.6cqw] text-[0.7cqw] text-[#a8452a]">❦</span>
                </strong>
              </>
            )}
          </div>

          {showResult ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-[0.7cqw] w-[78%] rounded-[0.4cqw] border-[0.12cqw] border-[#c9a15f] bg-[#6e1f1c] py-[0.45cqw] font-im-fell text-[0.95cqw] tracking-[0.1em] text-[#f6e7c8] shadow-[inset_0_0_0_0.1cqw_#3a0e0c] hover:bg-[#842622]"
            >
              확인
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSpin(event.token)}
              disabled={isMutating || isSuccess}
              className="mt-[0.7cqw] w-[78%] rounded-[0.4cqw] border-[0.12cqw] border-[#c9a15f] bg-[#6e1f1c] py-[0.45cqw] font-im-fell text-[0.95cqw] tracking-[0.1em] text-[#f6e7c8] shadow-[inset_0_0_0_0.1cqw_#3a0e0c] hover:bg-[#842622] disabled:cursor-wait disabled:opacity-70"
            >
              <span aria-hidden="true" className="mr-[0.6cqw] text-[0.6cqw]">✧</span>
              {isSpinning || isSettling ? "SPINNING" : "SPIN"}
              <span aria-hidden="true" className="ml-[0.6cqw] text-[0.6cqw]">✧</span>
            </button>
          )}
          <p className="m-0 mt-[0.35cqw] font-im-fell text-[0.55cqw] italic text-[#6d5238]">Try your Luck</p>
          <span aria-hidden="true" className="mt-[0.2cqw] text-[0.5cqw] text-[#8a5a2b]">◆</span>
        </div>
      </section>
    </div>
  );
}
