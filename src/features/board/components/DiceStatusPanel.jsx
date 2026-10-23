import { Fragment } from "react";
import { formatRemaining } from "../../../utils/time.js";
import styles from "./BoardScreen.module.css";
import PanelTexture from "../../../components/common/PanelTexture.jsx";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";

const COMPACT_MESSAGES = {
  [BLOCKED_REASON_MESSAGES.NO_ROLL_LEFT]: "주사위 충전 중",
  [BLOCKED_REASON_MESSAGES.CHALLENGE_NOT_SELECTED]: "문제를 먼저 선택해주세요",
  [BLOCKED_REASON_MESSAGES.TIMER_RUNNING]: "제한시간이 끝나면 이동 가능",
  [BLOCKED_REASON_MESSAGES.PENDING_CONFIRM]: "주사위 결과 확정 대기",
  [BLOCKED_REASON_MESSAGES.BOARD_COMPLETED]: "모든 보드 칸 완료",
  "보유한 찬스카드 한 장을 먼저 폐기해주세요": "찬스카드 한 장 폐기 필요",
};

function Countdown({ seconds }) {
  return formatRemaining(seconds).split(":").map((part, index, parts) => (
    <Fragment key={index}>{part}{index < parts.length - 1 && <>:<wbr /></>}</Fragment>
  ));
}

// Keep the original frame and dice. A blank crop from the same wood replaces
// the baked sample values and gauge together, so no black cover or gauge tip
// can protrude around the live text at a different viewport size.
export default function DiceStatusPanel({
  rollsLeft,
  maxRolls = 3,
  canRoll,
  blockedMessage,
  resetInSeconds,
  challengeRemainingSeconds,
  // 다음 주사위 충전까지 남은 시간 비율(0~1). 없으면 막대는 가득 찬 채 흐리게 둔다
  progress = null,
}) {
  const rechargeVisible = rollsLeft < maxRolls && resetInSeconds != null;
  const statusLabel =
    blockedMessage || (canRoll ? "주사위를 굴릴 수 있습니다" : "상태 확인 중");
  const compactStatus = blockedMessage
    ? (Object.hasOwn(COMPACT_MESSAGES, blockedMessage) ? COMPACT_MESSAGES[blockedMessage] : "이동 대기 중")
    : canRoll ? "주사위 굴리기 가능" : "상태 확인 중";

  return (
    <div
      className={`${styles.diceStatus} absolute left-[1.35%] top-0 w-[19.69%] h-[20.65%]`}
      role="status"
      data-roll-ready={canRoll && !blockedMessage}
      aria-label={`주사위 보유 ${rollsLeft}/${maxRolls}. ${statusLabel}${rechargeVisible ? `, 충전까지 ${formatRemaining(resetInSeconds)}` : ""}${challengeRemainingSeconds == null ? "" : `, 문제 제한 ${formatRemaining(challengeRemainingSeconds)}`}`}
    >
      <PanelTexture />
      <img src="/assets/board/dice.png" className={styles.mobileDiceIcon} alt="" aria-hidden="true" />
      {/* Figma 5:19 주사위판. 숫자와 게이지 채움을 지운 원본 조각이라 실제 값은 아래에서 겹쳐 그린다 */}
      <svg viewBox="0 0 333 146" className={styles.dicePanelArtwork} aria-hidden="true" focusable="false">
        <image href="/assets/board/panel-dice-status-v2.png" width="333" height="146" />
      </svg>
      <svg viewBox="0 0 16 16" className={styles.diceStatusIcon} aria-hidden="true" focusable="false">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#f3e6c8" />
        {[[5, 5], [11, 5], [5, 11], [11, 11], [8, 8]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="#4a2e17" />)}
      </svg>
      <div className={styles.diceGauge} role="progressbar" aria-label="주사위 충전 진행"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 1) * 100)} data-idle={progress == null}>
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, progress ?? 1)) * 100)}%` }} />
      </div>

      <div className={`${styles.diceReadout} absolute left-[12.5%] top-[45%] z-10 w-[77%] font-inria-serif text-[#f8ead0]`}>
        <div className={styles.diceCountRow}>
          <span>주사위 <strong>{rollsLeft}/{maxRolls}</strong></span>
          {rechargeVisible && <span>충전까지 <strong><Countdown seconds={resetInSeconds} /></strong></span>}
        </div>
      </div>
      {challengeRemainingSeconds != null && <div className={`${styles.diceChallengeRow} absolute right-[10%] top-[25%] z-10 font-inria-serif`}>문제 제한 <strong><Countdown seconds={challengeRemainingSeconds} /></strong></div>}
      <p className={`${styles.diceStatusMessage} absolute left-[5.6%] top-[70%] z-10 m-0 w-[87.8%] text-left font-inria-serif text-[#e7d2ad]`} title={statusLabel}>
        <span className={styles.diceStatusFull}>{statusLabel}</span>
        <span className={styles.diceStatusCompact} aria-hidden="true">{compactStatus}</span>
      </p>
    </div>
  );
}
