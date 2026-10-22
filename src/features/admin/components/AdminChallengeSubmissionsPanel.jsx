import { useState } from "react";
import { getAdminChallengeSubmissions } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatSolveTime } from "../utils/adminChallengeSolves.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminChoiceChips } from "./AdminFormParts.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { StatStrip, StatTile } from "./AdminWidgets.jsx";
import styles from "./AdminWorkspace.module.css";

const PAGE_SIZE = 20;
const RESULT_CHIPS = [
  { key: "", label: "전체" },
  { key: "INCORRECT", label: "오답" },
  { key: "TOO_MANY_ATTEMPTS", label: "잠김" },
  { key: "CORRECT", label: "정답" },
];
const RESULT_BADGES = {
  CORRECT: { label: "정답", tone: "good" },
  INCORRECT: { label: "오답", tone: "bad" },
  TOO_MANY_ATTEMPTS: { label: "잠김", tone: "warn" },
  ALREADY_SOLVED: { label: "이미 풂", tone: "neutral" },
};

// 제출 기록: 정답만 보이던 풀이 기록 옆에 오답과 잠김까지 시간순으로 보인다
// 플래그 원문은 저장하지 않아 해시 앞 12자리로 같은 값을 여러 번 냈는지만 알 수 있다
export default function AdminChallengeSubmissionsPanel({ challengeId }) {
  const [result, setResult] = useState("INCORRECT");
  const [page, setPage] = useState(1);
  const submissions = useAdminResource((config) => getAdminChallengeSubmissions(challengeId, { result: result || undefined, page, size: PAGE_SIZE }, config),
    [challengeId, result, page], "제출 기록을 불러오지 못했습니다");
  const data = submissions.data;
  const summary = data?.summary;

  if (submissions.status === "unavailable") {
    return <p className={styles.quietNote}>제출 기록은 GET /admin/challenges/&#123;id&#125;/submissions 가 백엔드에 반영되면 보입니다 오답과 잠김 제출은 이미 FlagSubmission 에 저장되고 있습니다</p>;
  }
  return <section aria-label="제출 기록" className={styles.solvesPanel}>
    {summary && <StatStrip label="제출 요약">
      <StatTile label="전체 제출" value={formatAdminNumber(summary.total)} unit="번" />
      <StatTile label="오답" value={formatAdminNumber(summary.incorrect)} unit="번" alert={summary.incorrect > 0} />
      <StatTile label="잠김" value={formatAdminNumber(summary.locked)} unit="번" sub="오답이 쌓여 잠시 막힌 제출" />
      <StatTile label="제출한 팀" value={formatAdminNumber(summary.teams)} unit="팀" sub={`정답 ${formatAdminNumber(summary.correct)}팀`} />
    </StatStrip>}
    <AdminChoiceChips label="제출 결과 고르기" items={RESULT_CHIPS} value={result} onPick={(next) => { setResult(next); setPage(1); }} disabled={submissions.status === "loading"} />
    <AdminStatusMessage status={submissions.status} error={submissions.error} onRetry={submissions.retry} hasData={Boolean(data)} />
    {data && <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="제출 기록">
        <thead><tr><th>제출 시각 (KST)</th><th>팀</th><th>제출자</th><th>결과</th><th>값 지문</th></tr></thead>
        <tbody>{(data.submissions ?? []).map((row) => {
          const badge = RESULT_BADGES[row.result] ?? { label: row.result, tone: "neutral" };
          return <tr key={row.submission_id}>
            <td className={styles.time}><time dateTime={row.created_at}>{formatSolveTime(row.created_at)}</time></td>
            <td><span className={styles.title}>{row.team_name ?? "-"}</span></td>
            <td>{row.user?.nickname ?? "기록 없음"}</td>
            <td><AdminBadge tone={badge.tone}>{badge.label}</AdminBadge></td>
            <td>{row.flag_hash ? <><span className={styles.mono}>{row.flag_hash}</span>{row.repeat_count > 1 && <span className={styles.secondary}>같은 값 {formatAdminNumber(row.repeat_count)}번</span>}</> : <span className={styles.muted}>-</span>}</td>
          </tr>;
        })}</tbody>
      </table>
      {(data.submissions ?? []).length === 0 && <p className={styles.empty}>이 조건의 제출이 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={data?.total_count} size={PAGE_SIZE} onChange={setPage} disabled={submissions.status !== "success"} />
  </section>;
}
