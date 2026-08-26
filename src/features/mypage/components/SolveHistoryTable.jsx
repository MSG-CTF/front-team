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
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];

  return (
    <section className={styles.solveHistoryTable} aria-label="문제 풀이 내역">
      <img src={panelSrc} alt="" aria-hidden="true" className={styles.tablePanelImage} />

      {message && <p className={styles.tableStatus}>{message}</p>}

      {rows.slice(0, 3).map((row, index) => {
        const geometry = ROW_GEOMETRY[index];
        return (
          <div key={row.id}>
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
    </section>
  );
}
