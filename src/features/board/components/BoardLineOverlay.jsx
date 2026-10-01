import { useEffect, useId, useRef, useState } from "react";
import { BOARD_LINE_SCORE_UNIT, formatBoardLineScore, formatBoardLineScoreValue, getBoardLineAccent, getBoardLineTileLabelPosition, getBoardLineEarnedScore, getBoardLineStatus } from "../utils/boardLines.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";
import { BOARD_CELL_COUNT } from "../utils/boardData.js";
import styles from "./BoardScreen.module.css";

function LineCells({ line, goldId, shadeId, onSelect, selected, isInteractive }) {
  const clipPrefix = `line-face-${useId().replace(/:/g, "")}`;
  const previousComplete = useRef(line.isCompleted);
  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    let clearFlash;
    if (!previousComplete.current && line.isCompleted) {
      setShowFlash(true);
      // 모션 줄이기 설정에서 animationend가 없어도 임시 상태는 정리한다
      clearFlash = window.setTimeout(() => setShowFlash(false), 850);
    }
    if (!line.isCompleted) setShowFlash(false);
    previousComplete.current = line.isCompleted;
    return () => { if (clearFlash != null) window.clearTimeout(clearFlash); };
  }, [line.isCompleted]);
  const solved = new Set(line.solvedCellIndexes);
  const cells = line.cellIndexes.map((cellIndex) => ({ cellIndex, facePath: getBoardCellMaskPath(cellIndex) }));
  const earnedScore = line.isCompleted ? getBoardLineEarnedScore(line) : null;
  const score = formatBoardLineScore(earnedScore);
  // 방문, 부분 풀이, 완료 확인 대기에는 점수를 올리지 않는다 실제 지급값만 표시한다
  const region = score !== null ? getBoardLineTileLabelPosition(line.cellIndexes) : null;
  const canInspect = region !== null && isInteractive;
  const scoreValue = formatBoardLineScoreValue(earnedScore) ?? "";
  // 단위 세 글자와 숫자 사이 여백까지 포함해 칸 안에 맞춘다
  const characterWidth = Array.from(scoreValue).reduce((width, character) => width + (/[0-9,.e+-]/.test(character) ? 0.6 : character === " " ? 0.3 : 1), 1.05);
  const scoreFontSize = region ? Math.min(region.height * 0.62, (region.width - 10) / characterWidth) : 0;
  const platePath = region ? `M${-region.width / 2 + 7} ${-region.height / 2} H${region.width / 2 - 7} L${region.width / 2} ${-region.height / 2 + 7} V${region.height / 2 - 7} L${region.width / 2 - 7} ${region.height / 2} H${-region.width / 2 + 7} L${-region.width / 2} ${region.height / 2 - 7} V${-region.height / 2 + 7} Z` : null;
  const label = `${line.label}, ${getBoardLineStatus(line)}${canInspect ? ", 상세 보기" : ""}, 획득 ${score}`;
  return (
    <g data-line-id={line.lineId} data-completed={line.isCompleted} data-selected={selected} style={{ "--line-accent": getBoardLineAccent(line.lineId) }}>
      <title>{`${line.label}, ${getBoardLineStatus(line)}`}</title>
      <defs>
        {cells.map(({ cellIndex, facePath }) => <clipPath key={cellIndex} id={`${clipPrefix}-${cellIndex}`} clipPathUnits="userSpaceOnUse"><path d={facePath} /></clipPath>)}
      </defs>
      {cells.map(({ cellIndex, facePath }) => <g key={cellIndex} clipPath={`url(#${clipPrefix}-${cellIndex})`}
        data-line-cell={cellIndex} data-solved={solved.has(cellIndex)} className={styles.lineCell}>
        {selected && <path d={facePath} fill={`url(#${goldId})`} className={styles.lineCellSelected} />}
        {showFlash && <path d={facePath} fill={`url(#${goldId})`} className={styles.lineClaimFlash} onAnimationEnd={() => setShowFlash(false)} />}
        {solved.has(cellIndex) && <path d={facePath} className={styles.lineCellOutline} data-line-outline={cellIndex}
          data-outline-state={line.isCompleted ? "claimed" : "solved"}
          fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
        {line.isCompleted && <path d={facePath} className={styles.lineCellFinish} data-line-finish={cellIndex}
          fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
      </g>)}
      {region && <g clipPath={`url(#${clipPrefix}-${region.cellIndex})`}
        className={`${styles.lineRegion} ${canInspect ? styles.lineClaimCrest : ""}`}
        style={{ "--line-score-font-size": `${scoreFontSize}px` }}
        data-line-region={line.lineId} data-region-state="claimed"
        data-line-anchor-cell={region.cellIndex} data-celebrating={showFlash} role={canInspect ? "button" : undefined} tabIndex={canInspect ? 0 : undefined}
        aria-label={label} aria-controls={canInspect ? "board-open-challenges-panel" : undefined}
        data-line-badge={line.isCompleted ? line.lineId : undefined}
        onClick={canInspect ? () => onSelect?.(line.lineId) : undefined}
        onKeyDown={canInspect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(line.lineId); } } : undefined}>
        <title>{label}</title>
        <desc data-line-region-name={line.lineId}>획득</desc>
        <g transform={`translate(${region.x} ${region.y}) rotate(${region.rotation})`}>
          <path d={platePath} className={styles.lineScoreShade} fill={`url(#${shadeId})`} aria-hidden="true" />
          <text dominantBaseline="central" textAnchor="middle" className={styles.lineRegionScore} data-line-region-caption={line.lineId} data-line-region-score={line.lineId}>{scoreValue}<tspan dx="0.18em" className={styles.lineScoreUnit}>{BOARD_LINE_SCORE_UNIT}</tspan></text>
          {canInspect && <path d={platePath} fill="transparent" className={styles.lineRegionHitArea} data-line-region-hit={line.lineId} aria-hidden="true" />}
        </g>
      </g>}
    </g>
  );
}

export default function BoardLineOverlay({ lines = [], solvedCellIndexes = [], spentSpecialCells = [], selectedLineId, onSelectLine, isInteractive = true }) {
  const id = useId().replace(/:/g, "");
  const specialCells = [...new Map((Array.isArray(spentSpecialCells) ? spentSpecialCells : [])
    .filter((cell) => cell && ["CHANCE", "ROULETTE"].includes(cell.type) &&
      Number.isInteger(cell.cellIndex) && cell.cellIndex >= 1 && cell.cellIndex <= BOARD_CELL_COUNT)
    .map((cell) => [cell.cellIndex, cell])).values()];
  const specialIndexes = new Set(specialCells.map((cell) => cell.cellIndex));
  const challengeLines = lines.filter((line) => !line.cellIndexes.some((index) => specialIndexes.has(index)));
  const groupedCells = new Set(challengeLines.flatMap((line) => line.cellIndexes));
  const standaloneSolves = [...new Set((Array.isArray(solvedCellIndexes) ? solvedCellIndexes : [])
    .filter((cellIndex) => Number.isInteger(cellIndex) && cellIndex >= 1 && cellIndex <= BOARD_CELL_COUNT &&
      !groupedCells.has(cellIndex) && !specialIndexes.has(cellIndex)))];
  if (challengeLines.length === 0 && standaloneSolves.length === 0 && specialCells.length === 0) return null;
  return (
    <svg viewBox="0 0 1772 1330" preserveAspectRatio="xMidYMid meet" className={styles.lineOverlay} role="group" aria-label="문제 풀이, 특수칸 소모 및 라인 완성 현황">
      <defs>
        <radialGradient id={`line-score-shade-${id}`} cx="50%" cy="50%" r="60%">
          <stop stopColor="#1b1008" stopOpacity="0.85" /><stop offset="0.5" stopColor="#1b1008" stopOpacity="0.65" /><stop offset="1" stopColor="#1b1008" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`line-gold-${id}`} cx="45%" cy="42%" r="70%">
          <stop stopColor="#e6c18a" stopOpacity="0.65" /><stop offset="0.55" stopColor="#d9a64e" stopOpacity="0.35" /><stop offset="1" stopColor="#a36c2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {specialCells.length > 0 && <g className={styles.spentSpecialCells} aria-label="소모된 룰렛·카드 칸">
        <defs>{specialCells.map(({ cellIndex }) => <clipPath key={cellIndex} id={`spent-face-${id}-${cellIndex}`} clipPathUnits="userSpaceOnUse">
          <path d={getBoardCellMaskPath(cellIndex)} />
        </clipPath>)}</defs>
        {specialCells.map(({ cellIndex, type }) => <g key={cellIndex} data-spent-special-cell={cellIndex} clipPath={`url(#spent-face-${id}-${cellIndex})`}>
          <title>{`${cellIndex}번 칸, ${type === "CHANCE" ? "카드" : "룰렛"} 칸 소모됨`}</title>
          <path d={getBoardCellMaskPath(cellIndex)} className={styles.lineCellOutline} data-event-outline={cellIndex} data-event-type={type}
            data-outline-state="spent" fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>)}
      </g>}
      {standaloneSolves.length > 0 && <g className={styles.solvedCells} aria-label="풀이 완료 칸">
        <defs>{standaloneSolves.map((cellIndex) => <clipPath key={cellIndex} id={`solved-face-${id}-${cellIndex}`} clipPathUnits="userSpaceOnUse">
          <path d={getBoardCellMaskPath(cellIndex)} />
        </clipPath>)}</defs>
        {standaloneSolves.map((cellIndex) => <g key={cellIndex} data-solved-cell={cellIndex} clipPath={`url(#solved-face-${id}-${cellIndex})`}>
          <title>{`${cellIndex}번 칸, 풀이 완료`}</title>
          <path d={getBoardCellMaskPath(cellIndex)} className={styles.lineCellOutline} data-line-outline={cellIndex} data-outline-state="solved"
            fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>)}
      </g>}
      {challengeLines.map((line) => <LineCells key={line.lineId} line={line} goldId={`line-gold-${id}`} shadeId={`line-score-shade-${id}`}
        onSelect={onSelectLine} selected={line.lineId === selectedLineId} isInteractive={isInteractive} />)}
    </svg>
  );
}
