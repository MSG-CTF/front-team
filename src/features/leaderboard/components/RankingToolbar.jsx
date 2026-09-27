import { toKst } from "../../../utils/time.js";
import { rankingPageWindow } from "../utils/leaderboardViewport.js";
import styles from "./LeaderboardScreen.module.css";

export default function RankingToolbar({ page, pageCount, onPageChange, refreshing, updatedAt, onRefresh }) {
  return <div className={styles.rankingToolbar}>
    <span className={styles.rankingTitle}>TEAM RANKING</span>
    <nav className={styles.pagination} aria-label="순위 페이지">
      {pageCount > 5 && <button type="button" onClick={() => onPageChange(1)} disabled={refreshing || page === 1} aria-label="첫 페이지">«</button>}
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={refreshing || page <= 1} aria-label="이전 순위 페이지">‹ 이전</button>
      {rankingPageWindow(page, pageCount).map((number) => <button type="button" key={number}
        aria-label={number + "페이지"} aria-current={number === page ? "page" : undefined}
        disabled={refreshing} onClick={() => onPageChange(number)}>{number}</button>)}
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={refreshing || page >= pageCount} aria-label="다음 순위 페이지">다음 ›</button>
      {pageCount > 5 && <button type="button" onClick={() => onPageChange(pageCount)} disabled={refreshing || page === pageCount} aria-label="마지막 페이지">»</button>}
      <span className={styles.pageTotal}>/ {pageCount}</span>
    </nav>
    <div className={styles.refreshControls}>
      {updatedAt && <time dateTime={updatedAt}>{toKst(updatedAt, { hour: "2-digit", minute: "2-digit", hour12: false })} KST</time>}
      <button type="button" disabled={refreshing} onClick={onRefresh} aria-label="순위 새로고침" title="30초마다 자동 갱신">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 1 0 .4 7M20 3v5h-5" /></svg>
        <span>새로고침</span>
      </button>
    </div>
  </div>;
}
