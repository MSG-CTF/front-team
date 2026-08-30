export const BLOCKED_REASON_MESSAGES = Object.freeze({
  NO_ROLL_LEFT: "남은 주사위가 없습니다. 충전 시간을 확인해주세요.",
  QUARANTINED: "무인도에서 해제되기 전에는 주사위를 굴릴 수 없습니다.",
  CHALLENGE_NOT_SELECTED: "현재 칸에서 도전할 문제를 먼저 선택해주세요.",
  TIMER_RUNNING: "진행 중인 문제의 제한 시간이 끝나기 전에는 이동할 수 없습니다.",
  PENDING_CONFIRM: "보류 중인 주사위 결과를 먼저 확정해주세요.",
  BOARD_COMPLETED: "모든 보드 칸을 완료했습니다.",
});

// Figma node 309:104에 있는 기획 문구다. API 데이터가 아니므로 고정 UI 카피로 유지한다.
export const QUARANTINE_NOTICE_LINES = Object.freeze([
  "부스에서 해지할 수 있는 방법 설명",
  "어쩌고 저쩌고~",
]);
