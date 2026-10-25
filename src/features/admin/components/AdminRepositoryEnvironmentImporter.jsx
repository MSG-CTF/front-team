import { useEffect, useRef, useState } from "react";
import { getChallengeRepositoryEnvironment, previewChallengeRepositoryEnvironment } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { repositoryEnvironmentRequest, repositoryEnvironmentRows } from "../utils/adminRepositoryEnvironment.js";
import styles from "./AdminWorkspace.module.css";

export default function AdminRepositoryEnvironmentImporter({ challengeId, release, secrets, busy, onSave, initialContainer }) {
  // 못 채운 값이 있는 컨테이너에서 넘어오면 그 컨테이너부터 연다
  const [container, setContainer] = useState(release.containers.some((item) => item.name === initialContainer) ? initialContainer : release.containers[0].name);
  const [source, setSource] = useState(null);
  const [rows, setRows] = useState([]);
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const requestId = useRef(null);
  const submitting = useRef(false);
  const unavailable = busy || working;
  const sourceFiles = source?.source_files ?? [];
  useEffect(() => () => { sequence.current += 1; }, []);

  function clear() {
    sequence.current += 1;
    setSource(null); setRows([]); setReview(null); setError(""); setWorking(false);
    requestId.current = null;
  }

  async function load() {
    const current = ++sequence.current;
    setWorking(true); setError(""); setReview(null); requestId.current = null;
    try {
      const response = await getChallengeRepositoryEnvironment(challengeId, release.release_id, container);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "저장소 설정을 불러오지 못했습니다");
      if (current !== sequence.current) return;
      setSource(response.data.data);
      setRows(repositoryEnvironmentRows(response.data.data.entries));
    } catch (requestError) {
      if (current === sequence.current) setError(requestError?.response?.data?.message || requestError.message);
    } finally { if (current === sequence.current) setWorking(false); }
  }

  function change(name, patch) {
    setRows((current) => current.map((row) => row.name === name ? { ...row, ...patch,
      ...(Object.hasOwn(patch, "secret_name") ? { secret_id: undefined, version: undefined } : {}),
    } : row));
    setReview(null); setError(""); requestId.current = null;
  }

  async function check() {
    const current = ++sequence.current;
    setWorking(true); setError(""); setReview(null);
    try {
      const body = repositoryEnvironmentRequest(container, source.source_token, rows);
      const response = await previewChallengeRepositoryEnvironment(challengeId, release.release_id, body);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "설정을 확인하지 못했습니다");
      if (current !== sequence.current) return;
      setReview(response.data.data);
      setRows((previous) => previous.map((row) => {
        const checked = response.data.data.entries.find((entry) => entry.name === row.name);
        return checked ? { ...row, ...Object.fromEntries(Object.entries(checked).filter(([key]) => ["value", "secret_id", "version", "action"].includes(key))) } : row;
      }));
    } catch (requestError) {
      if (current === sequence.current) setError(requestError?.response?.data?.message || requestError.message);
    } finally { if (current === sequence.current) setWorking(false); }
  }

  async function save() {
    if (submitting.current || unavailable || !review?.can_import) return;
    submitting.current = true;
    requestId.current ??= crypto.randomUUID();
    try {
      const saved = await onSave({ ...repositoryEnvironmentRequest(container, source.source_token, rows), request_id: requestId.current });
      if (saved) clear();
    } finally { submitting.current = false; }
  }

  return <section className={styles.importerStack} aria-label="저장소 환경변수 가져오기">
    <p className={styles.panelIntro}>문제의 .env에 저장된 값을 불러옵니다 비밀값은 화면에서만 가려집니다</p>
    <div className={styles.rowActions}>
      <label className={styles.inlineField}>컨테이너
        <select className={styles.select} aria-label="저장소 적용 컨테이너" value={container} disabled={unavailable}
          onChange={(event) => { clear(); setContainer(event.target.value); }}>
          {release.containers.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" className={styles.button} disabled={unavailable} onClick={load}>{source ? "저장소 다시 불러오기" : "저장소에서 불러오기"}</button>
    </div>
    {working && <p role="status">저장소 설정을 확인하고 있습니다</p>}
    {error && <p role="alert" className={styles.errorText}>{error}</p>}
    {source && <>
      <div className={styles.splitRow}>
        <p>{rows.filter((row) => row.selected).length} / {rows.length}개 선택</p>
        {source.source_url ? <a href={source.source_url} target="_blank" rel="noreferrer" className={styles.secondary}>확인한 소스 · {source.source_revision.slice(0, 8)}</a>
          : <span className={styles.secondary}>로컬 원본 · {source.source_revision.slice(0, 8)}</span>}
      </div>
      <details className={styles.details}><summary>불러온 원본 파일 {sourceFiles.length}개</summary>
        <ul className={styles.detailsList}>{sourceFiles.map((path) => <li key={path} className={styles.mono}>{path}</li>)}</ul>
      </details>
      {source.warnings.length > 0 && <details className={styles.details}><summary>직접 확인할 내용 {source.warnings.length}개</summary>
        <ul className={styles.detailsList}>{source.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      </details>}
      {rows.length === 0 ? <p className={styles.empty}>{sourceFiles.includes(`env/${container}.env`) ? "이 컨테이너의 .env에는 지정된 환경변수가 없습니다" : "이 컨테이너에서 사용하는 환경변수 선언을 찾지 못했습니다"}</p> : <>
        <datalist id="repository-secret-names">{[...new Set(secrets.map((secret) => secret.name))].map((name) => <option key={name} value={name}/>)}</datalist>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.repositoryTable}`} aria-label="저장소 환경변수">
            <thead><tr>{["가져오기", "이름", "종류", "값 또는 연결", "필수"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.name}>
              <td><input type="checkbox" aria-label={`${row.name} 가져오기`} checked={row.selected} disabled={unavailable} onChange={(event) => change(row.name, { selected: event.target.checked })}/></td>
              <td><span className={styles.mono}>{row.name}</span>
                {row.resolution !== "configured" && <span className={styles.secondary}>
                  {{ code_default: "코드 기본값", author_example: "출제자 예시 값", needs_value: "원본에서 값 확인 필요", conflict: "원본 값 확인 필요", unset: "원본에 값 없이 이름만 선언됨" }[row.resolution]}
                </span>}
              </td>
              <td><select aria-label={`${row.name} 종류`} className={styles.select} value={row.kind} disabled={unavailable || row.locked_secret}
                onChange={(event) => change(row.name, { kind: event.target.value, mode: "repository", override: undefined })}>
                <option value="env">일반 설정</option><option value="secret">비밀값</option>
              </select></td>
              <td className={styles.valueCell}>
                {row.mode === "unset" ? <div className={styles.cellStack}><span>설정하지 않음 · 주입하지 않습니다</span>
                  <button type="button" className={styles.button} disabled={unavailable} onClick={() => change(row.name, { mode: "manual", override: "" })}>값 입력</button></div>
                : row.kind === "env" ? <div className={styles.cellStack}><input aria-label={`${row.name} 값`} className={styles.input} value={row.override ?? row.value ?? ""}
                  placeholder={row.has_value ? "설정 확인 후 표시" : "값 입력"} disabled={unavailable}
                  onChange={(event) => change(row.name, { override: event.target.value, mode: "manual" })}/>
                  {row.resolution === "unset" && row.name !== "FLAG" && <button type="button" className={styles.button} disabled={unavailable}
                    onClick={() => change(row.name, { mode: "unset", required: false, override: undefined })}>설정하지 않음</button>}</div>
                  : <div className={styles.cellStack}>
                    <select aria-label={`${row.name} 값 선택`} className={styles.select} value={row.mode} disabled={unavailable}
                      onChange={(event) => change(row.name, { mode: event.target.value,
                        ...(event.target.value === "unset" ? { required: false } : {}), override: event.target.value === "manual" ? "" : undefined })}>
                      <option value="existing">저장된 비밀값 사용</option>
                      <option value="repository" disabled={!row.has_value}>출제자 원본값 사용</option>
                      <option value="manual">새 값 입력</option>
                      {row.resolution === "unset" && row.name !== "FLAG" && <option value="unset">설정하지 않음</option>}
                    </select>
                    {row.mode === "repository" && <span className={styles.secondary}>원본값을 그대로 저장합니다</span>}
                    {row.mode === "manual" && <input type="password" aria-label={`${row.name} 새 값`} className={styles.input} autoComplete="new-password"
                      value={row.override ?? ""} disabled={unavailable} onChange={(event) => change(row.name, { override: event.target.value })}/>}
                    <input aria-label={`${row.name} 비밀값 이름`} className={styles.input} list="repository-secret-names" value={row.secret_name}
                      disabled={unavailable || row.name === "FLAG"} onChange={(event) => change(row.name, { secret_name: event.target.value })}/>
                    {row.mode === "existing" && row.version && <span className={styles.secondary}>버전 {row.version} 연결</span>}
                  </div>}
              </td>
              <td><input type="checkbox" aria-label={`${row.name} 필수`} checked={row.mode === "unset" ? false : row.required} disabled={unavailable || row.mode === "unset"} onChange={(event) => change(row.name, { required: event.target.checked })}/></td>
            </tr>)}</tbody>
          </table>
        </div>
        {review?.errors.length > 0 && <ul role="alert" className={styles.errorList}>{review.errors.map((message) => <li key={message}>{message}</li>)}</ul>}
        {review?.can_import && <p role="status" className={styles.notice}>선택한 {review.entries.length}개 항목을 확인했습니다 나머지 설정은 유지됩니다</p>}
        <div className={styles.rowActions}>
          <button type="button" className={styles.button} disabled={unavailable} onClick={check}>설정 확인</button>
          <button type="button" className={styles.primary} disabled={unavailable || !review?.can_import} onClick={save}>새 설정 버전 저장</button>
        </div>
      </>}
    </>}
  </section>;
}
