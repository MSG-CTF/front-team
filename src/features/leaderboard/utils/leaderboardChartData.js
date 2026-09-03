// API가 정렬해 반환한 최대 8팀의 solve 시계열을 화면용 누적 점수로 변환한다.
// teamScore로 팀 순서를 다시 계산하지 않으며, KOTH용 가짜 시점도 생성하지 않는다.
export const SCORE_SERIES_COLORS = Object.freeze([
  "#f4ad00",
  "#f35b0a",
  "#d71932",
  "#8444c4",
  "#079eb8",
  "#738d0a",
  "#3560b5",
  "#9b4f1d",
]);

const MAX_VISIBLE_SERIES = 8;

function asTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function niceAxisMax(rawMax) {
  if (!(rawMax > 0)) return 1;

  const exponent = Math.floor(Math.log10(rawMax));
  const magnitude = 10 ** exponent;
  const fraction = rawMax / magnitude;
  const roundedFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return roundedFraction * magnitude;
}

export function buildScoreSeries(teams) {
  const visibleTeams = teams.slice(0, MAX_VISIBLE_SERIES);
  const timestamps = visibleTeams.flatMap((team) =>
    team.solves
      .map((solve) => asTimestamp(solve.solvedAt))
      .filter((timestamp) => timestamp !== null),
  );

  if (timestamps.length === 0) {
    return { series: [], minTime: null, maxTime: null, maxScore: 0 };
  }

  const firstSolveAt = Math.min(...timestamps);
  const lastSolveAt = Math.max(...timestamps);
  const timeSpan = Math.max(lastSolveAt - firstSolveAt, 60 * 60 * 1000);
  const horizontalPadding = timeSpan * 0.04;
  const minTime = firstSolveAt - horizontalPadding;
  const maxTime = lastSolveAt + horizontalPadding;

  const series = visibleTeams
    .map((team, index) => {
      let cumulativeScore = 0;
      const points = [{ timestamp: minTime, score: 0 }];

      team.solves.forEach((solve) => {
        const timestamp = asTimestamp(solve.solvedAt);
        if (timestamp === null) return;

        cumulativeScore += solve.points;
        points.push({ timestamp, score: cumulativeScore });
      });

      return {
        key: team.key,
        name: team.name,
        isTop3: team.isTop3,
        color: SCORE_SERIES_COLORS[index],
        points,
        finalScore: cumulativeScore,
      };
    })
    .filter((entry) => entry.points.length > 1);

  const maxScore = Math.max(...series.map((entry) => entry.finalScore), 0);

  return { series, minTime, maxTime, maxScore };
}

export function createChartScales({ minTime, maxTime, maxScore, width, height }) {
  const timeSpan = Math.max((maxTime ?? 0) - (minTime ?? 0), 1);
  const scoreSpan = Math.max(niceAxisMax(maxScore), 1);

  return {
    x: (timestamp) => ((timestamp - minTime) / timeSpan) * width,
    y: (score) => height - (score / scoreSpan) * height,
  };
}

export function toPolylinePoints(points, scaleX, scaleY) {
  return points
    .map(
      (point) =>
        `${scaleX(point.timestamp).toFixed(2)},${scaleY(point.score).toFixed(2)}`,
    )
    .join(" ");
}

export function interpolateScoreAtTime(points, time) {
  if (points.length === 0) return 0;
  if (time <= points[0].timestamp) return points[0].score;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];

    if (time <= next.timestamp) {
      if (next.timestamp === previous.timestamp) return next.score;
      const ratio = (time - previous.timestamp) / (next.timestamp - previous.timestamp);
      return previous.score + (next.score - previous.score) * ratio;
    }
  }

  return points[points.length - 1].score;
}
