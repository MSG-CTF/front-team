import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScreen.module.css";

const ROW_GEOMETRY = [
  { dateTop: 119, reasonTop: 118, changeTop: 118, balanceTop: 118, balanceLeft: 1006 },
  { dateTop: 163, reasonTop: 164, changeTop: 164, balanceTop: 164, balanceLeft: 1006 },
  { dateTop: 208, reasonTop: 213, changeTop: 212, balanceTop: 212, balanceLeft: 1004 },
];

function statusLabel(status) {
  if (status === "loading") return "LOADING...";
  if (status === "error") return "MILEAGE DATA UNAVAILABLE";
  if (status === "empty") return "NO MILEAGE HISTORY";
  return null;
}

export default function MileageHistoryTable({ panelSrc, state }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((state.data?.length || 0) / 3));
  useEffect(() => { setPage((current) => Math.min(current, pageCount)); }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];

  return (
    <section className={styles.mileageHistoryTable} aria-label="마일리지 내역">
      <img src={panelSrc} alt="" aria-hidden="true" className={styles.tablePanelImage} />

      {message && <p className={styles.tableStatus}>{message}</p>}

      {rows.slice((page - 1) * 3, page * 3).map((row, index) => {
        const geometry = ROW_GEOMETRY[index];
        return (
          <div key={row.id} title={row.reason}>
            <p
              className={`${styles.tableCell} ${styles.gildaText} ${styles.mileageDate}`}
              style={{ top: `${geometry.dateTop}px` }}
            >
              {row.date}
            </p>
            <p
              className={`${styles.tableCell} ${styles.fellText} ${styles.mileageReason}`}
              style={{ top: `${geometry.reasonTop}px` }}
            >
              {row.reason}
            </p>
            <p
              className={`${styles.tableCell} ${styles.gildaText} ${styles.mileageChange}`}
              style={{ top: `${geometry.changeTop}px` }}
            >
              {row.change}
            </p>
            <p
              className={`${styles.tableCell} ${styles.gildaText} ${styles.mileageBalance}`}
              style={{
                top: `${geometry.balanceTop}px`,
                left: `${geometry.balanceLeft}px`,
              }}
            >
              {row.balance}
            </p>
          </div>
        );
      })}
      <HistoryPagination page={page} pageCount={pageCount} onChange={setPage} label="마일리지 기록 페이지" />
    </section>
  );
}
