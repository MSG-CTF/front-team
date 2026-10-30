import { useState } from "react";
import { getAdminChallengeSubmissions, getAdminSignatureSubmissions } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatSolveTime } from "../utils/adminChallengeSolves.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminChoiceChips } from "./AdminFormParts.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { StatStrip, StatTile } from "./AdminWidgets.jsx";
import styles from "./AdminWorkspace.module.css";
import AdminSubmissionDeleteDialog from "./AdminSubmissionDeleteDialog.jsx";
import { submissionDeleteMessage } from "../utils/adminSubmissionDelete.js";
import local from "./AdminApiActions.module.css";

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
export default function AdminChallengeSubmissionsPanel({ challengeId, signatureId, challengeTitle, onBusyChange }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState("INCORRECT");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ teamId: "", startAt: "", endAt: "" });
  const [draft, setDraft] = useState(filters);
  const [filterError, setFilterError] = useState("");
  const signature = Boolean(signatureId);
  const submissions = useAdminResource((config) => (signature ? getAdminSignatureSubmissions : getAdminChallengeSubmissions)(signatureId || challengeId,
    { ...filters, teamId: filters.teamId || undefined, result: result || undefined, page, size: PAGE_SIZE }, config),
    [challengeId, signatureId, result, page, filters], "제출 기록을 불러오지 못했습니다");
  const data = submissions.data;
  const summary = data?.summary;
  function changeBusy(value) { setBusy(value); onBusyChange?.(value); }

  if (submissions.status === "unavailable" && !notice) {
    return <p className={styles.quietNote}>현재 서버에서 이 문제의 제출 기록을 조회할 수 없습니다</p>;
  }
  return <section aria-label="제출 기록" className={styles.solvesPanel}>
    {notice && <p role="status" className={styles.notice} style={{ whiteSpace: "pre-line" }}>{notice}</p>}
    {notice && ["error", "unavailable"].includes(submissions.status) && <p className={styles.errorText}>삭제는 완료됐지만 목록·요약 갱신에 실패했습니다. 삭제를 반복하지 말고 다시 조회하세요.</p>}
    {summary && <StatStrip label="제출 요약">
      <StatTile label="전체 제출" value={formatAdminNumber(summary.total)} unit="번" />
      <StatTile label="오답" value={formatAdminNumber(summary.incorrect)} unit="번" alert={summary.incorrect > 0} />
      <StatTile label="잠김" value={formatAdminNumber(summary.locked)} unit="번" sub="오답이 쌓여 잠시 막힌 제출" />
      <StatTile label="제출한 팀" value={formatAdminNumber(summary.teams)} unit="팀" sub={`정답 ${formatAdminNumber(summary.correct)}팀`} />
    </StatStrip>}
    <AdminChoiceChips label="제출 결과 고르기" items={RESULT_CHIPS} value={result} onPick={(next) => { setResult(next); setPage(1); }} disabled={submissions.status === "loading"} />
    <details><summary>팀과 기간으로 찾기</summary><form className={styles.formStack} onSubmit={e => {
      e.preventDefault();
      if (draft.teamId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.teamId.trim())) { setFilterError("팀 ID를 확인해주세요"); return; }
      const kst = value => value ? `${value.length === 16 ? `${value}:00` : value}+09:00` : "";
      const startAt = kst(draft.startAt), endAt = kst(draft.endAt);
      if (startAt && endAt && Date.parse(startAt) >= Date.parse(endAt)) { setFilterError("종료 시각은 시작 시각보다 늦어야 합니다"); return; }
      setFilterError(""); setFilters({ teamId: draft.teamId.trim(), startAt, endAt }); setPage(1);
    }}>
      <div className={local.fields}>
        <label className={local.field}>팀 ID (선택)<input className={styles.input} value={draft.teamId} onChange={e => setDraft({ ...draft, teamId: e.target.value })} placeholder="전체 팀" /></label>
        <label className={local.field}>시작 시각 (KST)<input type="datetime-local" className={styles.input} value={draft.startAt} onChange={e => setDraft({ ...draft, startAt: e.target.value })} /></label>
        <label className={local.field}>종료 시각 (KST)<input type="datetime-local" className={styles.input} value={draft.endAt} onChange={e => setDraft({ ...draft, endAt: e.target.value })} /></label>
      </div>
      {filterError && <p role="alert" className={styles.errorText}>{filterError}</p>}
      <div className={local.actions}><button type="submit" className={styles.button} disabled={busy}>조회</button><button type="button" className={styles.button} disabled={busy} onClick={() => { const empty = { teamId: "", startAt: "", endAt: "" }; setDraft(empty); setFilters(empty); setFilterError(""); setPage(1); }}>필터 초기화</button></div>
    </form></details>
    <AdminStatusMessage status={submissions.status} error={submissions.error} onRetry={submissions.retry} hasData={Boolean(data)} />
    {data && <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="제출 기록">
        <thead><tr><th>제출 시각 (KST)</th><th>팀</th><th>제출자</th><th>결과</th>{!signature && <><th>값 지문</th><th>작업</th></>}</tr></thead>
        <tbody>{(data.submissions ?? []).map((row) => {
          const badge = RESULT_BADGES[row.result] ?? { label: row.result, tone: "neutral" };
          return <tr key={row.submission_id}>
            <td className={styles.time}><time dateTime={row.created_at}>{formatSolveTime(row.created_at)}</time></td>
            <td><span className={styles.title}>{row.team_name ?? "-"}</span></td>
            <td>{row.user?.nickname ?? "기록 없음"}</td>
            <td><AdminBadge tone={badge.tone}>{badge.label}</AdminBadge></td>
            {!signature && <><td>{row.flag_hash ? <><span className={styles.mono}>{row.flag_hash}</span>{row.repeat_count > 1 && <span className={styles.secondary}>같은 값 {formatAdminNumber(row.repeat_count)}번</span>}</> : <span className={styles.muted}>-</span>}</td>
            <td><button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy}
              onClick={() => setSelected(row)}>삭제</button></td></>}
          </tr>;
        })}</tbody>
      </table>
      {(data.submissions ?? []).length === 0 && <p className={styles.empty}>이 조건의 제출이 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={data?.total_count} size={PAGE_SIZE} onChange={setPage} disabled={submissions.status !== "success"} />
    {selected && <AdminSubmissionDeleteDialog key={`${challengeId}:${selected.submission_id}`} challengeId={challengeId}
      challengeTitle={challengeTitle} row={selected} onBusyChange={changeBusy} onClose={() => { if (!busy) setSelected(null); }}
      onDeleted={(deleted) => { setNotice(submissionDeleteMessage(deleted)); setSelected(null); }} />}
  </section>;
}
