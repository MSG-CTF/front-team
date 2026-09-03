import { useMemo } from "react";
import {
  buildScoreSeries,
  createChartScales,
  toPolylinePoints,
} from "../utils/leaderboardChartData.js";
import styles from "./LeaderboardScoreGraph.module.css";

const VIEW_WIDTH = 1227;
const VIEW_HEIGHT = 362;
const PLOT = {
  left: 28,
  top: 12,
  right: 22,
  bottom: 16,
};

const STATUS_MESSAGE = {
  loading: "LOADING SCORE DATA",
  empty: "NO SCORE DATA",
  error: "SCORE DATA UNAVAILABLE",
};

export default function LeaderboardScoreGraph({ teams, status }) {
  const chartData = useMemo(() => buildScoreSeries(teams ?? []), [teams]);
  const plotWidth = VIEW_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = VIEW_HEIGHT - PLOT.top - PLOT.bottom;
  const scales = useMemo(
    () =>
      createChartScales({
        minTime: chartData.minTime,
        maxTime: chartData.maxTime,
        maxScore: chartData.maxScore,
        width: plotWidth,
        height: plotHeight,
      }),
    [chartData, plotHeight, plotWidth],
  );
  const hasSeries = chartData.series.length > 0;
  const stateMessage = STATUS_MESSAGE[status] ?? (hasSeries ? null : "NO SCORE DATA");

  return (
    <div className={styles.graph}>
      {hasSeries ? (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby="leaderboard-score-title leaderboard-score-description"
        >
          <title id="leaderboard-score-title">팀별 누적 점수 그래프</title>
          <desc id="leaderboard-score-description">
            문제 풀이 시각 순으로 점수를 누적한 상위 팀 그래프
          </desc>
          <defs>
            <filter id="score-line-glow" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${PLOT.left} ${PLOT.top})`}>
            {chartData.series.map((entry) => (
              <polyline
                key={entry.key}
                points={toPolylinePoints(entry.points, scales.x, scales.y)}
                className={styles.scoreLine}
                fill="none"
                stroke={entry.color}
                strokeWidth={entry.isTop3 ? 3.6 : 3}
                vectorEffect="non-scaling-stroke"
                data-is-top3={entry.isTop3 || undefined}
              />
            ))}
          </g>
        </svg>
      ) : null}

      {!hasSeries && stateMessage ? (
        <p className={styles.state}>{stateMessage}</p>
      ) : null}
    </div>
  );
}
