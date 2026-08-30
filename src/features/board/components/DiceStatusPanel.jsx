import { formatRemaining } from "../../../utils/time.js";

// Figma node 5:19 "주사위판" (캔버스 좌상단, 표시 영역 378x223). 주사위 그림 /
// "Time remaining" 라벨 / 스노우플레이크 아이콘 / 진행바 테두리 + 샘플 값이 한 장에
// 합쳐진 원본이다. asset 픽셀은 수정하지 않고, 샘플 값 영역만 런타임 readout으로
// 대체해 API 값이 이미지의 고정값과 혼동되지 않게 한다.
export default function DiceStatusPanel({
  rollsLeft,
  canRoll,
  blockedMessage,
  resetInSeconds,
  challengeRemainingSeconds,
}) {
  const countdown = challengeRemainingSeconds ?? resetInSeconds;
  const countdownLabel = challengeRemainingSeconds != null ? "문제 제한" : "충전까지";
  const statusLabel =
    blockedMessage || (canRoll ? "주사위를 굴릴 수 있습니다." : "상태 확인 중");

  return (
    <div
      className="absolute left-[1.35%] top-0 w-[19.69%] h-[20.65%]"
      role="status"
      aria-label={`주사위 남은 횟수 ${rollsLeft}. ${statusLabel}${countdown == null ? "" : `, ${countdownLabel} ${formatRemaining(countdown)}`}`}
    >
      <img
        src="/assets/board/panel-dice-status.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      <div className="absolute left-[12%] top-[47%] z-10 flex h-[12%] w-[78%] items-center justify-between bg-[#21150d] px-[0.35cqw] font-inria-serif text-[0.58cqw] text-[#f8ead0]">
        <span>주사위 {rollsLeft}회</span>
        {countdown != null && (
          <span>
            {countdownLabel} {formatRemaining(countdown)}
          </span>
        )}
      </div>
      <div className="absolute left-[12%] top-[59%] z-10 h-[6%] w-[78%] rounded-full border border-[#a66a22] bg-[#291a0f]" />
      <p className="absolute left-[12%] top-[68%] z-10 m-0 w-[78%] truncate text-center font-inria-serif text-[0.46cqw] text-[#e7d2ad]">
        {statusLabel}
      </p>
    </div>
  );
}
