import LeaderboardArtworkSymbol, { RANK_ARTWORK } from "./LeaderboardArtworkSymbol.jsx";
import styles from "./LeaderboardScreen.module.css";

const CATEGORIES = ["MISC", "WEB", "FOR", "REV", "PWN", "CRY", "OSINT", "WEB3"];
const COLUMNS = [
  { key: "rank", label: "Rank", width: 80 },
  { key: "teamName", label: "Team", width: 280 },
  { key: "teamScore", label: "Point", width: 116 },
  { key: "solveCount", label: "Solves", width: 84 },
  ...CATEGORIES.map((label, index) => ({ key: "category" + index, label, width: 90 })),
  { key: "kothScore", label: "KoTH", width: 120 },
  { key: "signatureScore", label: "CLUB", width: 120, title: "동아리 부스 시그니처 점수" },
];
const STATUS = { loading: "순위를 불러오는 중", empty: "아직 등록된 팀이 없습니다", error: "순위를 불러오지 못했습니다" };
const formatValue = (value) => value == null ? "-" : new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);

export default function RankingTable({ rankings, status }) {
  return <div className={styles.tableContainer}>
    <table className={styles.rankingGrid} aria-label="팀 순위표">
      <colgroup>{COLUMNS.map((column) => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
      <thead><tr>{COLUMNS.map((column) => <th key={column.key} scope="col" title={column.title}
        className={column.key === "teamName" ? styles.teamNameCell : undefined}>{column.label}</th>)}</tr></thead>
      <tbody>
        {rankings.slice(0, 6).map((ranking) => <tr key={ranking.key}>
          <td className={styles.rankCell} aria-label={ranking.rank + "위"}>
            {RANK_ARTWORK[ranking.rank]
              ? <LeaderboardArtworkSymbol region={RANK_ARTWORK[ranking.rank]} className={styles.rankArtwork} />
              : ranking.rank}
          </td>
          <th scope="row" className={styles.teamNameCell} title={ranking.teamName}>
            <span className={styles.cellValue} tabIndex={0} aria-label={ranking.teamName}>{ranking.teamName}</span>
          </th>
          {[ranking.teamScore, ranking.solveCount, ...CATEGORIES.map((_, index) => ranking.categoryScores?.[index] ?? null),
            ranking.kothScore ?? ranking.categoryScores?.[8] ?? null, ranking.signatureScore].map((value, index) => <td
            key={COLUMNS[index + 2].key} data-column={COLUMNS[index + 2].key}
            className={index === 0 ? styles.pointCell : undefined}
            title={value == null ? "서버에서 아직 제공하지 않는 값" : formatValue(value)}>
            <span className={styles.cellValue}>{formatValue(value)}</span>
          </td>)}
        </tr>)}
        {!rankings.length && <tr><td colSpan={COLUMNS.length} className={styles.tableState}>{STATUS[status] ?? "아직 등록된 팀이 없습니다"}</td></tr>}
      </tbody>
    </table>
  </div>;
}
