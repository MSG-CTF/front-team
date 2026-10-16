import { useState } from "react";
import { getAdminChallengeSolves } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatSolveTime, solveHourLabel, solvePeriodQuery } from "../utils/adminChallengeSolves.js";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import AdminPagination from "./AdminPagination.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminChallengeSolvesPanel({ challengeId }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [period, setPeriod] = useState({});
  const [hour, setHour] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const history = useAdminResource((config) => getAdminChallengeSolves(challengeId,
    { ...period, hour: hour || undefined, sort, page, size: 20 }, config),
    [challengeId, period.startAt, period.endAt, hour, sort, page], "풀이 기록을 불러오지 못했습니다");
  const loading = history.status === "loading";
  const data = history.data;

  function applyPeriod(event) {
    event.preventDefault();
    try {
      const next = solvePeriodQuery(start, end);
      setError(""); setHour(""); setPage(1);
      if (next.startAt === period.startAt && next.endAt === period.endAt && !hour && page === 1) history.retry();
      setPeriod(next);
    } catch (failure) { setError(failure.message); }
  }

  function resetPeriod() {
    setStart(""); setEnd(""); setPeriod({}); setHour(""); setPage(1); setError("");
  }

  return <section aria-label="문제 풀이 기록">
    <p className={styles.panelIntro}>팀별 첫 정답 제출 기록입니다 모든 시각은 한국 시간(KST)입니다</p>
    <form className={styles.solveFilters} onSubmit={applyPeriod}>
      <label>조회 시작<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className={styles.input}/></label>
      <label>조회 종료<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className={styles.input}/></label>
      <div className={styles.solveFilterActions}>
        <button type="submit" className={styles.primary} disabled={loading}>조회</button>
        <button type="button" className={styles.button} disabled={loading || (!start && !end && !hour)} onClick={resetPeriod}>전체 기간</button>
      </div>
    </form>
    <p className={styles.helpText}>시작 시각부터 종료 시각 전까지 조회합니다 비워두면 전체 기간을 봅니다</p>
    {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
    <AdminStatusMessage status={history.status} error={history.error} onRetry={history.retry}/>
    {history.status === "success" && data && <>
      <dl className={styles.solveSummary}>
        <div><dt>전체 풀이</dt><dd>{data.summary.total_solved_teams.toLocaleString("ko-KR")}<span>팀</span></dd></div>
        <div><dt>조회 기간 내</dt><dd>{data.summary.period_solved_teams.toLocaleString("ko-KR")}<span>팀</span></dd></div>
        <div><dt>첫 풀이 시각</dt><dd className={styles.solveFirstTime}>{formatSolveTime(data.summary.first_solved_at)}</dd></div>
      </dl>
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
          <thead><tr><th>팀</th><th>제출자</th><th>풀이 시각 (KST)</th><th>점수</th></tr></thead>
          <tbody>{data.solves.map((solve) => <tr key={solve.solve_id}>
            <td><span className={styles.title}>{solve.team_name}</span></td>
            <td>{solve.solver?.nickname ?? "기록 없음"}</td>
            <td><time dateTime={solve.solved_at}>{formatSolveTime(solve.solved_at)}</time></td>
            <td>{Number(solve.earned_score).toLocaleString("ko-KR")}점</td>
          </tr>)}</tbody>
        </table>
        {data.solves.length === 0 && <p className={styles.empty}>{data.summary.total_solved_teams === 0
          ? "아직 이 문제를 푼 팀이 없습니다" : "선택한 기간에 풀이 기록이 없습니다"}</p>}
      </div>
      <AdminPagination page={page} totalCount={data.total_count} size={20} onChange={setPage}/>
    </>}
  </section>;
}
