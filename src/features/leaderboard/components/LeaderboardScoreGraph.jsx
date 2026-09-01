import { useMemo, useState } from "react";
import { toKst } from "../../../utils/time.js";
import {
  buildAxisTicks,
  buildScoreSeries,
  createScales,
  niceAxisMax,
  toStepPath,
} from "../utils/leaderboardChartData.js";
import styles from "./LeaderboardScoreGraph.module.css";

// Figma의 score.png(고정 이미지) 자리를 대체하는 실제 팀별 누적 점수 그래프.
// ScoreBoard.jsx의 dynamicGraph 슬롯으로 들어가며, 좌표계는 ScoreBoard 박스와 동일한
// 1227x362(디자인 px) — .dynamicGraph가 inset:0으로 이 박스를 그대로 채운다.
const VIEW_WIDTH = 1227;
const VIEW_HEIGHT = 362;
const PADDING = { top: 28, right: 16, bottom: 34, left: 68 };
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

// leaderboard.png(전체 페이지 배경)에는 이 박스 자리에 Figma 목업용 고정 축 눈금이
// 이미 그려져 있고, 좌/아래로 박스 경계 밖까지 살짝 삐져나와 있다. 그 잔상이 비치지
// 않도록 배경 마스크만 이 만큼 더 넓게 깐다(카드 테두리/랭킹 테이블은 건드리지 않는
// 선에서 실측한 값). 실제 그래프 좌표계(PADDING 기준)는 그대로다.
const BACKGROUND_BLEED = { left: 26, top: 0, right: 26, bottom: 40 };

const INK = "#402e26";
const GRID = "rgba(64, 46, 38, 0.16)";

const STATUS_MESSAGE = {
  loading: "LOADING SCORE DATA",
  empty: "NO SCORE DATA",
  error: "SCORE DATA UNAVAILABLE",
};

function formatScore(score) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(score));
}

function formatTick(timestamp) {
  return toKst(new Date(timestamp).toISOString(), { hour: "2-digit", minute: "2-digit", hour12: false });
}

function findNearestTimeIndex(times, targetTime) {
  let closestIndex = 0;
  let closestDistance = Infinity;
  times.forEach((time, index) => {
    const distance = Math.abs(time - targetTime);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function scoreAtTime(points, time) {
  // step line이므로 t 이하인 마지막 포인트의 점수를 취한다.
  let current = points[0]?.score ?? 0;
  for (const point of points) {
    if (point.t > time) break;
    current = point.score;
  }
  return current;
}

export default function LeaderboardScoreGraph({ teams, status }) {
  const [hoverX, setHoverX] = useState(null);

  const { series, minTime, maxTime, maxScore } = useMemo(
    () => buildScoreSeries(teams ?? []),
    [teams],
  );

  const axisMax = useMemo(() => niceAxisMax(maxScore || 1), [maxScore]);
  const yTicks = useMemo(() => buildAxisTicks(axisMax, 5), [axisMax]);

  const scales = useMemo(
    () =>
      createScales({
        minTime,
        maxTime,
        maxAxisScore: axisMax,
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      }),
    [minTime, maxTime, axisMax],
  );

  const xTicks = useMemo(() => {
    if (minTime == null || maxTime == null) return [];
    const tickCount = 6;
    return Array.from({ length: tickCount + 1 }, (_, index) => minTime + ((maxTime - minTime) * index) / tickCount);
  }, [minTime, maxTime]);

  const allTimes = useMemo(
    () => Array.from(new Set(series.flatMap((entry) => entry.points.map((point) => point.t)))).sort((a, b) => a - b),
    [series],
  );

  const hasData = series.length > 0 && minTime != null;
  const message = STATUS_MESSAGE[status];

  const hoverTime =
    hoverX != null && allTimes.length > 0
      ? allTimes[findNearestTimeIndex(allTimes.map((t) => scales.x(t)), hoverX)]
      : null;

  const handlePointerMove = (event) => {
    if (!hasData) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH - PADDING.left;
    setHoverX(Math.max(0, Math.min(PLOT_WIDTH, relativeX)));
  };

  const handlePointerLeave = () => setHoverX(null);

  return (
    <div className={styles.graph} aria-label="팀별 누적 점수 그래프">
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
      >
        {/* score.png 자리를 대체하면서, 그 밑에 깔린 leaderboard.png 배경의 고정
            축/눈금(Figma 목업용 정적 0~7500·09:00~21:00)을 가려야 하므로 종이 톤
            배경을 먼저 채운다(leaderboard.png의 그래프 영역 색을 샘플링한 값). 박스
            경계 밖으로 삐져나온 잔상까지 가리도록 BACKGROUND_BLEED만큼 더 넓게 깐다. */}
        <rect
          x={-BACKGROUND_BLEED.left}
          y={-BACKGROUND_BLEED.top}
          width={VIEW_WIDTH + BACKGROUND_BLEED.left + BACKGROUND_BLEED.right}
          height={VIEW_HEIGHT + BACKGROUND_BLEED.top + BACKGROUND_BLEED.bottom}
          fill="#f6ce98"
        />

        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {yTicks.map((tickScore) => {
            const y = PLOT_HEIGHT - (tickScore / axisMax) * PLOT_HEIGHT;
            return (
              <g key={tickScore}>
                <line x1={0} x2={PLOT_WIDTH} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
                <text x={-10} y={y} textAnchor="end" dominantBaseline="middle" className={styles.axisLabel}>
                  {formatScore(tickScore)}
                </text>
              </g>
            );
          })}

          <text x={-52} y={-12} className={styles.axisTitle}>
            POINTS
          </text>

          <line x1={0} x2={0} y1={0} y2={PLOT_HEIGHT} stroke={INK} strokeWidth={1} opacity={0.5} />
          <line x1={0} x2={PLOT_WIDTH} y1={PLOT_HEIGHT} y2={PLOT_HEIGHT} stroke={INK} strokeWidth={1} opacity={0.5} />

          {hasData &&
            xTicks.map((tick) => (
              <text
                key={tick}
                x={scales.x(tick)}
                y={PLOT_HEIGHT + 22}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {formatTick(tick)}
              </text>
            ))}

          {hasData &&
            series.map((entry) => (
              <path
                key={entry.key}
                d={toStepPath(entry.points, scales.x, scales.y)}
                fill="none"
                stroke={entry.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

          {hasData && hoverTime != null && (
            <>
              <line
                x1={scales.x(hoverTime)}
                x2={scales.x(hoverTime)}
                y1={0}
                y2={PLOT_HEIGHT}
                stroke={INK}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.55}
              />
              {series.map((entry) => (
                <circle
                  key={entry.key}
                  cx={scales.x(hoverTime)}
                  cy={scales.y(scoreAtTime(entry.points, hoverTime))}
                  r={3.5}
                  fill={entry.color}
                  stroke="#f8ecec"
                  strokeWidth={1}
                />
              ))}
            </>
          )}

          {hasData && (
            <rect
              x={0}
              y={0}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            />
          )}
        </g>
      </svg>

      {hasData && hoverTime != null && (
        <div
          className={styles.tooltip}
          style={{
            left: `${((PADDING.left + scales.x(hoverTime)) / VIEW_WIDTH) * 100}%`,
            top: `${(PADDING.top / VIEW_HEIGHT) * 100}%`,
          }}
        >
          <p className={styles.tooltipTime}>{formatTick(hoverTime)}</p>
          {series
            .map((entry) => ({ ...entry, score: scoreAtTime(entry.points, hoverTime) }))
            .sort((a, b) => b.score - a.score)
            .map((entry) => (
              <p key={entry.key} className={styles.tooltipRow}>
                <span className={styles.tooltipKey} style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <span className={styles.tooltipName}>{entry.name}</span>
                <strong className={styles.tooltipScore}>{formatScore(entry.score)}</strong>
              </p>
            ))}
        </div>
      )}

      {!hasData && message ? <p className={styles.state}>{message}</p> : null}
    </div>
  );
}
