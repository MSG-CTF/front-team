import { useMemo, useState } from "react";
import { toKst } from "../../../utils/time.js";
import {
  buildScoreSeries,
  niceAxisMax,
  createChartScales,
  scoreAtTime,
  toPolylinePoints,
} from "../utils/leaderboardChartData.js";
import styles from "./LeaderboardScoreGraph.module.css";

const VIEW_WIDTH = 1227;
const VIEW_HEIGHT = 362;
const PLOT = {
  left: 43,
  top: 56,
  right: 0,
  bottom: 0,
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
            entry.points.filter((point) => !point.isBoundary).map((point) => point.timestamp),
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
      <div aria-hidden="true" style={{ position: "absolute", left: -42, top: 34, width: 82, height: 350, background: "#e6d2a4" }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 365, width: 1280, height: 42, background: "#e6d2a4" }} />
      {hasSeries && Array.from({ length: 6 }, (_, index) => {
        const value = niceAxisMax(chartData.maxScore) * index / 5;
        return <span key={index} style={{ position: "absolute", right: "calc(100% - 35px)", top: PLOT.top + scales.y(value) - 10, fontSize: 16 }}>{formatScore(value)}</span>;
      })}
      {hasSeries && Array.from({ length: 5 }, (_, index) => {
        const time = chartData.minTime + (chartData.maxTime - chartData.minTime) * index / 4;
        return <span key={index} style={{ position: "absolute", left: PLOT.left + scales.x(time), top: 369, fontSize: 15, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>{formatTime(time)} KST</span>;
      })}
      {hasSeries ? (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          tabIndex={0}
          onFocus={() => setHoverX(scales.x(solveTimes[0]))}
          onBlur={() => setHoverX(null)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const index = solveTimes.indexOf(hoverTime);
            const next = event.key === "Home" ? 0 : event.key === "End" ? solveTimes.length - 1
              : Math.max(0, Math.min(solveTimes.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
            setHoverX(scales.x(solveTimes[next]));
          }}
          aria-labelledby="leaderboard-score-title leaderboard-score-description"
        >
          <title id="leaderboard-score-title">팀별 누적 점수 그래프</title>
          <desc id="leaderboard-score-description">
            조회 시점의 점수를 최초 풀이 시각에 누적한 그래프, KOTH 점수는 과거 획득 시각에 반영됨, 좌우 방향키로 시각 탐색
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
                    cy={scales.y(scoreAtTime(entry.points, hoverTime))}
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
                {formatScore(scoreAtTime(entry.points, hoverTime))}
              </strong>
            </p>
          ))}
        </div>
      ) : null}

      {!hasSeries && stateMessage ? <p className={styles.state}>{stateMessage}</p> : null}
    </div>
  );
}
