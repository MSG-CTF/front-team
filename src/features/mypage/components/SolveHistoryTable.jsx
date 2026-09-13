import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScreen.module.css";

const ROW_GEOMETRY = [
  { textTop: 116, solvedTop: 116, pointsTop: 116 },
  { textTop: 162, solvedTop: 163, pointsTop: 162 },
  { textTop: 211, solvedTop: 210, pointsTop: 208 },
];

function statusLabel(status) {
  if (status === "loading") return "LOADING...";
  if (status === "error") return "SOLVE DATA UNAVAILABLE";
  if (status === "empty") return "NO SOLVE HISTORY";
  if (status === "unavailable") return "SOLVE HISTORY UNAVAILABLE";
  return null;
}

export default function SolveHistoryTable({ panelSrc, state }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((state.data?.length || 0) / 3));
  useEffect(() => { setPage((current) => Math.min(current, pageCount)); }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];

  return (
    <section className={styles.solveHistoryTable} aria-label="문제 풀이 내역">
      <img src={panelSrc} alt="" aria-hidden="true" className={styles.tablePanelImage} />

      {message && <p className={styles.tableStatus}>{message}</p>}

      {rows.slice((page - 1) * 3, page * 3).map((row, index) => {
        const geometry = ROW_GEOMETRY[index];
        return (
          <div key={row.id} title={`${row.sourceType || "-"} / 제출자 ${row.solver || "팀"} / 마일리지 ${row.earnedMileage ?? "-"} / 추가 주사위 ${row.extraDiceGranted ? "지급" : "미지급"}`}>
            <p
              className={`${styles.tableCell} ${styles.fellText} ${styles.solveChallenge}`}
              style={{ top: `${geometry.textTop}px` }}
            >
              {row.challenge}
            </p>
            <p
              className={`${styles.tableCell} ${styles.fellText} ${styles.solveCategory}`}
              style={{ top: `${geometry.textTop}px` }}
            >
              {row.category || "—"}
            </p>
            <p
              className={`${styles.tableCell} ${styles.gildaText} ${styles.solvePoints}`}
              style={{ top: `${geometry.pointsTop}px` }}
            >
              {row.points}
            </p>
            <p
              className={`${styles.tableCell} ${styles.gildaText} ${styles.solveTime}`}
              style={{ top: `${geometry.solvedTop}px` }}
            >
              {row.solvedAt}
            </p>
            {row.elapsed && (
              <p
                className={`${styles.tableCell} ${styles.gildaText} ${styles.solveElapsed}`}
                style={{ top: `${geometry.solvedTop}px` }}
              >
                {row.elapsed}
              </p>
            )}
          </div>
        );
      })}
      <HistoryPagination page={page} pageCount={pageCount} onChange={setPage} label="풀이 기록 페이지" />
    </section>
  );
}
