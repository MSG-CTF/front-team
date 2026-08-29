import { formatRemaining } from "../../../utils/time.js";

// Figma node 5:19 "주사위판" (캔버스 좌상단, 표시 영역 378x223). 주사위 그림 /
// "Time remaining" 라벨 / 스노우플레이크 아이콘 / 진행바 테두리 + 샘플 값("2 / 2",
// "00:30", 채움)이 panel-dice-status.png에 함께 그려져 있다.
//
// ⚠️ 라이브 값(남은 굴림 수·리셋 카운트다운·진행률)은 아직 이 패널에 겹쳐 그리지
// 않는다 — 시안 plate에 샘플 값이 구워져 있어 이중으로 보이기 때문. 디자이너에게
// 값 없는 plate 재추출을 요청한 뒤 아래 aria 정보를 화면 텍스트로 승격할 것.
export default function DiceStatusPanel({ rollsLeft, rollsMax, resetInSeconds }) {
  return (
    <div
      className="absolute left-[1.35%] top-0 w-[19.69%] h-[20.65%]"
      role="status"
      aria-label={`주사위 남은 횟수 ${rollsLeft} / ${rollsMax}, 리셋까지 ${formatRemaining(resetInSeconds)}`}
    >
      <img
        src="/assets/board/panel-dice-status.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}
