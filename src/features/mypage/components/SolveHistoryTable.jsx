import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScreen.module.css";

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
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];
  return (
    <section
      className={styles.solveHistoryTable}
      aria-label="문제 풀이 내역"
      style={{ borderImageSource: "url(" + panelSrc + ")" }}
    >
      <h2 className={styles.historyHeading}>SOLVE HISTORY</h2>
      <div className={styles.historyScroll} tabIndex={0} aria-label="기록 표">
        <table className={styles.historyTable}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">CHALLENGE</th>
              <th scope="col">CATEGORY</th>
              <th scope="col" className={styles.numericCell}>
                POINTS
              </th>
              <th scope="col" className={styles.numericCell}>
                SOLVED AT
              </th>
              <th scope="col" className={styles.numericCell}>
                ELAPSED
              </th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={5} className={styles.historyEmpty}>
                  {message}
                </td>
              </tr>
            ) : (
              rows.slice((page - 1) * 3, page * 3).map((row) => (
                <tr
                  key={row.id}
                  title={
                    (row.sourceType || "-") +
                    " / 제출자 " +
                    (row.solver || "팀") +
                    " / 마일리지 " +
                    (row.earnedMileage ?? "-") +
                    " / 추가 주사위 " +
                    (row.extraDiceGranted ? "지급" : "미지급")
                  }
                >
                  <td title={row.challenge}>{row.challenge}</td>
                  <td>{row.category || "—"}</td>
                  <td className={styles.historyPoints}>{row.points}</td>
                  <td className={styles.historyDate + " " + styles.numericCell}>
                    {row.solvedAt}
                  </td>
                  <td className={styles.numericCell}>{row.elapsed || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.historyFooter}>
        <HistoryPagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          label="풀이 기록 페이지"
        />
      </div>
    </section>
  );
}
