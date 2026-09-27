import { useEffect } from "react";

export default function AdminPagination({ page, totalCount, size = 50, onChange, disabled = false }) {
  const pageCount = Math.max(1, Math.ceil((totalCount ?? 0) / size));
  useEffect(() => {
    if (!disabled && Number.isFinite(totalCount) && page > pageCount) onChange(pageCount);
  }, [disabled, totalCount, page, pageCount, onChange]);
  return <nav aria-label="목록 페이지" className="my-3 flex flex-wrap items-center justify-end gap-3 text-sm">
    <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} className="rounded border border-admin-divider px-3 py-1 disabled:opacity-40">이전</button>
    <span>{page} / {pageCount} (총 {totalCount ?? "-"}건)</span>
    <button type="button" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)} className="rounded border border-admin-divider px-3 py-1 disabled:opacity-40">다음</button>
  </nav>;
}
