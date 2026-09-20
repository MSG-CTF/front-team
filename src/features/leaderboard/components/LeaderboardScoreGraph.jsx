import { useId, useMemo, useState } from "react";
import { toKst } from "../../../utils/time.js";
import { buildScoreSeries, niceAxisMax, createChartScales, scoreAtTime, toPolylinePoints } from "../utils/leaderboardChartData.js";
import { clampRange, zoomRange, rangeFromDrag, tooltipLeft } from "../utils/leaderboardViewport.js";
import styles from "./LeaderboardScoreGraph.module.css";

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 392;
const PLOT = { left: 42, top: 30, right: 4, bottom: 48 };
const TOOLTIP_WIDTH = 290;
const STATUS_MESSAGE = { loading: "점수를 불러오는 중", empty: "아직 기록된 점수가 없습니다", error: "점수를 불러오지 못했습니다" };
const formatScore = (score) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(score);
const formatTime = (time, withSeconds = false) => toKst(new Date(time).toISOString(), {
  hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}), hour12: false,
});

function nearestTime(times, targetX, scaleX) {
  return times.reduce((nearest, time) => {
    const distance = Math.abs(scaleX(time) - targetX);
    return distance < nearest.distance ? { time, distance } : nearest;
  }, { time: null, distance: Infinity }).time;
}

export default function LeaderboardScoreGraph({ teams, status }) {
  const chartId = useId();
  const [hoverX, setHoverX] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [drag, setDrag] = useState(null);
  const chartData = useMemo(() => buildScoreSeries(teams ?? []), [teams]);
  const fullRange = [chartData.minTime, chartData.maxTime];
  const range = clampRange(zoom, fullRange);
  const plotWidth = VIEW_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = VIEW_HEIGHT - PLOT.top - PLOT.bottom;
  const hasSeries = chartData.series.length > 0 && range !== null;
  const scales = createChartScales({ minTime: range?.[0], maxTime: range?.[1], maxScore: chartData.maxScore, width: plotWidth, height: plotHeight });
  const zoomed = hasSeries && range[1] - range[0] < fullRange[1] - fullRange[0] - 1;
  const showSeconds = hasSeries && range[1] - range[0] < 10 * 60 * 1000;
  const solveTimes = useMemo(() => Array.from(new Set(chartData.series.flatMap((entry) => entry.points
    .filter((point) => !point.isBoundary).map((point) => point.timestamp)))).sort((a, b) => a - b), [chartData]);
  const visibleTimes = hasSeries ? Array.from(new Set([range[0], ...solveTimes.filter((time) => time >= range[0] && time <= range[1]), range[1]])) : [];
  const hoverTime = hoverX !== null && hasSeries ? nearestTime(visibleTimes, hoverX, scales.x) : null;
  const clipId = chartId + "-plot";
  const glowId = chartId + "-glow";

  const resetZoom = () => { setZoom(null); setHoverX(null); setDrag(null); };
  const changeZoom = (factor) => { setZoom(zoomRange(range, fullRange, factor)); setHoverX(null); };
  const pointerX = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(plotWidth, (event.clientX - bounds.left) / bounds.width * plotWidth));
  };
  const onPointerMove = (event) => {
    const x = pointerX(event);
    setHoverX(x);
    setDrag((current) => current ? { ...current, endX: x } : null);
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const x = pointerX(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ startX: x, endX: x });
    setHoverX(null);
  };
  const onPointerUp = (event) => {
    if (drag) {
      const selected = rangeFromDrag(drag.startX, pointerX(event), plotWidth, range);
      if (selected) { setZoom(clampRange(selected, fullRange)); setHoverX(null); }
    }
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event) => {
    if (["+", "=", "-", "Escape"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Escape") resetZoom();
      else changeZoom(event.key === "-" ? 2 : 0.5);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = visibleTimes.indexOf(hoverTime);
    const next = event.key === "Home" ? 0 : event.key === "End" ? visibleTimes.length - 1
      : Math.max(0, Math.min(visibleTimes.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    setHoverX(scales.x(visibleTimes[next]));
  };

  return <div className={styles.graph} onPointerLeave={() => { if (!drag) setHoverX(null); }}
    data-range-start={range?.[0]} data-range-end={range?.[1]} data-full-start={fullRange[0]} data-full-end={fullRange[1]}>
    {hasSeries && <div className={styles.zoomControls} aria-label="그래프 확대 도구">
      <span className={styles.zoomHint}>드래그로 확대</span>
      <button type="button" onClick={() => changeZoom(0.5)} aria-label="시간 구간 확대" title="시간 구간 확대 (+)">+</button>
      <button type="button" onClick={() => changeZoom(2)} disabled={!zoomed} aria-label="시간 구간 축소" title="시간 구간 축소 (-)">−</button>
      <button type="button" onClick={resetZoom} disabled={!zoomed} className={styles.resetZoom} title="전체 시간으로 돌아가기 (Esc 또는 더블클릭)">전체 보기</button>
    </div>}
    {hasSeries && Array.from({ length: 6 }, (_, index) => {
      const value = niceAxisMax(chartData.maxScore) * index / 5;
      return <span key={index} className={styles.axisScore} style={{ top: PLOT.top + scales.y(value) - 10 }}>{formatScore(value)}</span>;
    })}
    {hasSeries && Array.from({ length: 5 }, (_, index) => {
      const time = range[0] + (range[1] - range[0]) * index / 4;
      return <span key={index} className={styles.axisTime} style={{ left: PLOT.left + scales.x(time), top: VIEW_HEIGHT - PLOT.bottom + 17 }}>{formatTime(time, showSeconds)}</span>;
    })}
    {hasSeries && <svg className={styles.svg} viewBox={"0 0 " + VIEW_WIDTH + " " + VIEW_HEIGHT} preserveAspectRatio="none"
      role="img" tabIndex={0} onFocus={() => setHoverX(0)} onBlur={() => setHoverX(null)} onKeyDown={onKeyDown}
      aria-labelledby={chartId + "-title " + chartId + "-description"}>
      <title id={chartId + "-title"}>팀별 누적 점수 그래프</title>
      <desc id={chartId + "-description"}>마우스로 구간을 드래그하거나 더하기 키로 확대하고 Escape로 전체 보기, 좌우 방향키로 점수 탐색, 시간은 KST</desc>
      <defs>
        <clipPath id={clipId}><rect width={plotWidth} height={plotHeight} /></clipPath>
        <filter id={glowId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g transform={"translate(" + PLOT.left + " " + PLOT.top + ")"}>
        <rect width={plotWidth} height={plotHeight} className={styles.keyboardFocus} />
        <g clipPath={"url(#" + clipId + ")"}>
          {chartData.series.map((entry) => <polyline key={entry.key} points={toPolylinePoints(entry.points, scales.x, scales.y)}
            className={styles.scoreLine} style={{ filter: "url(#" + glowId + ")" }} fill="none" stroke={entry.color}
            strokeWidth={entry.isTop3 ? 3.6 : 3} vectorEffect="non-scaling-stroke" data-is-top3={entry.isTop3 || undefined} />)}
          {hoverTime !== null && !drag && <>
            <line x1={scales.x(hoverTime)} x2={scales.x(hoverTime)} y1={0} y2={plotHeight} className={styles.hoverLine} />
            {chartData.series.map((entry) => <circle key={entry.key} cx={scales.x(hoverTime)} cy={scales.y(scoreAtTime(entry.points, hoverTime))}
              r={3.5} fill={entry.color} className={styles.hoverPoint} />)}
          </>}
          {drag && <rect x={Math.min(drag.startX, drag.endX)} width={Math.abs(drag.endX - drag.startX)} height={plotHeight} className={styles.zoomSelection} />}
        </g>
        <rect width={plotWidth} height={plotHeight} fill="transparent" className={styles.interactionArea}
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
          onPointerCancel={() => { setDrag(null); setHoverX(null); }}
          onDoubleClick={(event) => { event.preventDefault(); resetZoom(); }} />
      </g>
    </svg>}
    {hasSeries && hoverTime !== null && !drag && <div className={styles.tooltip} role="tooltip"
      style={{ left: tooltipLeft(PLOT.left + scales.x(hoverTime), PLOT.left, VIEW_WIDTH - PLOT.right, TOOLTIP_WIDTH), top: PLOT.top + 12, width: TOOLTIP_WIDTH }}>
      <p className={styles.tooltipTime}>{formatTime(hoverTime, showSeconds)} KST</p>
      {chartData.series.map((entry) => <p key={entry.key} className={styles.tooltipRow}>
        <span className={styles.tooltipKey} style={{ backgroundColor: entry.color }} aria-hidden="true" />
        <span className={styles.tooltipName} title={entry.name}>{entry.name}</span>
        <strong className={styles.tooltipScore}>{formatScore(scoreAtTime(entry.points, hoverTime))}</strong>
      </p>)}
    </div>}
    {!hasSeries && <p className={styles.state}>{STATUS_MESSAGE[status] ?? "아직 기록된 점수가 없습니다"}</p>}
  </div>;
}
