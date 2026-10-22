import { useEffect } from "react";
import { Glyph } from "./AdminGlyph.jsx";
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

// 카드 머리에 붙는 작은 쪽 넘김: 목록 높이를 고정하고 싶은 곳에 쓴다
export function AdminMiniPager({ page, pageCount, onChange, label, disabled = false }) {
  if (pageCount <= 1) return null;
  return <nav aria-label={label} className={styles.miniPager}>
    <button type="button" aria-label="앞 쪽" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
      <Glyph name="chevronRight" size={13} strokeWidth={2.4} className={styles.miniPagerBack} /></button>
    <span><strong>{page}</strong> / {pageCount}</span>
    <button type="button" aria-label="다음 쪽" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)}>
      <Glyph name="chevronRight" size={13} strokeWidth={2.4} /></button>
  </nav>;
}
