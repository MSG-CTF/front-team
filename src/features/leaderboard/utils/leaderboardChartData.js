// 팀별 누적 점수 그래프 계산 유틸. ScoreBoard.jsx의 `dynamicGraph` 슬롯에 들어가는
// LeaderboardScoreGraph가 사용한다. leaderboardData.js의 adaptLeaderboardTeams()가
// solves를 이미 solved_at 오름차순으로 정렬해두므로, 여기서는 그 배열을 누적합하기만 한다.

// 상위 6팀 색상. Figma 시안의 단풍잎 범례(주황·주홍·적색·보라·청록·올리브)를 그대로 쓰지
// 않고, 같은 색상군을 유지하되 dataviz 가이드의 6단계 검증(명도대/채도바닥/CVD 대비/
// 정상시야 대비/명암비)을 통과하도록 재조정한 값이다.
// node scripts/validate_palette.js "#dc7809,#932b20,#f75337,#702b95,#2492d3,#69a217" --mode light
// → ALL CHECKS PASS (worst adjacent normal ΔE 22.5, worst CVD ΔE 18.8)
export const SCORE_SERIES_COLORS = Object.freeze([
  "#dc7809",
  "#932b20",
  "#f75337",
  "#702b95",
  "#2492d3",
  "#69a217",
]);

const MAX_SERIES = 6;

function asTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

// 축에 쓸 "깔끔한" 최댓값을 계산한다(1/2/5 * 10^n 단위로 올림).
export function niceAxisMax(rawMax) {
  if (!(rawMax > 0)) return 100;
  const exponent = Math.floor(Math.log10(rawMax));
  const magnitude = 10 ** exponent;
  const fraction = rawMax / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

export function buildAxisTicks(max, count = 5) {
  return Array.from({ length: count + 1 }, (_, index) => Math.round((max * index) / count));
}

// 팀별 누적 점수 시계열을 만든다. 모든 팀이 동일한 시작 시각(전체 첫 solve 시각)에
// 0점에서 출발해, solve마다 계단식으로 오르고, 마지막 solve 이후 끝 시각까지 값을
// 유지하는 step line으로 그린다(랭킹 보드 표준 표현).
export function buildScoreSeries(teams, { colors = SCORE_SERIES_COLORS } = {}) {
  const ranked = [...teams]
    .sort((left, right) => right.totalScore - left.totalScore)
    .slice(0, MAX_SERIES);

  const allTimestamps = ranked.flatMap((team) =>
    team.solves.map((solve) => asTimestamp(solve.solvedAt)).filter((t) => t !== null),
  );

  if (allTimestamps.length === 0) return { series: [], minTime: null, maxTime: null, maxScore: 0 };

  const minTime = Math.min(...allTimestamps);
  const maxTime = Math.max(...allTimestamps, Date.now());

  const series = ranked.map((team, index) => {
    let running = 0;
    const points = [{ t: minTime, score: 0 }];

    for (const solve of team.solves) {
      const t = asTimestamp(solve.solvedAt);
      if (t === null) continue;
      running += solve.points;
      points.push({ t, score: running });
    }

    points.push({ t: maxTime, score: running });

    return {
      key: team.key,
      name: team.name,
      color: colors[index % colors.length],
      points,
      finalScore: running,
    };
  });

  const maxScore = Math.max(...series.map((entry) => entry.finalScore), 0);

  return { series, minTime, maxTime, maxScore };
}

// x(시각)/y(점수)를 SVG 좌표(0..width / height..0)로 변환하는 스케일러.
export function createScales({ minTime, maxTime, maxAxisScore, width, height }) {
  const timeSpan = Math.max(1, (maxTime ?? 0) - (minTime ?? 0));
  const scoreSpan = Math.max(1, maxAxisScore);

  return {
    x: (t) => ((t - minTime) / timeSpan) * width,
    y: (score) => height - (score / scoreSpan) * height,
  };
}

// step line용 SVG path("이전 값 유지 후 다음 값으로 수직 상승") 좌표 문자열을 만든다.
export function toStepPath(points, scaleX, scaleY) {
  if (points.length === 0) return "";

  return points
    .map((point, index) => {
      const x = scaleX(point.t).toFixed(2);
      const y = scaleY(point.score).toFixed(2);
      if (index === 0) return `M ${x} ${y}`;
      const prevY = scaleY(points[index - 1].score).toFixed(2);
      return `L ${x} ${prevY} L ${x} ${y}`;
    })
    .join(" ");
}
