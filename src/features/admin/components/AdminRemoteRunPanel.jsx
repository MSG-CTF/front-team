import { useEffect, useRef, useState } from "react";
import { getAdminChallenge, getAdminRemoteRuns, updateAdminRemoteRun } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatSolveTime } from "../utils/adminChallengeSolves.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import {
  ADMIN_REMOTE_RUN_BADGES,
  remoteRunChanges,
  remoteRunDraft,
  remoteRunDraftChanged,
  remoteRunSummary,
} from "../utils/adminRemoteRun.js";
import { formatFileSize } from "../../challenges/utils/challengeDetailMapper.js";
import { formatRunDuration } from "../../challenges/utils/remoteRun.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminChoiceChips, AdminSwitch } from "./AdminFormParts.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { StatStrip, StatTile } from "./AdminWidgets.jsx";
import styles from "./AdminWorkspace.module.css";

const PAGE_SIZE = 20;
const STATUS_CHIPS = [
  { key: "", label: "전체" },
  { key: "COMPLETED", label: "실행 완료" },
  { key: "TIMED_OUT", label: "시간 초과" },
  { key: "CRASHED", label: "VM 중단" },
  { key: "FAILED", label: "실행 실패" },
  { key: "ACTIVE", label: "진행 중" },
];

// 설정 카드: 평소에는 한 줄 요약만 두고, 바꿀 때만 칸을 연다
function RemoteRunSettings({ challengeId, saved, onSaved, onBusyChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => remoteRunDraft(saved));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const summary = remoteRunSummary(saved);
  const { error: invalid, payload } = remoteRunChanges(draft);
  const dirty = remoteRunDraftChanged(draft, saved);

  useEffect(() => {
    if (!editing) setDraft(remoteRunDraft(saved));
  }, [saved, editing]);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault();
    if (pending.current || !payload || !dirty) return;
    pending.current = true;
    setBusy(true); onBusyChange?.(true); setError(""); setNotice("");
    try {
      const response = await updateAdminRemoteRun(challengeId, payload);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "원격 실행 설정을 저장하지 못했습니다");
      const refreshed = await onSaved();
      setEditing(false);
      setNotice(refreshed === false ? "저장했지만 최신 설정을 다시 불러오지 못했습니다" : "원격 실행 설정을 저장했습니다 다음 실행부터 적용됩니다");
    } catch (failure) {
      setError(failure?.response?.data?.message || failure.message || "원격 실행 설정을 저장하지 못했습니다");
    } finally {
      pending.current = false; setBusy(false); onBusyChange?.(false);
    }
  }

  return <section className={`${styles.card} ${styles.remoteCard}`} aria-label="원격 실행 설정">
    <div className={styles.remoteHead}>
      <div>
        <p className={styles.remoteTitle}><span className={styles.deployPill} data-state="remote"><i aria-hidden="true" />원격 실행</span>{summary?.environment}</p>
        <p className={styles.helpText}>{summary?.rules}</p>
      </div>
      {!editing && <button type="button" className={styles.button} onClick={() => { setDraft(remoteRunDraft(saved)); setEditing(true); setNotice(""); }}>설정 바꾸기</button>}
    </div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {editing && <form onSubmit={save} className={`${styles.basicEditor} ${styles.remoteForm}`}>
      <div className={styles.remoteFields}>
        <label className={styles.remoteWide}>실행 환경<input className={styles.input} value={draft.environment} maxLength={80} disabled={busy}
          onChange={(event) => change("environment", event.target.value)} placeholder="Windows 11 25H2 x64"/></label>
        <label>받는 파일<input className={styles.input} value={draft.accept} disabled={busy} onChange={(event) => change("accept", event.target.value)} placeholder=".exe"/></label>
        <label>최대 크기 (MB)<input type="number" min="1" max="100" step="1" inputMode="numeric" className={styles.input} value={draft.maxMegabytes} disabled={busy}
          onChange={(event) => change("maxMegabytes", event.target.value)}/></label>
        <label>제한 시간 (초)<input type="number" min="10" max="600" step="1" inputMode="numeric" className={styles.input} value={draft.timeoutSeconds} disabled={busy}
          onChange={(event) => change("timeoutSeconds", event.target.value)}/></label>
        <label>팀당 횟수 (회)<input type="number" min="1" max="20" step="1" inputMode="numeric" className={styles.input} value={draft.maxAttempts} disabled={busy}
          onChange={(event) => change("maxAttempts", event.target.value)}/></label>
        <div className={styles.remoteSwitch}>
          <span><strong>x64 실행 파일만 받기</strong><small>올리기 전에 브라우저가 PE 머리에서 AMD64 인지 먼저 확인합니다</small></span>
          <AdminSwitch checked={draft.amd64} onChange={(value) => change("amd64", value)} label="x64(AMD64) PE 실행 파일만 받기" disabled={busy}/>
        </div>
      </div>
      <p className={styles.helpText}>팀당 횟수는 참가자 화면에 보이지 않습니다 다 쓰면 RUN 단추만 잠기고, 운영 오류로 실행하지 못한 기록은 횟수에 넣지 않습니다</p>
      {invalid && <p role="alert" className={styles.errorNotice}>{invalid}</p>}
      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      <div className={styles.basicFooter}>
        <p className={dirty ? styles.unsaved : styles.helpText}>{dirty ? "저장하지 않은 변경 사항이 있습니다" : "바뀐 값이 없습니다"}</p>
        <div className={styles.remoteActions}>
          <button type="button" className={styles.button} disabled={busy} onClick={() => { setEditing(false); setError(""); setDraft(remoteRunDraft(saved)); }}>취소</button>
          <button type="submit" className={styles.primary} disabled={busy || !dirty || Boolean(invalid)}>{busy ? "저장 중…" : "변경 사항 저장"}</button>
        </div>
      </div>
    </form>}
  </section>;
}

// 출력 보기: 표에서 고른 실행의 출력을 시트로 연다
function RunOutputDialog({ run, onClose }) {
  const [copied, setCopied] = useState(false);
  const badge = ADMIN_REMOTE_RUN_BADGES[run.status] ?? { label: run.status || "확인 중", tone: "neutral" };
  const facts = [run.exit_code != null && `종료 코드 ${run.exit_code}`, formatRunDuration(run.duration_ms), run.file_name].filter(Boolean).join(" · ");
  const copy = async () => {
    try { await navigator.clipboard.writeText(run.stdout ?? ""); setCopied(true); } catch { setCopied(false); }
  };
  return <AdminDialog title={`${run.team_name ?? "팀"} · ${run.run_number ?? "-"}회차`} subtitle={facts}
    headerMeta={<AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>} onClose={onClose}>
    <div className={styles.remoteOutput}>
      {run.message && <p className={styles.helpText}>{run.message}</p>}
      <p className={styles.remoteOutputLabel}>출력</p>
      {run.stdout ? <pre className={styles.remoteCode} tabIndex={0}>{run.stdout}</pre> : <p className={styles.quietNote}>출력이 없습니다</p>}
      {run.stderr && <><p className={styles.remoteOutputLabel}>오류 출력</p><pre className={`${styles.remoteCode} ${styles.remoteCodeErr}`} tabIndex={0}>{run.stderr}</pre></>}
      <div className={styles.remoteActions}>
        {run.stdout && <button type="button" className={styles.button} onClick={copy}>{copied ? "복사했습니다" : "출력 복사"}</button>}
        <button type="button" className={styles.primary} onClick={onClose}>닫기</button>
      </div>
    </div>
  </AdminDialog>;
}

// 실행 기록: 모든 팀의 원격 실행을 최신순으로 보고 출력을 연다
function RemoteRunHistory({ challengeId }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(null);
  const runs = useAdminResource((config) => getAdminRemoteRuns(challengeId, { status: status || undefined, page, size: PAGE_SIZE }, config),
    [challengeId, status, page], "원격 실행 기록을 불러오지 못했습니다");
  const data = runs.data;
  const summary = data?.summary;

  if (runs.status === "unavailable") {
    return <p className={styles.quietNote}>실행 기록은 GET /admin/challenges/&#123;id&#125;/remote_runs 가 백엔드에 반영되면 보입니다</p>;
  }
  return <section aria-label="원격 실행 기록" className={styles.solvesPanel}>
    {summary && <StatStrip label="원격 실행 요약">
      <StatTile label="전체 실행" value={formatAdminNumber(summary.total)} unit="회" />
      <StatTile label="실행한 팀" value={formatAdminNumber(summary.teams)} unit="팀" />
      <StatTile label="시간 초과·VM 중단" value={formatAdminNumber((summary.timed_out ?? 0) + (summary.crashed ?? 0))} unit="회"
        alert={(summary.timed_out ?? 0) + (summary.crashed ?? 0) > 0} />
      <StatTile label="운영 실패" value={formatAdminNumber(summary.failed)} unit="회" sub="횟수에 넣지 않은 실행" alert={summary.failed > 0} />
    </StatStrip>}
    <AdminChoiceChips label="실행 결과 고르기" items={STATUS_CHIPS} value={status} onPick={(next) => { setStatus(next); setPage(1); }} disabled={runs.status === "loading"} />
    <AdminStatusMessage status={runs.status} error={runs.error} onRetry={runs.retry} hasData={Boolean(data)} />
    {data && <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="원격 실행 기록">
        <thead><tr><th>실행 시각 (KST)</th><th>팀</th><th>회차</th><th>결과</th><th>걸린 시간</th><th>파일</th><th><span className={styles.srOnly}>출력</span></th></tr></thead>
        <tbody>{(data.runs ?? []).map((run) => {
          const badge = ADMIN_REMOTE_RUN_BADGES[run.status] ?? { label: run.status || "확인 중", tone: "neutral" };
          return <tr key={run.run_id}>
            <td className={styles.time}><time dateTime={run.created_at}>{formatSolveTime(run.created_at)}</time></td>
            <td><span className={styles.title}>{run.team_name ?? "-"}</span>{run.user?.nickname && <span className={styles.secondary}>{run.user.nickname}</span>}</td>
            <td>{run.run_number != null ? `${run.run_number}회차` : <span className={styles.muted}>횟수 제외</span>}</td>
            <td><AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>{run.exit_code != null && <span className={styles.secondary}>종료 코드 {run.exit_code}</span>}</td>
            <td>{formatRunDuration(run.duration_ms) ?? <span className={styles.muted}>-</span>}</td>
            <td>{run.payload_sha256 ? <span className={styles.mono}>{run.payload_sha256.slice(0, 12)}</span> : <span className={styles.muted}>-</span>}
              <span className={styles.secondary}>{[run.file_name, run.file_size != null && formatFileSize(run.file_size)].filter(Boolean).join(" · ")}</span></td>
            <td><button type="button" className={styles.button} onClick={() => setOpened(run)} disabled={run.status === "QUEUED" || run.status === "RUNNING"}>출력 보기</button></td>
          </tr>;
        })}</tbody>
      </table>
      {(data.runs ?? []).length === 0 && <p className={styles.empty}>이 조건의 실행이 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={data?.total_count} size={PAGE_SIZE} onChange={setPage} disabled={runs.status !== "success"} />
    {opened && <RunOutputDialog run={opened} onClose={() => setOpened(null)} />}
  </section>;
}

// 원격 실행 탭: 설정 카드와 실행 기록
export default function AdminRemoteRunPanel({ challenge, onBusyChange, onChanged }) {
  const detail = useAdminResource((config) => getAdminChallenge(challenge.challenge_id, config), [challenge.challenge_id], "문제 정보를 불러오지 못했습니다");
  const saved = detail.data?.remote_run ?? challenge.remote_run ?? null;
  async function savedSettings() {
    const refreshed = await detail.reload();
    await onChanged?.();
    return refreshed;
  }
  return <div className={styles.remotePanel}>
    {detail.status === "error" && <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry} hasData={Boolean(detail.data)} />}
    <RemoteRunSettings challengeId={challenge.challenge_id} saved={saved} onSaved={savedSettings} onBusyChange={onBusyChange} />
    <RemoteRunHistory challengeId={challenge.challenge_id} />
  </div>;
}
