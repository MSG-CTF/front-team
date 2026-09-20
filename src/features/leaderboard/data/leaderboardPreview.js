// Figma 화면 검수에서만 사용하는 명시적 UI preview 데이터다.
// 실제 API 실패 시 이 데이터로 자동 대체하지 않는다.
const PREVIEW_NAMES = [
  "아주긴팀이름도다음점수칸을넘지않도록확인하는팀",
  "TEAM BRAVO",
  "TEAM CHARLIE",
  "TEAM DELTA",
  "TEAM ECHO",
  "TEAM FOXTROT WITH A LONG UNBROKEN-NAME-FOR-LAYOUT",
  "TEAM GOLF", "TEAM HOTEL", "TEAM INDIA", "TEAM JULIET", "TEAM KILO", "TEAM LIMA",
  "TEAM MIKE", "TEAM NOVEMBER", "TEAM OSCAR", "TEAM PAPA", "TEAM QUEBEC", "TEAM ROMEO",
];

const PREVIEW_SCORES = [28373, 17320, 16480, 14300, 10543, 8500, 7100, 6400, 5700, 5300, 4900, 4200, 3500, 3000, 2800, 2000, 1500, 1100];
const PREVIEW_SOLVES = [54, 43, 41, 38, 29, 23, 21, 18, 16, 16, 15, 14, 12, 10, 9, 8, 7, 6];

// 09:00~20:30 사이에 solveCount개 solve를 고르지 않은 간격으로 흩뿌리고,
// previewScore를 그 solve 수만큼 랜덤 비중으로 나눠 누적하면 previewScore가 된다.
// 시드 고정 PRNG라 스크린샷/리뷰 때마다 같은 모양이 나온다.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function buildPreviewSolves(teamIndex, previewScore, solveCount) {
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
      ? previewScore - allocated
      : Math.max(1, Math.round((weights[index] / weightSum) * previewScore));
    allocated += points;

    return {
      challengeKey: `preview-solve-${teamIndex}-${index}`,
      sourceType: "JEOPARDY",
      solvedAt: new Date(startMs + offset * (endMs - startMs)).toISOString(),
      points,
    };
  });
}

export const LEADERBOARD_PREVIEW_TEAMS = PREVIEW_NAMES.slice(0, 8).map((name, index) => ({
  key: `figma-preview-team-${index}`,
  teamKey: null,
  name,
  teamScore: PREVIEW_SCORES[index],
  isTop3: index < 3,
  solves: buildPreviewSolves(index, PREVIEW_SCORES[index], PREVIEW_SOLVES[index]),
}));

function buildPreviewBreakdown(teamScore, index) {
  const signatureScore = 300 * (1 + index % 4);
  const kothScore = 150 * (index % 4);
  const jeopardyScore = teamScore - signatureScore - kothScore;
  const weights = Array.from({ length: 8 }, (_, category) => 1 + (index + category) % 5);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;
  const categoryScores = weights.map((weight, category) => {
    const score = category === weights.length - 1 ? jeopardyScore - allocated : Math.floor(jeopardyScore * weight / weightSum);
    allocated += score;
    return score;
  });
  return { categoryScores, kothScore, signatureScore };
}

export const RANKING_PREVIEW_ROWS = PREVIEW_SCORES.map((teamScore, index) => ({
  key: `figma-preview-ranking-${index}`,
  rank: index + 1,
  teamKey: null,
  teamName: PREVIEW_NAMES[index],
  teamScore,
  lastSolvedAt: null,
  mileage: null,
  solveCount: PREVIEW_SOLVES[index],
  ...buildPreviewBreakdown(teamScore, index),
  isTop3: index < 3,
  isPreview: true,
}));
