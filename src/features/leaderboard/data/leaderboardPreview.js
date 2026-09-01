// Figma 화면 검수에서만 사용하는 명시적 UI preview 데이터다.
// 실제 API 실패 시 이 데이터로 자동 대체하지 않는다.
const PREVIEW_NAMES = [
  "sdsfsasafd",
  "dfdafvvd",
  "sdsfsasafd",
  "dfdafvvd",
  "sdsfsasafd",
  "dfdafvvd",
];

const PREVIEW_SCORES = [28373, 3240, 1648, 1234, 543, 84];
const PREVIEW_SOLVES = [54, 23, 21, 18, 9, 3];

// 09:00~20:30 사이에 solveCount개 solve를 고르지 않은 간격으로 흩뿌리고,
// totalScore를 그 solve 수만큼 랜덤 비중으로 나눠 누적하면 totalScore가 된다.
// 시드 고정 PRNG라 스크린샷/리뷰 때마다 같은 모양이 나온다.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function buildPreviewSolves(teamIndex, totalScore, solveCount) {
  if (solveCount <= 0) return [];
  const random = seededRandom(teamIndex * 97 + 13);
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  const startMs = today.getTime();
  const endMs = startMs + 11.5 * 60 * 60 * 1000; // ~20:30

  const offsets = Array.from({ length: solveCount }, () => random()).sort((a, b) => a - b);
  const weights = Array.from({ length: solveCount }, () => 0.3 + random());
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  let allocated = 0;
  return offsets.map((offset, index) => {
    const isLast = index === solveCount - 1;
    const points = isLast
      ? totalScore - allocated
      : Math.max(1, Math.round((weights[index] / weightSum) * totalScore));
    allocated += points;

    return {
      challengeKey: `preview-solve-${teamIndex}-${index}`,
      sourceType: "CHALLENGE",
      solvedAt: new Date(startMs + offset * (endMs - startMs)).toISOString(),
      points,
    };
  });
}

export const LEADERBOARD_PREVIEW_TEAMS = PREVIEW_NAMES.map((name, index) => ({
  key: `figma-preview-team-${index}`,
  teamKey: null,
  name,
  totalScore: PREVIEW_SCORES[index],
  solves: buildPreviewSolves(index, PREVIEW_SCORES[index], PREVIEW_SOLVES[index]),
}));

export const RANKING_PREVIEW_ROWS = PREVIEW_SCORES.map((teamScore, index) => ({
  key: `figma-preview-ranking-${index}`,
  rank: index + 1,
  teamKey: null,
  teamName: "sdsfsasafd",
  teamScore,
  lastSolvedAt: null,
  mileage: null,
  solveCount: PREVIEW_SOLVES[index],
  categoryScores: Array(9).fill(PREVIEW_SOLVES[index]),
  isPreview: true,
}));
