import { useEffect, useRef } from "react";
import { BOARD_GEM_RAIL_PALETTES } from "../utils/boardGemRail.js";
import { formatBoardLineScore, getBoardLineAccentMap, getBoardLineCounts, getBoardLineEarnedScore, getBoardLineScoreTotals, getBoardLineStatus } from "../utils/boardLines.js";
import styles from "./BoardScreen.module.css";

// 열린 문제 패널의 라인 독점 탭
// 줄 모양은 문제 탭과 같다: 번호 도장(보드 독점 띠와 같은 보석색), 라인 이름, 아랫줄에 대상 칸 번호, 오른쪽에 진행
// 푼 칸 번호만 진하게 써서 어느 칸이 남았는지 읽히게 하고, 배점과 획득 점수는 값이 있을 때만 쓴다
function lineBadge(line) {
  if (line.isCompleted) return { tone: "won", text: "독점 완료" };
  if (line.payoutStatus === "unknown" && line.allProblemsCleared) return { tone: "done", text: "풀이 완료" };
  if (line.awaitingConfirmation) return { tone: "wait", text: "확인 중" };
  return { tone: "count", text: `${line.solvedCellIndexes.length}/${line.cellIndexes.length}` };
}

export default function BoardLineSummary({ lines, selectedLineId, isPreview = false }) {
  const list = useRef(null);
  // 보드에서 라인을 눌러 열었으면 그 라인이 보이게 내린다
  useEffect(() => {
    list.current?.querySelector("[data-selected='true']")?.scrollIntoView?.({ block: "nearest" });
  }, [selectedLineId]);
  if (!lines?.length) return null;
  const counts = getBoardLineCounts(lines);
  const totals = getBoardLineScoreTotals(lines);
  const accents = getBoardLineAccentMap(lines);
  const gemStyle = (line) => {
    const palette = BOARD_GEM_RAIL_PALETTES.find((item) => item.mid === accents.get(line.lineId)) ?? BOARD_GEM_RAIL_PALETTES[0];
    return { "--gem-light": palette.light, "--gem-mid": palette.mid, "--gem-dark": palette.dark, "--line-accent": palette.mid };
  };
  const rewardLabel = isPreview ? "시안 배점" : "독점 배점";
  const earnedLabel = isPreview ? "시안 획득" : "획득 점수";
  const rewardText = (line) => formatBoardLineScore(line.rewardScore) ?? "미정";
  const earnedText = (line) => formatBoardLineScore(getBoardLineEarnedScore(line)) ?? "확인 중";
  const earnedTotal = counts.payoutUnknown ? null : formatBoardLineScore(totals.earnedScore);
  const rewardTotal = formatBoardLineScore(totals.rewardScore);
  return (
    <div id="board-line-progress" className={styles.lineSummary}>
      <dl className={styles.lineStats}>
        <div>
          <dt>{counts.payoutUnknown ? "풀이 완료 라인" : "독점한 라인"}</dt>
          <dd>{counts.done}<small>{`/${counts.total}`}</small></dd>
        </div>
        <div>
          <dt>{earnedLabel}</dt>
          <dd data-line-earned-total data-pending={earnedTotal === null ? "true" : undefined}>
            {earnedTotal ?? (counts.payoutUnknown ? "지급 미확인" : "확인 중")}
          </dd>
        </div>
      </dl>
      {rewardTotal !== null && <p className={styles.lineCaption}>{`${rewardLabel} 합계 `}<span data-line-reward-total>{rewardTotal}</span></p>}
      {isPreview && <p className={styles.linePreviewNote}>시안 배점 · 실제 총점 반영 없음</p>}
      <ol className={styles.lineList} ref={list}>
        {lines.map((line, index) => {
          const badge = lineBadge(line);
          const solved = new Set(line.solvedCellIndexes);
          const reward = formatBoardLineScore(line.rewardScore);
          const earned = line.isCompleted ? formatBoardLineScore(getBoardLineEarnedScore(line)) : null;
          return (
            <li key={line.lineId} data-line-row={line.lineId} data-selected={line.lineId === selectedLineId ? "true" : undefined} style={gemStyle(line)}>
              <span className="sr-only">{`${line.label}, ${getBoardLineStatus(line)}, 대상 칸 ${line.cellIndexes.join(", ")}, ${rewardLabel} ${rewardText(line)}, ${earnedLabel} ${earnedText(line)}`}</span>
              <div className={styles.lineRow} aria-hidden="true">
                <span className={styles.lineSeal}>{line.lineNumber ?? index + 1}</span>
                <span className={styles.lineText}>
                  <strong className={styles.lineName}>{line.label}</strong>
                  <span className={styles.lineCells}>
                    칸 {line.cellIndexes.map((cellIndex) => <span key={cellIndex} data-solved={solved.has(cellIndex) ? "true" : undefined}>{cellIndex}</span>)}
                  </span>
                  {(reward !== null || earned !== null) && <span className={styles.lineScores}>
                    {reward !== null && <span data-line-reward-score={line.lineId}>{`${isPreview ? "시안 배점" : "배점"} ${reward}`}</span>}
                    {earned !== null && <span data-line-earned-score={line.lineId}>{`${isPreview ? "시안 획득" : "획득"} ${earned}`}</span>}
                  </span>}
                </span>
                <span className={styles.lineBadge} data-tone={badge.tone}>{badge.text}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {counts.payoutUnknown && <p className={styles.lineNote}>운영진이 지급을 확인하면 독점 점수가 표시됩니다</p>}
    </div>
  );
}
