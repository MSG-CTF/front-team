import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScene.module.css";

const PAGE_SIZE = 3;

function statusLabel(status) {
  if (status === "loading") return "LOADING...";
  if (status === "error") return "SOLVE DATA UNAVAILABLE";
  if (status === "empty") return "NO SOLVE HISTORY";
  if (status === "unavailable") return "SOLVE HISTORY UNAVAILABLE";
  return null;
}

function rowTitle(row) {
  return `${row.sourceType || "-"} / 제출자 ${row.solver || "팀"} / 마일리지 ${row.earnedMileage ?? "-"} / 추가 주사위 ${row.extraDiceGranted ? "지급" : "미지급"}`;
}

// Figma 309:342 — 열 제목은 패널 그림에 그려져 있어 데스크톱에서는 스크린리더에만 노출한다
export default function SolveHistoryTable({ state }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((state.data?.length || 0) / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];
  return (
    <section className={`${styles.historyPanel} ${styles.solveHistory}`} aria-label="문제 풀이 내역">
      <h2 className={styles.bakedLabel}>SOLVE HISTORY</h2>
      <div className={styles.historyScroll} tabIndex={0} aria-label="풀이 기록 표">
        <table className={styles.historyTable}>
          <colgroup>
            <col style={{ width: "31.33%" }} />
            <col style={{ width: "23.38%" }} />
            <col style={{ width: "10.72%" }} />
            <col style={{ width: "18.3%" }} />
            <col style={{ width: "16.27%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={styles.bakedLabel}>CHALLENGE</th>
              <th scope="col" className={styles.bakedLabel}>CATEGORY</th>
              <th scope="col" className={`${styles.bakedLabel} ${styles.numeric}`}>POINTS</th>
              <th scope="col" className={`${styles.bakedLabel} ${styles.numeric}`}>SOLVED AT</th>
              <th scope="col" className={`${styles.bakedLabel} ${styles.numeric}`}>ELAPSED</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={5} className={styles.historyEmpty}>{message}</td>
              </tr>
            ) : (
              rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => (
                <tr key={row.id} title={rowTitle(row)}>
                  <td className={styles.cellText} title={row.challenge}>{row.challenge}</td>
                  <td className={styles.cellText}>{row.category || "—"}</td>
                  <td className={`${styles.cellNumber} ${styles.cellPoints} ${styles.numeric}`}>{row.points}</td>
                  <td className={`${styles.cellNumber} ${styles.numeric}`}>{row.solvedAt}</td>
                  <td className={`${styles.cellNumber} ${styles.numeric}`}>{row.elapsed || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <HistoryPagination page={page} pageCount={pageCount} onChange={setPage} label="풀이 기록 페이지" />
    </section>
  );
}
