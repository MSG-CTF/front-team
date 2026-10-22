import { useState } from "react";
import { getAdminChallengeSolves } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { SOLVE_QUICK_RANGES, formatSolveTime, quickSolveRange, solveHourLabel, solvePeriodQuery } from "../utils/adminChallengeSolves.js";
import { AdminChoiceChips } from "./AdminFormParts.jsx";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { StatStrip, StatTile } from "./AdminWidgets.jsx";
import styles from "./AdminWorkspace.module.css";

const PAGE_SIZE = 20;
const RANGE_CHIPS = [{ key: "all", label: "전체 기간" }, ...SOLVE_QUICK_RANGES];

// 풀이 기록: 다이나믹 스코어링이라 푼 팀은 모두 현재 배점을 같이 받는다
// 그래서 줄마다 점수를 보이지 않고 위쪽에 현재 배점을 한 번만, 줄에는 푼 순서와 첫 풀이를 보인다
export default function AdminChallengeSolvesPanel({ challengeId, currentScore }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [period, setPeriod] = useState({});
  const [quick, setQuick] = useState("all");
  const [hour, setHour] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const history = useAdminResource((config) => getAdminChallengeSolves(challengeId,
    { ...period, hour: hour || undefined, sort, page, size: PAGE_SIZE }, config),
    [challengeId, period.startAt, period.endAt, hour, sort, page], "풀이 기록을 불러오지 못했습니다");
  const loading = history.status === "loading";
  const data = history.data;
  const whole = !period.startAt && !period.endAt && !hour;

  function showPeriod(nextStart, nextEnd, nextQuick) {
    try {
      const next = solvePeriodQuery(nextStart, nextEnd);
      setError(""); setHour(""); setPage(1); setQuick(nextQuick);
      if (next.startAt === period.startAt && next.endAt === period.endAt && !hour && page === 1) history.retry();
      setPeriod(next);
    } catch (failure) { setError(failure.message); }
  }

  function applyPeriod(event) {
    event.preventDefault();
    showPeriod(start, end, !start && !end ? "all" : "");
  }

  function pickRange(key) {
    const range = key === "all" ? { start: "", end: "" } : quickSolveRange(key);
    setStart(range.start); setEnd(range.end);
    showPeriod(range.start, range.end, key);
  }

  // 전체 기간을 볼 때만 몇 번째로 풀었는지 셀 수 있다
  function order(index) {
    if (!whole || !data) return null;
    const position = (page - 1) * PAGE_SIZE + index;
    return sort === "earliest" ? position + 1 : data.total_count - position;
  }

  return <section aria-label="문제 풀이 기록" className={styles.solvesPanel}>
    {history.status === "success" && data && <StatStrip label="풀이 요약">
      <StatTile glyph="rank" tone="yellow" label="현재 배점" value={currentScore == null ? "-" : formatAdminNumber(currentScore)} unit="점" sub="푼 팀 모두 같은 점수" />
      <StatTile glyph="solve" tone="green" label="전체 풀이" value={formatAdminNumber(data.summary.total_solved_teams)} unit="팀" />
      <StatTile glyph="timer" tone="indigo" label="조회 기간" value={formatAdminNumber(data.summary.period_solved_teams)} unit="팀" sub={whole ? "전체 기간" : "기간 지정"} />
      <StatTile glyph="bolt" tone="orange" label="첫 풀이" value={data.summary.first_solved_at ? formatSolveTime(data.summary.first_solved_at).slice(5, 16) : "-"} text />
    </StatStrip>}
    <form className={styles.solveFilters} onSubmit={applyPeriod}>
      <div className={styles.solveQuickRow}>
        <AdminChoiceChips label="조회 기간 빠른 선택" items={RANGE_CHIPS} value={quick} onPick={pickRange} disabled={loading} />
      </div>
      <label>조회 시작<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className={styles.input}/></label>
      <label>조회 종료<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className={styles.input}/></label>
      <div className={styles.solveFilterActions}>
        <button type="submit" className={styles.primary} disabled={loading}>조회</button>
      </div>
    </form>
    {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
    <AdminStatusMessage status={history.status} error={history.error} onRetry={history.retry}/>
    {history.status === "success" && data && <>
      <div className={styles.solveTableTools}>
        <label>시간대<select value={hour} className={styles.select} onChange={(event) => { setHour(event.target.value); setPage(1); }}>
          <option value="">전체 시간대 · {data.summary.period_solved_teams}팀</option>
          {data.hourly.map((bucket) => <option key={bucket.start_at} value={bucket.start_at}>
            {solveHourLabel(bucket.start_at, bucket.end_at)} · {bucket.solved_team_count}팀
          </option>)}
        </select></label>
        <label>정렬<select value={sort} className={styles.select} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          <option value="latest">최근 풀이순</option><option value="earliest">먼저 푼 순</option>
        </select></label>
      </div>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.solveTable}`} aria-label="문제 풀이 팀 목록">
          <thead><tr><th>순서</th><th>팀</th><th>제출자</th><th>풀이 시각 (KST)</th></tr></thead>
          <tbody>{data.solves.map((solve, index) => {
            const first = solve.solved_at === data.summary.first_solved_at;
            const rank = order(index);
            return <tr key={solve.solve_id}>
              <td className={styles.solveOrder}>{first ? <AdminBadge tone="orange">첫 풀이</AdminBadge> : rank ? `${rank}번째` : "-"}</td>
              <td><span className={styles.title}>{solve.team_name}</span></td>
              <td>{solve.solver?.nickname ?? "기록 없음"}</td>
              <td className={styles.time}><time dateTime={solve.solved_at}>{formatSolveTime(solve.solved_at)}</time></td>
            </tr>;
          })}</tbody>
        </table>
        {data.solves.length === 0 && <p className={styles.empty}>{data.summary.total_solved_teams === 0
          ? "아직 이 문제를 푼 팀이 없습니다" : "선택한 기간에 풀이 기록이 없습니다"}</p>}
      </div>
      <AdminPagination page={page} totalCount={data.total_count} size={PAGE_SIZE} onChange={setPage}/>
    </>}
  </section>;
}
