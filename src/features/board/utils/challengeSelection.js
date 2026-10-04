// 선택창과 원판 숨김이 같은 우선순위를 사용한다
export function getChallengeSelectionKey({ myBoard, currentCell, awaitingDiscard, pendingChanceChoice, pendingRoll, blockedReason, cellEvent, isLoading }) {
  if (!myBoard || isLoading || awaitingDiscard || pendingChanceChoice || pendingRoll ||
      blockedReason === "PENDING_CONFIRM" || cellEvent?.type === "CHANCE" || cellEvent?.type === "ROULETTE" ||
      currentCell?.type !== "CHALLENGE" || !currentCell.challengeCandidates?.length) return null;
  return JSON.stringify([currentCell.cellIndex, currentCell.challengeCandidates.map((candidate) => candidate.challengeId)]);
}

export function isChallengeSelectionEmpty({ myBoard, currentCell, blockedReason }) {
  return Boolean(myBoard && !myBoard.boardCompleted &&
    blockedReason === "CHALLENGE_NOT_SELECTED" && currentCell?.type === "CHALLENGE" &&
    Array.isArray(currentCell.challengeCandidates) && currentCell.challengeCandidates.length === 0);
}
