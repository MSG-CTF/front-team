import { useEffect, useRef, useState } from "react";
import { applyAdminKothEnvironment, getAdminKothEnvironment, previewAdminKothEnvironment, saveAdminKothEnvironment } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { readEnvironmentFile } from "../utils/adminEnvironmentFile.js";
import { KOTH_ENV_STATES, kothEnvironmentBody, manualKothEnvironment } from "../utils/adminKothEnvironment.js";
import { formatAdminTime } from "../utils/adminTime.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminKothEnvironment.module.css";

const EMPTY_ENTRY = { name: "", value: "", kind: "secret", required: true };
const ACTIONS = { keep: "유지", add: "추가", update: "변경", unset: "설정하지 않음" };

export default function AdminKothEnvironmentPanel({ challenge, initialVersionId = "", onApplied }) {
  const id = challenge.koth_challenge_id;
  const [versionId, setVersionId] = useState(initialVersionId);
  const resource = useAdminResource((config) => getAdminKothEnvironment(id, versionId, config), [id, versionId], "환경변수를 불러오지 못했습니다");
  const data = resource.data, selected = data?.selected, state = data?.state;
  const [containerName, setContainerName] = useState("");
  const [method, setMethod] = useState(null);
  const [edits, setEdits] = useState({});
  const [added, setAdded] = useState(EMPTY_ENTRY);
  const [fileName, setFileName] = useState("");
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileContent = useRef("");
  const saveId = useRef(null), applyId = useRef(null), submitting = useRef(false), sequence = useRef(0);
  const container = selected?.containers.find((item) => item.name === containerName) ?? selected?.containers[0];
  const busy = working || resource.status === "loading";
  const status = KOTH_ENV_STATES[state?.state] ?? KOTH_ENV_STATES.UNCONFIGURED;
  const applied = data?.versions.find((item) => item.version_id === state?.applied_version_id);
  const pending = ["QUEUED", "APPLYING"].includes(state?.state);
  const observedApplied = useRef(null);
  useEffect(() => {
    if (state?.state === "READY" && state.applied_version_id && observedApplied.current !== state.applied_version_id) {
      const previous = observedApplied.current;
      observedApplied.current = state.applied_version_id;
      if (previous) onApplied?.();
    }
  }, [state?.state, state?.applied_version_id, onApplied]);

  function reset() {
    sequence.current += 1; fileContent.current = ""; saveId.current = null;
    setEdits({}); setAdded(EMPTY_ENTRY); setFileName(""); setReview(null); setError("");
  }

  useEffect(() => { reset(); applyId.current = null; }, [selected?.version_id, container?.name, method]);
  useEffect(() => () => { sequence.current += 1; fileContent.current = ""; }, []);
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(() => { if (document.visibilityState !== "hidden") resource.reload(); }, 5000);
    return () => clearInterval(timer);
  }, [pending, resource.reload]);

  function changed() { setReview(null); setError(""); saveId.current = null; sequence.current += 1; }
  function changeRow(name, patch) {
    changed(); setEdits((current) => ({ ...current, [name]: { ...(current[name] ?? { action: "update" }), ...patch } }));
  }
  function body() {
    if (method === "manual") return manualKothEnvironment(selected.version_id, container, edits, added);
    if (method === "file" && !fileName) throw new Error("env 파일을 선택해주세요");
    return kothEnvironmentBody(selected.version_id, container.name, method === "repository" ? "repository" : "file", fileContent.current);
  }
  function checked(response) {
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "설정을 확인하지 못했습니다");
    return response.data.data;
  }
  function message(caught) { return caught?.response?.data?.message || caught.message || "요청 결과를 확인하지 못했습니다"; }

  async function selectFile(event) {
    changed(); fileContent.current = ""; setFileName("");
    const file = event.target.files?.[0]; if (!file) return;
    const current = sequence.current;
    setWorking(true);
    try {
      const content = await readEnvironmentFile(file);
      if (current !== sequence.current) return;
      fileContent.current = content; setFileName(file.name);
    } catch (caught) { if (current === sequence.current) setError(message(caught)); }
    finally { setWorking(false); }
  }
  async function preview() {
    const current = ++sequence.current;
    setWorking(true); setError(""); setReview(null);
    try {
      const result = checked(await previewAdminKothEnvironment(id, body()));
      if (current === sequence.current) setReview(result);
    } catch (caught) { if (current === sequence.current) setError(message(caught)); }
    finally { setWorking(false); }
  }
  async function save() {
    if (busy || submitting.current || !review?.can_save) return;
    submitting.current = true; setWorking(true); setError("");
    saveId.current ??= crypto.randomUUID();
    try {
      const result = checked(await saveAdminKothEnvironment(id, { ...body(), request_id: saveId.current }));
      setVersionId(result.version_id); setMethod(null); reset();
      setNotice(`버전 ${result.version}을 저장했습니다 ‘이 설정 적용’을 선택하면 VM에 반영됩니다`);
      await resource.reload();
    } catch (caught) { setError(message(caught)); }
    finally { submitting.current = false; setWorking(false); }
  }
  async function apply() {
    if (busy || submitting.current || !data.can_apply) return;
    submitting.current = true; setWorking(true); setError("");
    applyId.current ??= crypto.randomUUID();
    try {
      const result = checked(await applyAdminKothEnvironment(id, selected.version_id, applyId.current));
      applyId.current = null;
      setNotice(result.superseded ? "이전 요청은 처리됐습니다 현재 적용 상태를 확인해주세요" : "VM에 적용을 요청했습니다 아래 상태에서 완료 여부를 확인해주세요");
      await resource.reload();
    } catch (caught) { setError(message(caught)); }
    finally { submitting.current = false; setWorking(false); }
  }

  return <section aria-label="KOTH 환경변수" className={styles.panel}>
    <AdminStatusMessage status={resource.status} error={resource.error} onRetry={resource.retry} hasData={Boolean(data)}/>
    {notice && <p role="status" className={ui.notice}>{notice}</p>}
    {error && <p role="alert" className={ui.errorText}>{error}</p>}
    {data && <>
      <div className={ui.panelHead}><div><h4>실행 환경변수</h4><p>저장한 버전과 VM에 적용된 버전을 구분해 확인합니다</p></div><AdminBadge tone={status.tone}>{status.label}</AdminBadge></div>
      <p className={ui.fieldHint}>최근 적용 확인 {applied ? `버전 ${applied.version}` : "아직 없음"} · VM 최근 확인 {state.checked_at ? formatAdminTime(state.checked_at, { seconds: true }) : "아직 없음"}</p>
      {state.error_message && <p role="alert" className={ui.errorText}>{state.error_message}</p>}
      {!selected ? <p className={ui.empty}>실행 이미지와 VM 연결이 준비되면 컨테이너 설정이 표시됩니다</p> : <>
        <div className={ui.rowActions}>
          <label className={ui.inlineField}>설정 버전<select aria-label="KOTH 설정 버전" className={ui.select} value={selected.version_id} disabled={busy}
            onChange={(event) => { setNotice(""); setVersionId(event.target.value); }}>
            {data.versions.map((item) => <option key={item.version_id} value={item.version_id}>버전 {item.version}{item.version_id === state.applied_version_id ? " · 적용 확인" : item.version_id === state.desired_version_id ? " · 적용 요청" : " · 저장됨"}</option>)}
          </select></label>
          <button type="button" className={ui.button} onClick={resource.reload} disabled={busy}>상태 새로고침</button>
          <button type="button" className={ui.primary} onClick={apply} disabled={busy || !data.can_apply || (pending && state.desired_version_id === selected.version_id) || (state.state === "READY" && state.applied_version_id === selected.version_id)}>이 설정 적용</button>
        </div>
        <p className={ui.fieldHint}>소스 {selected.source_revision.slice(0, 12)} · 저장자 {selected.created_by} · {formatAdminTime(selected.created_at, { seconds: false })}</p>
        {challenge.status === "ACTIVE" && <p className={ui.callout}>경기 진행 중에는 새 설정을 적용하지 않습니다</p>}
        {selected.source_revision !== data.source_revision && <p className={ui.callout}>{selected.publication_id && data.can_apply ? "새 발행본의 설정입니다 적용이 확인되면 지문과 참가자 파일도 이 버전으로 전환합니다" : "현재 실행 소스와 다른 버전입니다 운영 연결과 필수 설정을 확인해주세요"}</p>}
        {pending && <p role="status" className={ui.callout}>실행 VM이 켜져 있어야 적용할 수 있습니다 적용 확인으로 바뀔 때까지 완료 여부를 확인해주세요</p>}
        <div className={ui.rowActions}><label className={ui.inlineField}>컨테이너<select aria-label="KOTH 환경변수 컨테이너" className={ui.select} value={container.name} disabled={busy} onChange={(event) => setContainerName(event.target.value)}>
          {selected.containers.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.entries.length}개 항목</option>)}
        </select></label></div>
        <div className={styles.tableWrap}><table className={ui.settingsTable} aria-label={`${container.name} KOTH 환경변수`}>
          <thead><tr><th>이름</th><th>값 또는 상태</th><th>구분</th></tr></thead><tbody>
            {container.entries.map((row) => <tr key={row.name}>
              <td className={ui.mono}>{row.name}</td>
              <td>{method === "manual" && !row.locked ? <div className={ui.cellStack}>
                <input aria-label={`${row.name} 수정 값`} type={row.kind === "secret" ? "password" : "text"} autoComplete="new-password" className={ui.input}
                  disabled={busy || edits[row.name]?.action === "unset"} value={edits[row.name]?.value ?? row.value ?? ""}
                  placeholder={row.kind === "secret" ? "입력하지 않으면 저장값 유지" : "값"} onChange={(event) => changeRow(row.name, { action: "update", value: event.target.value })}/>
                {!row.required && <label className={ui.check}><input type="checkbox" aria-label={`${row.name} 설정하지 않음`} checked={edits[row.name]?.action === "unset"} disabled={busy}
                  onChange={(event) => { if (event.target.checked) changeRow(row.name, { action: "unset" }); else { changed(); setEdits((old) => { const next = { ...old }; delete next[row.name]; return next; }); } }}/>설정하지 않음</label>}
              </div> : row.resolution === "unset" ? "설정하지 않음" : row.kind === "secret" ? "암호화된 저장값" : row.value === "" ? "(빈 문자열)" : <span className={ui.mono}>{row.value}</span>}</td>
              <td>{row.locked ? "보호된 연동값" : row.kind === "secret" ? "비밀값" : "일반 값"}{row.required ? " · 필수" : " · 선택"}</td>
            </tr>)}
          </tbody></table></div>
        <p className={ui.fieldHint}>연동 토큰과 문제 식별자는 보호합니다 변경한 설정은 새 버전으로 저장되며 실행 이미지와 네트워크 설정은 유지합니다</p>
        <div className={ui.rowActions}>{[{ id: "manual", label: "직접 수정" }, { id: "file", label: "env 파일 불러오기" }, { id: "repository", label: "저장소와 비교" }].map((item) =>
          <button type="button" key={item.id} className={ui.button} aria-pressed={method === item.id} disabled={busy} onClick={() => setMethod(method === item.id ? null : item.id)}>{item.label}</button>)}</div>
        {method === "manual" && <div className={ui.editorBox}><h4>새 항목 추가</h4><div className={styles.newEntry}>
          <input aria-label="새 KOTH 환경변수 이름" className={ui.input} placeholder="변수 이름" disabled={busy} value={added.name} onChange={(event) => { changed(); setAdded({ ...added, name: event.target.value }); }}/>
          <select aria-label="새 KOTH 환경변수 종류" className={ui.select} disabled={busy} value={added.kind} onChange={(event) => { changed(); setAdded({ ...added, kind: event.target.value }); }}><option value="secret">비밀값</option><option value="env">일반 값</option></select>
          <input aria-label="새 KOTH 환경변수 값" className={ui.input} type={added.kind === "secret" ? "password" : "text"} autoComplete="new-password" disabled={busy} value={added.value} onChange={(event) => { changed(); setAdded({ ...added, value: event.target.value }); }}/>
          <label className={ui.check}><input type="checkbox" checked={added.required} disabled={busy} onChange={(event) => { changed(); setAdded({ ...added, required: event.target.checked }); }}/>필수</label>
        </div></div>}
        {method === "file" && <label className={ui.labelField}>컨테이너 env 파일<input type="file" aria-label="KOTH env 파일" accept=".env,.txt,text/plain" disabled={busy} onChange={selectFile} className={ui.fileInput}/></label>}
        {method === "repository" && <p className={ui.fieldHint}>실행 이미지와 같은 커밋의 env 파일을 읽습니다 운영에서 따로 정한 값과 연동값은 유지합니다</p>}
        {review && <div className={ui.callout}><p>{review.can_save ? "아래 변경을 새 설정 버전으로 저장합니다" : "바뀐 설정이 없습니다"}</p>
          <ul>{review.entries.map((row) => <li key={row.name}>{row.name} · {ACTIONS[row.action]}</li>)}</ul></div>}
        {method && <div className={ui.rowActions}><button type="button" className={ui.button} disabled={busy} onClick={preview}>설정 확인</button>
          <button type="button" className={ui.primary} disabled={busy || !review?.can_save} onClick={save}>새 설정 버전 저장</button></div>}
      </>}
    </>}
  </section>;
}
