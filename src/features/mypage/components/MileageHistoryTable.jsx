import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScreen.module.css";

function statusLabel(status) {
  if (status === "loading") return "LOADING...";
  if (status === "error") return "MILEAGE DATA UNAVAILABLE";
  if (status === "empty") return "NO MILEAGE HISTORY";
  return null;
}

export default function MileageHistoryTable({ panelSrc, state }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((state.data?.length || 0) / 3));
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];
  return (
    <section
      className={styles.mileageHistoryTable}
      aria-label="마일리지 내역"
      style={{ borderImageSource: "url(" + panelSrc + ")" }}
    >
      <h2 className={styles.historyHeading}>MILEAGE HISTORY</h2>
      <div className={styles.historyScroll} tabIndex={0} aria-label="기록 표">
        <table className={styles.historyTable}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "42%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">DATE</th>
              <th scope="col">REASON</th>
              <th scope="col" className={styles.numericCell}>
                CHANGE
              </th>
              <th scope="col" className={styles.numericCell}>
                BALANCE
              </th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={4} className={styles.historyEmpty}>
                  {message}
                </td>
              </tr>
            ) : (
              rows.slice((page - 1) * 3, page * 3).map((row) => (
                <tr key={row.id}>
                  <td className={styles.historyDate}>{row.date}</td>
                  <td title={row.reason}>{row.reason}</td>
                  <td className={styles.historyChange}>{row.change}</td>
                  <td className={styles.numericCell}>{row.balance}</td>
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
          label="마일리지 기록 페이지"
        />
      </div>
    </section>
  );
}
