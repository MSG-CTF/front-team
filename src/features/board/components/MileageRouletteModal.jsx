import { useEffect, useRef, useState } from "react";
import {
  ROULETTE_SEGMENTS,
  ROULETTE_SEGMENT_ANGLE,
  buildRouletteGradient,
  getRouletteRotation,
} from "../utils/boardOverlays.js";

const SPIN_DURATION_MS = 3200;

// Figma node 555:306 "룰렛" - 보드 위 가운데 뜨는 MILEAGE ROULETTE 모달.
// 패널(555:330, 제목/"남은 기회"/"/" 포함), SPIN 버튼(555:336), 닫기 버튼(555:331)은
// Figma 원본 에셋이고 좌표는 1920x1080 무대 기준 %로 옮겼다(패널 483,359 / 882x461).
// 휠(555:335) 원본은 숫자(20/30/300/500)와 포인터·받침대가 한 장에 그려져 있어 돌릴 수
// 없고 명세 값(50·100·150·200)과도 달라, 같은 자리에 명세 값으로 휠을 그린다.
// 결과는 서버 응답(mileage_gained) 칸에 멈춘 뒤 보여준다. 룰렛칸마다 1회라 남은 기회는 1/1 -> 0/1.
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
    <div className="absolute inset-0 z-50 bg-[#1b0d05]/35" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mileage-roulette-title"
        className="absolute left-[25.16%] top-[33.24%] h-[42.69%] w-[45.94%] drop-shadow-[0_1cqw_1.6cqw_rgba(20,8,2,0.6)]"
      >
        <img
          src="/assets/board/roulette-panel.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        />
        {/* 제목은 패널 이미지에 그려져 있다 */}
        <h2 id="mileage-roulette-title" className="sr-only">마일리지 룰렛</h2>

        <button
          type="button"
          onClick={onClose}
          disabled={!showResult}
          aria-label="룰렛 닫기"
          title={showResult ? "닫기" : "룰렛을 돌린 뒤 닫을 수 있습니다"}
          className="absolute left-[93.2%] top-[11.5%] h-[5.42%] w-[3.06%] border-0 bg-transparent p-0 hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
        </button>

        {/* 휠: 시안 휠 원판 중심(30.1%, 56.1%), 지름 = 패널 폭 35.3% */}
        <div className="absolute left-[12.51%] top-[22.41%] h-[67.46%] w-[35.26%]">
          <span aria-hidden="true" className="absolute left-1/2 top-[-6%] z-20 h-0 w-0 -translate-x-1/2 border-x-[0.6cqw] border-t-[1.3cqw] border-x-transparent border-t-[#b98a3e] drop-shadow" />
          <span aria-hidden="true" className="absolute left-1/2 top-[-4.8%] z-30 h-[0.5cqw] w-[0.5cqw] -translate-x-1/2 rounded-full bg-[#b3261e] shadow-[0_0_0.3cqw_#ff8a70]" />
          <div
            aria-hidden="true"
            className="roulette-wheel absolute inset-0 rounded-full border-[0.45cqw] border-[#8f6427] shadow-[0_0.3cqw_0.8cqw_rgba(0,0,0,0.45),inset_0_0_0_0.18cqw_#5a1714]"
            style={{
              background: buildRouletteGradient(["#6e1d1a", "#eadcc2"]),
              transform: `rotate(${rotation}deg)`,
              transition: isSettling ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.7, 0.18, 1)` : "none",
              animation: isSpinning ? "roulette-idle-spin 0.9s linear infinite" : "none",
            }}
          >
            {ROULETTE_SEGMENTS.map((value, index) => {
              const angle = index * ROULETTE_SEGMENT_ANGLE + ROULETTE_SEGMENT_ANGLE / 2;
              return (
                <span
                  key={index}
                  className="absolute left-1/2 top-0 h-1/2 w-[2.2cqw] -translate-x-1/2 origin-bottom pt-[9%] text-center font-abyssinica leading-none"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  {/* 시안처럼 멈춘 휠에서 숫자가 똑바로 서 보이도록 칸 각도만큼 되돌린다 */}
                  <span className="block" style={{ transform: `rotate(${-angle}deg)` }}>
                    <span className={`block text-[1.05cqw] ${index % 2 === 0 ? "text-[#f3e6cc]" : "text-[#3a1a10]"}`}>{value}</span>
                    <span className={`mt-[0.1cqw] block text-[0.62cqw] ${index % 2 === 0 ? "text-[#f3e6cc]/85" : "text-[#3a1a10]/85"}`}>M</span>
                  </span>
                </span>
              );
            })}
            <span className="absolute left-1/2 top-1/2 grid h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[0.3cqw] border-[#9a6c2b] bg-[radial-gradient(circle,#7b5a36_0%,#3a2414_72%)] text-[1.6cqw] text-[#e5c68a] shadow-[inset_0_0_0.6cqw_rgba(0,0,0,0.6)]">
              ✦
            </span>
          </div>
        </div>

        {/* 오른쪽 문구: 시안 555:340 (16px, #613d15) */}
        <p className="absolute left-[59.4%] top-[38.18%] m-0 w-[32.9%] text-center font-pretendard text-[0.83cqw] leading-normal text-[#613d15]" role="status" aria-live="polite">
          {showResult
            ? `+${mileageGained} 마일리지 획득! 총 ${event.result?.totalMileage ?? "-"}`
            : isSpinning || isSettling
              ? "룰렛이 돌아가는 중입니다"
              : "룰렛을 돌려 마일리지를 획득하세요"}
        </p>

        {/* 남은 기회 N / 1 - "남은 기회"와 "/"는 패널 이미지, 숫자만 얹는다(555:337, 555:338) */}
        <span className="sr-only">남은 기회 {chancesLeft} / 1</span>
        <span aria-hidden="true" className="absolute left-[72.2%] top-[53.8%] -translate-x-1/2 font-pretendard text-[1.67cqw] leading-normal text-black">{chancesLeft}</span>
        <span aria-hidden="true" className="absolute left-[79.4%] top-[53.8%] -translate-x-1/2 font-pretendard text-[1.67cqw] leading-normal text-black">1</span>

        {/* SPIN 버튼(555:336). 결과가 나오면 같은 자리에서 확인(닫기) 버튼으로 바뀐다 */}
        {showResult ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-[58.28%] top-[66.81%] h-[14.75%] w-[35.83%] rounded-[0.5cqw] border-[0.15cqw] border-[#b98a3e] bg-[linear-gradient(#7a2320,#5a1714)] font-abyssinica text-[1.35cqw] tracking-[0.08em] text-[#f1dfb8] shadow-[inset_0_0_0_0.12cqw_#3a0e0c] hover:brightness-110"
          >
            확인
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSpin(event.token)}
            disabled={isMutating || isSuccess}
            aria-label={isSpinning || isSettling ? "룰렛 돌리는 중" : "룰렛 돌리기(SPIN)"}
            className="absolute left-[58.28%] top-[66.81%] h-[14.75%] w-[35.83%] border-0 bg-transparent p-0 hover:brightness-110 disabled:cursor-wait disabled:brightness-75"
          >
            <img src="/assets/board/roulette-spin-button.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
          </button>
        )}

        {/* 시안 555:341 문구는 "Try you Luck"(오타)이라 "Try your Luck"로 표기 */}
        <p aria-hidden="true" className="absolute left-[59.4%] top-[82.9%] m-0 w-[32.9%] text-center font-abyssinica text-[0.83cqw] leading-normal text-[#613d15]">
          Try your Luck
        </p>
      </section>
    </div>
  );
}
