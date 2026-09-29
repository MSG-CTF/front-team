import { useEffect, useId, useRef, useState } from "react";
import { getBoardLineBadgePosition, getBoardLineStatus } from "../utils/boardLines.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";
import styles from "./BoardScreen.module.css";

function LineCells({ line, goldId, onSelect, selected }) {
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
  const badge = line.isCompleted ? getBoardLineBadgePosition(line.cellIndexes) : null;
  const label = `${line.label}, ${getBoardLineStatus(line)}, 상세 보기`;
  return (
    <g data-line-id={line.lineId} data-completed={line.isCompleted} data-selected={selected}>
      <title>{`${line.label}, ${getBoardLineStatus(line)}`}</title>
      <defs>
        {cells.map(({ cellIndex, facePath }) => <clipPath key={cellIndex} id={`${clipPrefix}-${cellIndex}`} clipPathUnits="userSpaceOnUse"><path d={facePath} /></clipPath>)}
      </defs>
      {cells.map(({ cellIndex, facePath }) => <g key={cellIndex} clipPath={`url(#${clipPrefix}-${cellIndex})`}
        data-line-cell={cellIndex} data-solved={solved.has(cellIndex)} className={styles.lineCell}>
        {selected && <path d={facePath} fill={`url(#${goldId})`} className={styles.lineCellSelected} />}
        {showFlash && <path d={facePath} fill={`url(#${goldId})`} className={styles.lineClaimFlash} onAnimationEnd={() => setShowFlash(false)} />}
      </g>)}
      {badge && <g transform={`translate(${badge.x} ${badge.y})`} className={styles.lineClaimCrest} data-celebrating={showFlash}
        role="button" tabIndex={0} aria-label={label} aria-controls="board-open-challenges-panel" data-line-badge={line.lineId}
        onClick={() => onSelect(line.lineId)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(line.lineId); } }}>
        <title>{label}</title>
        <image href="/assets/board/line-complete-crest-v1.png" x="-110" y="-55" width="220" height="110" className={styles.lineCrestArtwork} />
        <text textAnchor="middle" y="73" className={styles.lineCrestCaption}>라인 독점</text>
      </g>}
    </g>
  );
}

export default function BoardLineOverlay({ lines = [], selectedLineId, onSelectLine }) {
  const id = useId().replace(/:/g, "");
  if (lines.length === 0) return null;
  return (
    <svg viewBox="0 0 1772 1330" preserveAspectRatio="xMidYMid meet" className={styles.lineOverlay} role="group" aria-label="라인 완성 현황">
      <defs>
        <radialGradient id={`line-gold-${id}`} cx="45%" cy="42%" r="70%">
          <stop stopColor="#e6c18a" stopOpacity="0.65" /><stop offset="0.55" stopColor="#d9a64e" stopOpacity="0.35" /><stop offset="1" stopColor="#a36c2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {lines.map((line) => <LineCells key={line.lineId} line={line} goldId={`line-gold-${id}`}
        onSelect={onSelectLine} selected={line.lineId === selectedLineId} />)}
    </svg>
  );
}
