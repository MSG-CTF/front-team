import useBoardCountdown from "../hooks/useBoardCountdown.js";
import DiceStatusPanel from "./DiceStatusPanel.jsx";

export function BoardDiceStatusPanel({ diceStatus, activeChallenge, ...props }) {
  // 제한시간이 끝난 뒤 activeChallenge가 남아 있어도 서버 상태를 기준으로 표시한다
  const challengeRunning = diceStatus?.timerRunning === true || diceStatus?.blockedReason === "TIMER_RUNNING";
  const resetInSeconds = useBoardCountdown(diceStatus?.nextDiceResetAt, diceStatus);
  const challengeRemainingSeconds = useBoardCountdown(challengeRunning ? activeChallenge?.solveDeadlineAt : null, diceStatus);
  return <DiceStatusPanel {...props} resetInSeconds={resetInSeconds} challengeRemainingSeconds={challengeRemainingSeconds} />;
}
