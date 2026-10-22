import { useEffect, useState } from "react";
import HistoryPagination from "./HistoryPagination.jsx";
import styles from "./MyPageScene.module.css";

const PAGE_SIZE = 3;

function statusLabel(status) {
  if (status === "loading") return "LOADING...";
  if (status === "error") return "MILEAGE DATA UNAVAILABLE";
  if (status === "empty") return "NO MILEAGE HISTORY";
  return null;
}

// Figma 309:314 — 열 제목은 패널 그림에 그려져 있어 데스크톱에서는 스크린리더에만 노출한다
export default function MileageHistoryTable({ state }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil((state.data?.length || 0) / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);
  const message = statusLabel(state.status);
  const rows = state.status === "success" ? state.data : [];
  return (
    <section className={`${styles.historyPanel} ${styles.mileageHistory}`} aria-label="마일리지 내역">
      <h2 className={styles.bakedLabel}>MILEAGE HISTORY</h2>
      <div className={styles.historyScroll} tabIndex={0} aria-label="마일리지 기록 표">
        <table className={styles.historyTable}>
          {/* 열 경계는 패널 그림의 DATE·REASON·CHANGE 시작선과 BALANCE 끝선에 맞춘 비율 */}
          <colgroup>
            <col style={{ width: "27.844%" }} />
            <col style={{ width: "47.569%" }} />
            <col style={{ width: "12.661%" }} />
            <col style={{ width: "11.926%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={styles.bakedLabel}>DATE</th>
              <th scope="col" className={styles.bakedLabel}>REASON</th>
              <th scope="col" className={styles.bakedLabel}>CHANGE</th>
              <th scope="col" className={`${styles.bakedLabel} ${styles.numeric}`}>BALANCE</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={4} className={styles.historyEmpty}><span>{message}</span></td>
              </tr>
            ) : (
              rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => (
                <tr key={row.id}>
                  <td className={styles.cellNumber}>{row.date}</td>
                  <td className={styles.cellText} title={row.reason}>{row.reason}</td>
                  <td className={`${styles.cellNumber} ${styles.cellMinus}`}>{row.change}</td>
                  <td className={`${styles.cellNumber} ${styles.numeric}${row.balance && row.balance !== "-" ? "" : ` ${styles.cellBlank}`}`}>{row.balance}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <HistoryPagination page={page} pageCount={pageCount} onChange={setPage} label="마일리지 기록 페이지" />
    </section>
  );
}
