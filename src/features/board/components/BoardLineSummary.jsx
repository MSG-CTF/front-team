import { getBoardLineStatus } from "../utils/boardLines.js";
import styles from "./BoardScreen.module.css";

export default function BoardLineSummary({ lines, selectedLineId, onSelectLine, isOpen = false, onToggle, summaryRef, isPreview = false }) {
  const selected = lines.find((line) => line.lineId === selectedLineId) ?? lines[0];
  if (!selected) return null;
  return (
    <details id="board-line-progress" className={styles.lineSummary} open={isOpen}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}>
      <summary ref={summaryRef}>라인 완성 <span>{lines.filter((line) => line.isCompleted).length}/{lines.length}</span></summary>
      <p className={styles.lineSummaryLead}>라인을 선택하면 해당 칸이 보입니다</p>
      <ol className={styles.lineList}>
        {lines.map((line) => <li key={line.lineId}>
          <button type="button" onClick={() => onSelectLine(line.lineId)} aria-pressed={selected.lineId === line.lineId}
            className={line.isCompleted ? styles.completedLineRow : undefined}>
            <span>{line.label}</span><span>{getBoardLineStatus(line)}</span>
          </button>
        </li>)}
      </ol>
      <div className={styles.lineDetail}>
        <h3>{selected.label}</h3>
        <p>{selected.cellIndexes.length}개 중 {selected.solvedCellIndexes.length}개 해결</p>
        <p className={styles.lineCellNumbers}>대상 칸 {selected.cellIndexes.join(" · ")}</p>
        {selected.isCompleted && !isPreview && <p>{selected.bonusScore == null ? "보너스 지급 정보 확인 중" : `지급된 보너스 ${selected.bonusScore.toLocaleString("ko-KR")}점`}</p>}
      </div>
      {isPreview && <p className={styles.linePreviewNote}>화면 시안 · 라인 구성과 보너스는 확정 전<br />실제 점수에는 반영되지 않습니다</p>}
    </details>
  );
}
