import styles from "./MyPageScene.module.css";

export default function HistoryPagination({ page, pageCount, onChange, label }) {
  if (pageCount <= 1) return null;
  return (
    <nav className={styles.historyPagination} aria-label={label}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m14 6-6 6 6 6" />
        </svg>
      </button>
      <span className={styles.pageIndicator} aria-live="polite" aria-atomic="true">
        <strong>{page}</strong> / {pageCount}
      </span>
      <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="다음 페이지">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m10 6 6 6-6 6" />
        </svg>
      </button>
    </nav>
  );
}
