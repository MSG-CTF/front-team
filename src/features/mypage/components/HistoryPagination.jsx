import styles from "./MyPageScreen.module.css";

export default function HistoryPagination({ page, pageCount, onChange, label }) {
  if (pageCount <= 1) return null;
  return <nav className={styles.historyPagination} aria-label={label}>
    <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>이전</button>
    <span>{page} / {pageCount}</span>
    <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>다음</button>
  </nav>;
}
