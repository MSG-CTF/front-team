import { formatBoardLineScore, getBoardLineEarnedScore, getBoardLineScoreTotals, getBoardLineStatus } from "../utils/boardLines.js";
import styles from "./BoardScreen.module.css";

export default function BoardLineSummary({ lines, selectedLineId, onSelectLine, isOpen = false, onToggle, summaryRef, isPreview = false }) {
  const selected = lines.find((line) => line.lineId === selectedLineId) ?? lines[0];
  if (!selected) return null;
  const totals = getBoardLineScoreTotals(lines);
  const rewardLabel = isPreview ? "시안 배점" : "독점 배점";
  const earnedLabel = isPreview ? "시안 획득" : "획득 점수";
  const rewardText = (line) => formatBoardLineScore(line.rewardScore) ?? "미정";
  const earnedText = (line) => formatBoardLineScore(getBoardLineEarnedScore(line)) ?? "확인 중";
  return (
    <details id="board-line-progress" className={styles.lineSummary} open={isOpen}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}>
      <summary ref={summaryRef}>라인 점수 <span>독점 {lines.filter((line) => line.isCompleted).length}/{lines.length}</span></summary>
      {isPreview && <p className={styles.linePreviewNote}>시안 배점 · 실제 총점 반영 없음</p>}
      <div className={styles.lineScoreColumns} aria-hidden="true"><span>라인</span><span>배점</span><span>획득</span></div>
      <div className={styles.lineScoreTotals} role="group" aria-label="라인 독점 점수 합계">
        <span>합계</span><span data-line-reward-total>{formatBoardLineScore(totals.rewardScore) ?? "미정"}</span>
        <strong data-line-earned-total>{formatBoardLineScore(totals.earnedScore) ?? "확인 중"}</strong>
      </div>
      <ol className={styles.lineList}>
        {lines.map((line) => <li key={line.lineId}>
          <button type="button" onClick={() => onSelectLine(line.lineId)} aria-pressed={selected.lineId === line.lineId}
            aria-label={`${line.label}, ${getBoardLineStatus(line)}, ${rewardLabel} ${rewardText(line)}, ${earnedLabel} ${earnedText(line)}, 해당 칸 보기`}
            className={line.isCompleted ? styles.completedLineRow : undefined}>
            <span className={styles.lineName}><span>{line.label}</span><small>{getBoardLineStatus(line)}</small></span>
            <span className={styles.lineScore} data-line-reward-score={line.lineId}>{rewardText(line)}</span>
            <span className={styles.lineScore} data-line-earned-score={line.lineId}
              data-score-state={getBoardLineEarnedScore(line) === null ? "pending" : line.isCompleted ? "awarded" : "unearned"}>{earnedText(line)}</span>
          </button>
        </li>)}
      </ol>
      <div className={styles.lineDetail}>
        <h3>{selected.label}</h3>
        <p>{selected.cellIndexes.length}개 중 {selected.solvedCellIndexes.length}개 해결</p>
        <p className={styles.lineCellNumbers}>대상 칸 {selected.cellIndexes.join(" · ")}</p>
        <dl className={styles.lineScoreDetail}>
          <div><dt>{rewardLabel}</dt><dd>{rewardText(selected)}</dd></div>
          <div><dt>{earnedLabel}</dt><dd>{earnedText(selected)}</dd></div>
        </dl>
      </div>
    </details>
  );
}
