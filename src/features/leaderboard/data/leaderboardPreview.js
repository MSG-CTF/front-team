// Figma 화면 검수에서만 사용하는 명시적 UI preview 데이터다.
// 실제 API 실패 시 이 데이터로 자동 대체하지 않는다.
const PREVIEW_NAMES = [
  "TEAM ALPHA",
  "TEAM BRAVO",
  "TEAM CHARLIE",
  "TEAM DELTA",
  "TEAM ECHO",
  "TEAM FOXTROT",
];

const PREVIEW_SCORES = [28373, 3240, 1648, 1234, 543, 84];
const PREVIEW_SOLVES = [54, 23, 21, 18, 9, 3];

export const LEADERBOARD_PREVIEW_TEAMS = PREVIEW_NAMES.map((name, index) => ({
  key: `figma-preview-team-${index}`,
  teamKey: null,
  name,
  teamScore: PREVIEW_SCORES[index],
  isTop3: index < 3,
  solves: [],
}));

export const RANKING_PREVIEW_ROWS = PREVIEW_SCORES.map((teamScore, index) => ({
  key: `figma-preview-ranking-${index}`,
  rank: index + 1,
  teamKey: null,
  teamName: PREVIEW_NAMES[index],
  teamScore,
  lastSolvedAt: null,
  mileage: null,
  solveCount: PREVIEW_SOLVES[index],
  categoryScores: Array(9).fill(PREVIEW_SOLVES[index]),
  isTop3: index < 3,
  isPreview: true,
}));
