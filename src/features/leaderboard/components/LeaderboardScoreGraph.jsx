import { useMemo, useState } from "react";
import { toKst } from "../../../utils/time.js";
import {
  buildScoreSeries,
  createChartScales,
  interpolateScoreAtTime,
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

function formatScore(score) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(score));
}

function formatTime(timestamp) {
  return toKst(new Date(timestamp).toISOString(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function findNearestTime(times, targetX, scaleX) {
  return times.reduce(
    (nearest, time) => {
      const distance = Math.abs(scaleX(time) - targetX);
      return distance < nearest.distance ? { time, distance } : nearest;
    },
    { time: null, distance: Infinity },
  ).time;
}

export default function LeaderboardScoreGraph({ teams, status }) {
  const [hoverX, setHoverX] = useState(null);
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
  const solveTimes = useMemo(
    () =>
      Array.from(
        new Set(
          chartData.series.flatMap((entry) =>
            entry.points.slice(1).map((point) => point.timestamp),
          ),
        ),
      ).sort((left, right) => left - right),
    [chartData.series],
  );
  const hasSeries = chartData.series.length > 0;
  const stateMessage = STATUS_MESSAGE[status] ?? (hasSeries ? null : "NO SCORE DATA");
  const hoverTime =
    hoverX !== null && solveTimes.length > 0
      ? findNearestTime(solveTimes, hoverX, scales.x)
      : null;

  const handlePointerMove = (event) => {
    if (!hasSeries) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * plotWidth;
    setHoverX(Math.max(0, Math.min(plotWidth, pointerX)));
  };

  return (
    <div className={styles.graph} onPointerLeave={() => setHoverX(null)}>
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

            {hoverTime !== null ? (
              <>
                <line
                  x1={scales.x(hoverTime)}
                  x2={scales.x(hoverTime)}
                  y1={0}
                  y2={plotHeight}
                  className={styles.hoverLine}
                />
                {chartData.series.map((entry) => (
                  <circle
                    key={entry.key}
                    cx={scales.x(hoverTime)}
                    cy={scales.y(interpolateScoreAtTime(entry.points, hoverTime))}
                    r={3.5}
                    fill={entry.color}
                    className={styles.hoverPoint}
                  />
                ))}
              </>
            ) : null}

            <rect
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={handlePointerMove}
            />
          </g>
        </svg>
      ) : null}

      {hasSeries && hoverTime !== null ? (
        <div
          className={styles.tooltip}
          style={{
            left: `${((PLOT.left + scales.x(hoverTime)) / VIEW_WIDTH) * 100}%`,
            top: `${(PLOT.top / VIEW_HEIGHT) * 100}%`,
          }}
        >
          <p className={styles.tooltipTime}>{formatTime(hoverTime)}</p>
          {chartData.series.map((entry) => (
            <p key={entry.key} className={styles.tooltipRow}>
              <span
                className={styles.tooltipKey}
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className={styles.tooltipName}>{entry.name}</span>
              <strong className={styles.tooltipScore}>
                {formatScore(interpolateScoreAtTime(entry.points, hoverTime))}
              </strong>
            </p>
          ))}
        </div>
      ) : null}

      {!hasSeries && stateMessage ? <p className={styles.state}>{stateMessage}</p> : null}
    </div>
  );
}
