import { useEffect } from "react";
import styles from "./AdminWorkspace.module.css";

export default function AdminPagination({ page, totalCount, size = 50, onChange, disabled = false }) {
  const pageCount = Math.max(1, Math.ceil((totalCount ?? 0) / size));
  useEffect(() => {
    if (!disabled && Number.isFinite(totalCount) && page > pageCount) onChange(pageCount);
  }, [disabled, totalCount, page, pageCount, onChange]);
  return <nav aria-label="목록 페이지" className={styles.pagination}>
    <span>총 <strong>{totalCount ?? "-"}</strong>건</span>
    <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} className={`${styles.button} ${styles.small}`}>이전</button>
    <span><strong>{page}</strong> / {pageCount}</span>
    <button type="button" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)} className={`${styles.button} ${styles.small}`}>다음</button>
  </nav>;
}
