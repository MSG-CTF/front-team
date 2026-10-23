import { useRef } from "react";
import useBoardCountdown from "../hooks/useBoardCountdown.js";
import DiceStatusPanel from "./DiceStatusPanel.jsx";

export function BoardDiceStatusPanel({ diceStatus, activeChallenge, ...props }) {
  // 제한시간이 끝난 뒤 activeChallenge가 남아 있어도 서버 상태를 기준으로 표시한다
  const challengeRunning = diceStatus?.timerRunning === true || diceStatus?.blockedReason === "TIMER_RUNNING";
  const resetInSeconds = useBoardCountdown(diceStatus?.nextDiceResetAt, diceStatus);
  const challengeRemainingSeconds = useBoardCountdown(challengeRunning ? activeChallenge?.solveDeadlineAt : null, diceStatus);
  // 서버가 충전 주기를 따로 주지 않아 이번 주기에서 본 가장 긴 남은 시간을 전체로 삼는다
  const cycleTotal = useRef(0);
  if (!(resetInSeconds > 0)) cycleTotal.current = 0;
  else if (resetInSeconds > cycleTotal.current) cycleTotal.current = resetInSeconds;
  const progress = resetInSeconds > 0 ? resetInSeconds / cycleTotal.current : null;
  return <DiceStatusPanel {...props} resetInSeconds={resetInSeconds} challengeRemainingSeconds={challengeRemainingSeconds} progress={progress} />;
}
