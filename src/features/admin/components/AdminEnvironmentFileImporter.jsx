import { useEffect, useRef, useState } from "react";
import { previewChallengeEnvironmentFile } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { environmentFileEntries, readEnvironmentFile } from "../utils/adminEnvironmentFile.js";
import styles from "./AdminWorkspace.module.css";

const BUTTON = styles.button;
const INPUT = styles.input;
const ACTION = { add: "추가", update: "변경", keep: "유지" };

export default function AdminEnvironmentFileImporter({ challengeId, release, secrets, busy, onSave }) {
  const [container, setContainer] = useState(release.containers[0].name);
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState([]);
  const [review, setReview] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const content = useRef("");
  const input = useRef(null);
  const sequence = useRef(0);
  const requestId = useRef(null);
  const submitting = useRef(false);
  const unavailable = busy || working;
  useEffect(() => () => { sequence.current += 1; content.current = ""; }, []);

  function clear(resetInput = true) {
    sequence.current += 1;
    content.current = "";
    requestId.current = null;
    setFilename(""); setRows([]); setReview(null); setError(""); setWorking(false);
    if (resetInput && input.current) input.current.value = "";
  }

  async function preview(text, declarations, currentSequence) {
    const body = { container, content: text, ...(declarations ? { entries: declarations } : {}) };
    const response = await previewChallengeEnvironmentFile(challengeId, release.release_id, body);
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "파일을 확인하지 못했습니다");
    if (sequence.current !== currentSequence) return;
    setRows(response.data.data.entries);
    setReview(response.data.data);
    requestId.current = null;
  }

  async function selectFile(event) {
    const file = event.target.files?.[0];
    clear(false);
    if (!file) return;
    const currentSequence = sequence.current;
    setWorking(true);
    try {
      const text = await readEnvironmentFile(file);
      if (sequence.current !== currentSequence) return;
      content.current = text;
      setFilename(file.name);
      await preview(text, null, currentSequence);
    } catch (readError) {
      if (sequence.current === currentSequence) setError(readError?.response?.data?.message || readError.message);
    } finally { if (sequence.current === currentSequence) setWorking(false); }
  }

  function change(name, patch) {
    setRows((current) => current.map((row) => row.name !== name ? row : {
      ...row, ...patch,
      ...(Object.hasOwn(patch, "secret_name") ? { secret_id: undefined, version: undefined } : {}),
    }));
    setReview(null);
    requestId.current = null;
    setError("");
  }

  async function check() {
    const currentSequence = ++sequence.current;
    setWorking(true); setError("");
    try { await preview(content.current, environmentFileEntries(rows), currentSequence); }
    catch (requestError) {
      if (sequence.current === currentSequence) setError(requestError?.response?.data?.message || requestError.message);
    } finally { if (sequence.current === currentSequence) setWorking(false); }
  }

  async function save() {
    if (submitting.current || unavailable || !review?.can_import) return;
    submitting.current = true;
    requestId.current ??= crypto.randomUUID();
    try {
      const saved = await onSave({ container, content: content.current,
        entries: environmentFileEntries(rows), request_id: requestId.current });
      if (saved) clear();
    } finally { submitting.current = false; }
  }

  return <section className={`${styles.importer} ${styles.importerStack}`} aria-label="환경변수 파일 가져오기">
    <div className={styles.editorIntro}>
      <h4>컨테이너 선택 → 파일 열기 → 내용 확인</h4>
      <p className={styles.fieldHint}>파일에 있는 항목만 바꿉니다 나머지 설정은 유지합니다</p>
    </div>
    <div className={`${styles.formGrid} ${styles.formGrid2}`}>
      <label className={styles.labelField}>적용할 컨테이너
        <select aria-label=".env 적용 컨테이너" className={styles.select} value={container} disabled={unavailable}
          onChange={(event) => { clear(); setContainer(event.target.value); }}>
          {release.containers.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.labelField}>.env 파일
        <input ref={input} type="file" aria-label=".env 파일" accept=".env,.txt,text/plain" disabled={unavailable}
          className={styles.fileInput} onChange={selectFile}/>
      </label>
    </div>
    <details className={styles.importGuide}>
      <summary>파일 작성 방법</summary>
      <p>한 줄에 이름=값을 입력해주세요 이름은 대문자·숫자·밑줄을 사용합니다</p>
      <p>UTF-8과 Windows·Linux 줄바꿈을 지원합니다 빈 줄과 #으로 시작하는 주석 줄은 무시합니다</p>
      <p>값 양끝의 따옴표 한 쌍은 제거하고, $·#·=·역슬래시는 그대로 저장합니다 여러 줄 값과 변수 치환은 지원하지 않습니다</p>
      <p>FLAG=처럼 값을 비워두면 이 릴리스에 연결된 비밀값을 계속 사용할 수 있습니다</p>
    </details>
    {working && <p role="status">파일을 확인하고 있습니다</p>}
    {error && <p role="alert" className={styles.errorText}>{error}</p>}
    {rows.length > 0 && <>
      <div className={styles.splitRow}>
        <p>{filename} · {rows.length}개 항목</p>
        <button type="button" className={BUTTON} disabled={unavailable} onClick={clear}>가져오기 취소</button>
      </div>
      <p className={styles.fieldHint}>새 항목은 비밀값으로 분류합니다 일반 설정에 해당하는 항목만 바꿔주세요</p>
      <datalist id="env-import-secret-names">{[...new Set(secrets.map((secret) => secret.name))].map((name) => <option key={name} value={name}/>)}</datalist>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.importTable}`}>
          <thead><tr>{["이름", "종류", "값 / 비밀값 연결", "필수", "변경"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.name} className={styles.topRow}>
            <td className={styles.mono}>{row.name}</td>
            <td>
              <select aria-label={`${row.name} 종류`} className={styles.select} value={row.kind} disabled={unavailable || row.locked_secret}
                onChange={(event) => change(row.name, { kind: event.target.value })}>
                <option value="env">일반 설정</option><option value="secret">비밀값</option>
              </select>
            </td>
            <td className={styles.valueCell}>
              {row.kind === "env" ? <p className={styles.monoValue}>{row.value ?? "설정 확인을 누르면 값이 표시됩니다"}</p> : <div className={styles.cellStack}>
                <p className={styles.fieldHint}>{row.use_existing ? `저장된 값 사용${row.version ? " · 버전 " + row.version : ""}` : row.has_value ? "파일의 값을 암호화해 저장" : "파일에 값이 없습니다"}</p>
                <input aria-label={`${row.name} 비밀값 이름`} list="env-import-secret-names" value={row.secret_name ?? ""}
                  autoComplete="off" className={INPUT} disabled={unavailable || row.name === "FLAG"}
                  onChange={(event) => change(row.name, { secret_name: event.target.value })}/>
                <label className={styles.check}><input type="checkbox" checked={Boolean(row.use_existing)}
                  disabled={unavailable || row.has_value} onChange={(event) => change(row.name, { use_existing: event.target.checked })}/>
                  저장된 비밀값 연결</label>
              </div>}
            </td>
            <td><input type="checkbox" aria-label={`${row.name} 필수`} checked={row.required}
              disabled={unavailable} onChange={(event) => change(row.name, { required: event.target.checked })}/></td>
            <td className={styles.muted}>{review ? ACTION[row.action] : "확인 필요"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {review?.preserved_names.length > 0 && <p className={styles.fieldHint}>기존 값 유지: {review.preserved_names.join(", ")}</p>}
      {review?.other_containers.length > 0 && <p className={styles.fieldHint}>설정 유지: {review.other_containers.join(", ")}</p>}
      {review?.errors.length > 0 && <ul role="alert" className={styles.errorList}>{review.errors.map((message) => <li key={message}>{message}</li>)}</ul>}
      <div className={styles.rowActions}>
        <button type="button" className={BUTTON} disabled={unavailable} onClick={check}>설정 확인</button>
        <button type="button" className={styles.primary} disabled={unavailable || !review?.can_import} onClick={save}>새 설정 버전 저장</button>
      </div>
      <p className={styles.fieldHint}>저장 후 ‘이 버전 사용’을 선택하면 새 인스턴스부터 적용됩니다</p>
    </>}
  </section>;
}
