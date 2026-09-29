import { getChallengeDeadline } from "../../../utils/time.js";
import { unwrapBoardResponse } from "./boardData.js";

// 상세로 바로 이동할 때는 곧 떠날 보드의 재조회를 기다리지 않는다
export async function openChallengeAccess({ challengeId, idempotencyKey, refreshBoard = true }, { openCell, syncProgress }) {
  const openResult = unwrapBoardResponse(await openCell({ challengeId, idempotencyKey }));
  if (refreshBoard) await syncProgress();
  return {
    cellIndex: openResult.cell_index,
    challengeId: openResult.challenge_id,
    openedAt: openResult.opened_at,
    solveDeadlineAt: getChallengeDeadline(openResult.opened_at),
    remainingSeconds: openResult.remaining_seconds,
  };
}
