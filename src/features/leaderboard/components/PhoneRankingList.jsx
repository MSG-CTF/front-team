import SkeletonBar from "../../../components/common/SkeletonBar.jsx";
import { toKst } from "../../../utils/time.js";
import styles from "./PhoneRankingList.module.css";

// 폰 순위 목록: PC 표의 종이·줄선·글꼴을 그대로 쓰되 열을 늘어놓지 않고 팀마다 한 줄로 둔다
// 한 줄은 순위·팀·총점, 그 아래 푼 문제 수와 마지막 득점 시각 줄을 누르면 점수 구성과 분야별 점수가 펼쳐진다
// PC·태블릿에서는 숨기고 표를 쓴다
const CATEGORIES = ["MISC", "WEB", "FOR", "REV", "PWN", "CRY", "OSINT", "WEB3"];
// 펼친 칸은 PC 표의 열 순서 그대로 분야 여덟 칸 다음에 KoTH·CLUB·LINE
const OTHER_SOURCES = ["KoTH", "CLUB", "LINE"];
const PENDING_WIDTHS = ["64%", "48%", "58%", "42%", "54%", "46%"];
const formatValue = (value) => value == null ? "-" : new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);

// PC 순위표 그림의 1~3위 월계관을 폰에서도 흐리지 않게 선으로 다시 그린다 (금·은·적동, 가운데 순위 숫자)
const LAUREL_LEAVES = Array.from({ length: 6 }, (_, index) => {
  const turn = (32 + index * 22) * Math.PI / 180;
  const x = 22 - 14 * Math.sin(turn);
  const y = 19 + 14 * Math.cos(turn);
  const along = Math.atan2(-Math.sin(turn), -Math.cos(turn)) * 180 / Math.PI;
  return [x.toFixed(2), y.toFixed(2), Math.round(along)];
});
const LEAF = "M0 0C2-1.7 4.6-1.8 6.6 0C4.6 1.8 2 1.7 0 0Z";

function Laurel({ rank }) {
  const branch = <g>
    <path d="M16.76 31.98A14 14 0 0 1 15.43 6.64" fill="none" stroke="currentColor" strokeWidth="1" />
    {LAUREL_LEAVES.map(([x, y, along], index) => <g key={index} transform={`translate(${x} ${y})`}>
      <path d={LEAF} transform={`rotate(${along - 38})`} />
      <path d={LEAF} transform={`rotate(${along + 34})`} />
    </g>)}
  </g>;
  return <svg className={styles.laurel} viewBox="0 0 44 37" aria-hidden="true" focusable="false">
    <g className={styles.laurelLeaves}>
      {branch}
      <g transform="translate(44 0) scale(-1 1)">{branch}</g>
      <path d="M17 31.6 25.6 35.6M27 31.6 18.4 35.6" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </g>
    <text x="22" y="25.4" textAnchor="middle" className={styles.laurelNumber}>{rank}</text>
  </svg>;
}

function Rank({ rank, scored }) {
  // 점수가 없는 팀의 순위는 팀 ID 순서일 뿐이라 숫자 대신 줄표를 둔다
  if (!scored) return <span className={styles.rank} aria-label="순위 없음">–</span>;
  return <span className={styles.rank} data-medal={rank <= 3 ? rank : undefined} aria-label={rank + "위"}>
    {rank <= 3 ? <Laurel rank={rank} /> : rank}
  </span>;
}

function TeamLine({ ranking }) {
  const scored = ranking.teamScore > 0;
  const last = ranking.lastSolvedAt ? toKst(ranking.lastSolvedAt, { hour: "2-digit", minute: "2-digit", hour12: false }) : null;
  const meta = scored
    ? [ranking.solveCount != null ? formatValue(ranking.solveCount) + "문제" : null, last ? "마지막 득점 " + last : null].filter(Boolean).join(" · ")
    : "아직 점수 없음";
  return <>
    <Rank rank={ranking.rank} scored={scored} />
    <span className={styles.team}>
      <span className={styles.name}>{ranking.teamName}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </span>
    {/* 점수 없는 팀은 "아직 점수 없음"이 이미 있어 0을 다시 적지 않는다 */}
    {scored && <span className={styles.score}>{formatValue(ranking.teamScore)}<span className={styles.srOnly}>점</span></span>}
  </>;
}

function Values({ labels, values, className }) {
  return <dl className={className}>
    {labels.map((label, index) => <div key={label}>
      <dt>{label}</dt>
      <dd>{formatValue(values[index] ?? null)}</dd>
    </div>)}
  </dl>;
}

function Item({ ranking }) {
  const kothScore = ranking.kothScore ?? ranking.categoryScores?.[8] ?? null;
  if (!(ranking.teamScore > 0)) {
    return <li className={styles.item} data-zero><div className={styles.head}><TeamLine ranking={ranking} /></div></li>;
  }
  return <li className={styles.item}>
    <details className={styles.details}>
      <summary className={styles.head}>
        <TeamLine ranking={ranking} />
        <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </summary>
      <div className={styles.panel}>
        <Values labels={CATEGORIES} values={ranking.categoryScores ?? []} className={styles.values} />
        <Values labels={OTHER_SOURCES} values={[kothScore, ranking.signatureScore, ranking.lineScore]} className={styles.values} />
      </div>
    </details>
  </li>;
}

export default function PhoneRankingList({ rankings, status, statusText }) {
  const visible = rankings.slice(0, 6);
  const nobodyScored = visible.length > 0 && visible.every((ranking) => !(ranking.teamScore > 0));
  return <div className={styles.ranking}>
    {nobodyScored && <p className={styles.note}>점수를 얻으면 순위가 매겨집니다</p>}
    <ol className={styles.list} aria-label="팀 순위">
      {visible.map((ranking) => <Item key={ranking.key} ranking={ranking} />)}
      {!visible.length && status === "loading" && PENDING_WIDTHS.map((width, index) => <li key={index} className={styles.item} aria-hidden="true" data-pending-item>
        <div className={styles.head}>
          <SkeletonBar className={styles.rankSkeleton} />
          <span className={styles.team}><SkeletonBar style={{ width }} /><SkeletonBar style={{ width: "36%" }} /></span>
          <SkeletonBar className={styles.scoreSkeleton} />
        </div>
      </li>)}
      {!visible.length && status !== "loading" && <li className={styles.state}>{statusText[status] ?? "아직 등록된 팀이 없습니다"}</li>}
    </ol>
  </div>;
}
