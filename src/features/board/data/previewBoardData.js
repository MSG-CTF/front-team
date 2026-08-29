// 백엔드 연동 전 1차 UI 상태. 실제로는 GET /board / GET /board/me /
// GET /board/dice/status 응답(README.md "2. 문제 리스트(보드) 페이지")을 이 형태로
// 어댑트해 BoardPage state에 넣는다. 화면(BoardScreen)은 이 shape에만 의존한다.
export const PREVIEW_BOARD_STATE = Object.freeze({
  // GET /board/me
  position: 1,
  isQuarantined: false,
  boardCompleted: false,

  // GET /board/dice/status
  diceRollsLeft: 2,
  diceRollsMax: 2,
  nextDiceResetInSeconds: 30,
  quarantineReleasedInSeconds: null,

  // KOTH 이벤트 배너(우측) - GET /koth/clubs의 active 클럽 요약으로 채울 예정
  kothEventTitle: "KING OF HILLS",
  round: 1,
});

// 무인도(QUARANTINE) 칸 안내 문구 - Figma node 309:104.
// 실제 문구/이미지는 백엔드가 아니라 기획에서 확정(README.md 2절 "무인도칸(미정)").
export const QUARANTINE_NOTICE_LINES = Object.freeze([
  "부스에서 해지할 수 있는 방법 설명",
  "어쩌고 저쩌고~",
]);
