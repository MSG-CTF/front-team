import { useEffect, useRef, useState } from "react";
import { getAdminChallenge, updateAdminChallenge, getAdminChallengeFlag, revealAdminChallengeFlag } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { ADMIN_CHALLENGE_CATEGORIES } from "../utils/adminValidation.js";
import { challengeDetailsDraft, challengeDetailsChanges } from "../utils/adminChallengeSettings.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

function FlagPanel({ challengeId, disabled, onBusyChange }) {
  const flag = useAdminResource((config) => getAdminChallengeFlag(challengeId, config), [challengeId], "플래그 설정을 불러오지 못했습니다");
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [newFlag, setNewFlag] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (revealed === null) return;
    const timer = setTimeout(() => setRevealed(null), 60000);
    const hide = () => { if (document.hidden) setRevealed(null); };
    document.addEventListener("visibilitychange", hide);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", hide); };
  }, [revealed]);

  async function reveal() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); onBusyChange(true); setError("");
    request.current = new AbortController();
    try {
      const response = await revealAdminChallengeFlag(challengeId, { signal: request.current.signal });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "플래그를 확인하지 못했습니다");
      setRevealed(response.data.data.flag);
    } catch (failure) { setError(failure?.response?.data?.message || failure.message); }
    finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }

  const invalidFlag = !newFlag || /[\0\r\n]/.test(newFlag) || new TextEncoder().encode(newFlag).length > 4096;

  async function saveFlag() {
    if (pending.current || disabled || invalidFlag) return;
    pending.current = true;
    setBusy(true); onBusyChange(true); setError(""); setNotice("");
    try {
      const response = await updateAdminChallenge(challengeId, { flag: newFlag });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "플래그를 변경하지 못했습니다");
      setRevealed(null); setNewFlag(""); setEditing(false);
      const refreshed = await flag.reload();
      setNotice(refreshed
        ? "채점 플래그를 변경했습니다 비밀값 탭에서 flag를 같은 값으로 저장하고 새 배포 버전을 만들어주세요"
        : "채점 플래그는 변경했습니다 최신 상태를 다시 확인해주세요");
    } catch (failure) { setError(failure?.response?.data?.message || failure.message || "플래그를 변경하지 못했습니다"); }
    finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }

  const data = flag.data;
  return <section aria-label="채점 플래그">
    <div className={styles.flagLabel}><h3>플래그</h3>
      {flag.status === "success" && <AdminBadge tone={data.configured ? "good" : "bad"}>{data.configured ? "등록됨" : "미등록"}</AdminBadge>}
    </div>
    <AdminStatusMessage status={flag.status} error={flag.error} onRetry={flag.retry}/>
    {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
    {notice && <p role="status" className={styles.helpText}>{notice}</p>}
    {flag.status === "success" && <>
      <div className={styles.flagBox}>
        <output aria-label="채점용 플래그 원문" className={styles.flagValue}>{revealed ?? (data.configured ? "••••••••••••••••" : "등록된 플래그 없음")}</output>
        <button type="button" className={styles.flagReveal} disabled={disabled || busy || !data.reveal_available}
          onClick={() => revealed === null ? reveal() : setRevealed(null)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>
            {revealed !== null && <path d="m3 3 18 18"/>}
          </svg>{busy ? "확인 중" : revealed === null ? "원문 보기" : "숨기기"}
        </button>
      </div>
      <p className={styles.helpText}>{data.reveal_available
        ? "참가자가 제출한 정답과 비교하는 값입니다"
        : !data.configured ? "채점용 플래그가 등록되지 않았습니다"
        : data.source_status === "mismatch" ? "저장된 원문이 채점 값과 다릅니다"
        : data.source_status === "unavailable" ? "원문을 읽지 못했습니다 저장소 연결을 확인해주세요"
        : "채점 값은 저장되어 있지만 확인할 원문이 없습니다"}</p>
      {data.reveal_available && <p className={styles.flagSource}>{data.source === "repository" ? "info.yaml" : "저장된 비밀값"}에서 확인 · 원문은 1분 뒤 숨겨집니다</p>}
      {!editing ? <button type="button" className={styles.button} disabled={disabled || busy}
        onClick={() => { setEditing(true); setError(""); setNotice(""); }}>플래그 변경</button>
        : <div className="mt-3 space-y-2">
          <label>새 채점 플래그<input type="password" autoComplete="new-password" aria-label="새 채점 플래그"
            className={styles.input} value={newFlag} disabled={disabled || busy} maxLength={4096}
            onChange={(event) => setNewFlag(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveFlag(); } }}/></label>
          <p className={styles.helpText}>저장하면 이전 플래그는 정답으로 인정되지 않습니다</p>
          <p className={styles.helpText}>실행 중인 문제에는 기존 값이 남습니다 비밀값과 새 배포 버전도 함께 설정해주세요</p>
          <div className="flex gap-2">
            <button type="button" className={styles.primary} disabled={disabled || busy || invalidFlag} onClick={saveFlag}>
              {busy ? "저장 중…" : "채점 플래그 저장"}</button>
            <button type="button" className={styles.button} disabled={disabled || busy}
              onClick={() => { setEditing(false); setNewFlag(""); setError(""); }}>취소</button>
          </div>
        </div>}
    </>}
  </section>;
}

export default function AdminChallengeSettingsDialog({ challenge, onClose, onSaved, embedded = false, active = true, onBusyChange }) {
  const detail = useAdminResource((config) => getAdminChallenge(challenge.challenge_id, config), [challenge.challenge_id], "문제 정보를 불러오지 못했습니다");
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const busy = mutating || revealing;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { if (detail.data) { setSaved(detail.data); setDraft(challengeDetailsDraft(detail.data)); } }, [detail.data]);
  const changes = saved && draft ? challengeDetailsChanges(saved, draft) : {};
  const dirty = Object.keys(changes).length > 0;
  const titleValid = Boolean(draft?.title.trim()) && [...(draft?.title.trim() ?? "")].length <= 200;
  function change(field, value) { setDraft((current) => ({ ...current, [field]: value })); setNotice(""); }

  async function save(event) {
    event.preventDefault();
    if (pending.current || busy || !dirty || !titleValid) return;
    pending.current = true; setMutating(true); setNotice(""); setError("");
    try {
      const response = await updateAdminChallenge(challenge.challenge_id, changes);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "문제를 저장하지 못했습니다");
      setSaved(response.data.data); setDraft(challengeDetailsDraft(response.data.data));
      setNotice("문제 정보를 저장했습니다");
      const refreshed = await onSaved?.(response.data.data);
      if (refreshed === false) setNotice("문제 정보는 저장했습니다 목록을 새로고침해주세요");
    } catch (failure) { setError(failure?.response?.data?.message || failure.message); }
    finally { pending.current = false; setMutating(false); }
  }

  const content = <>
    <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry}/>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
    {draft && detail.status === "success" && <form onSubmit={save} className={styles.basicEditor}>
      <div className={styles.basicGrid}>
        <label className={styles.basicTitle}>문제 제목<input value={draft.title} onChange={(event) => change("title", event.target.value)} className={styles.input} disabled={busy} required maxLength={200}/></label>
        <div className={styles.basicClassification}>
          <label>분야<select value={draft.category} className={styles.select} disabled={busy} onChange={(event) => change("category", event.target.value)}>
            {ADMIN_CHALLENGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>난이도<select value={draft.difficulty} className={styles.select} disabled={busy} onChange={(event) => change("difficulty", event.target.value)}>
            <option value="UNASSIGNED">미정</option><option value="EASY">쉬움</option><option value="MEDIUM">보통</option><option value="HARD">어려움</option></select></label>
        </div>
        <div className={styles.basicStatement}>
          <label htmlFor="challenge-statement">문제 지문<textarea id="challenge-statement" aria-describedby="challenge-statement-help" value={draft.description} rows={8} onChange={(event) => change("description", event.target.value)} className={styles.statementInput} disabled={busy}/></label>
          <p id="challenge-statement-help" className={styles.helpText}>참가자에게 보여줄 문제 설명을 작성해주세요</p>
        </div>
        <aside className={styles.basicGrading}>
          {active && <FlagPanel challengeId={challenge.challenge_id} disabled={busy} onBusyChange={setRevealing}/>}
          <dl className={styles.scoreSummary}><dt>현재 배점</dt><dd>{Number(saved.current_score).toLocaleString("ko-KR")}<span>점</span></dd></dl>
          <p className={styles.helpText}>최대 {saved.initial_score}점 · 최저 {saved.minimum_score}점<br/>풀이 팀 수에 따라 점수가 줄어듭니다</p>
        </aside>
      </div>
      <div className={styles.basicFooter}>
        <p className={dirty ? styles.unsaved : styles.helpText}>{dirty ? "저장하지 않은 변경 사항이 있습니다" : "모든 배포 버전에 공통으로 적용되는 정보입니다"}</p>
        <button type="submit" className={styles.primary} disabled={busy || !dirty || !titleValid}>{mutating ? "저장 중…" : "변경 사항 저장"}</button>
      </div>
    </form>}
  </>;
  return embedded ? content : <AdminDialog title={(saved?.title ?? challenge.title) + " · 문제 설정"} onClose={onClose} busy={busy} variant="workspace">{content}</AdminDialog>;
}
