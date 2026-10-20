import { useEffect, useRef, useState } from "react";
import { activateChallengeRelease, deriveChallengeRelease, getChallengeReleases, getChallengeRuntimeSecrets, importChallengeEnvironmentFile, importChallengeRepositoryEnvironment, registerChallengeRelease, registerChallengeRuntimeSecret, configureChallengeReleaseFiles } from "../../../api/admin.js";
import AdminReleaseFilesEditor from "./AdminReleaseFilesEditor.jsx";
import AdminDeploymentTestPanel from "./AdminDeploymentTestPanel.jsx";
import AdminCollectedFilesPanel, { RepositoryFilesDetails } from "./AdminCollectedFilesPanel.jsx";
import AdminActiveFlagBindings from "./AdminActiveFlagBindings.jsx";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { buildDerivedSettings, parseReleaseFile, releaseRequirements, releaseSettingsDraft, validateRuntimeSecret } from "../utils/adminRuntime.js";
import AdminDialog from "./AdminDialog.jsx";
import AdminEnvironmentFileImporter from "./AdminEnvironmentFileImporter.jsx";
import AdminRepositoryEnvironmentImporter from "./AdminRepositoryEnvironmentImporter.jsx";
import AdminTabs from "./AdminTabs.jsx";
import styles from "./AdminWorkspace.module.css";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";

const BUTTON = styles.button;
const INPUT = styles.input;

async function loadRuntime(challengeId, config) {
  const [releases, secrets] = await Promise.all([getChallengeReleases(challengeId, config), getChallengeRuntimeSecrets(challengeId, config)]);
  for (const response of [releases, secrets]) {
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "실행 설정을 불러오지 못했습니다");
  }
  return { data: { code: "SUCCESS", data: { ...releases.data.data, secrets: secrets.data.data.secrets } } };
}

function RuntimeSettingsEditor({ release, secrets, busy, onSave }) {
  const [draft, setDraft] = useState(() => releaseSettingsDraft(release));
  const [error, setError] = useState("");
  const names = [...new Set(secrets.map((secret) => secret.name))].sort();

  function changeRow(containerIndex, field, rowIndex, key, value) {
    setDraft((current) => current.map((container, index) => index !== containerIndex ? container : {
      ...container, [field]: container[field].map((row, position) => position === rowIndex ? { ...row, [key]: value } : row),
    }));
  }

  function addRow(containerIndex, field) {
    setDraft((current) => current.map((container, index) => index !== containerIndex ? container : {
      ...container, [field]: [...container[field], { name: field === "secret_env" ? "FLAG" : "", value: field === "secret_env" ? "flag" : "" }],
    }));
  }

  function removeRow(containerIndex, field, rowIndex) {
    setDraft((current) => current.map((container, index) => index !== containerIndex ? container : {
      ...container, [field]: container[field].filter((_, position) => position !== rowIndex),
    }));
  }

  function submit(event) {
    event.preventDefault();
    try { setError(""); onSave(buildDerivedSettings(draft, secrets)); }
    catch (validationError) { setError(validationError.message); }
  }

  return <form onSubmit={submit} className="mt-4 space-y-4 rounded border border-admin-divider/50 bg-white/30 p-3">
    <div><h4 className="text-base">이 이미지의 주입 설정 바꾸기</h4><p className="text-admin-muted">문제 파일과 이미지는 건드리지 않습니다 저장하면 새 릴리스 버전이 생기고, 선택해서 사용해야 새 인스턴스에 적용됩니다</p><p className="mt-1 text-admin-muted">이미지 안에 들어 있는 플래그나 파일은 이 설정으로 지워지지 않습니다</p></div>
    <datalist id="stored-runtime-secret-names">{names.map((name) => <option key={name} value={name}/>)}</datalist>
    {draft.map((container, containerIndex) => <section key={container.name} className="space-y-3 border-t border-admin-divider/50 pt-3">
      <h5 className="font-kode-mono">{container.name}</h5>
      <div><p className="mb-1">일반 환경변수</p>{container.env.map((row, rowIndex) => <div key={rowIndex} className="mb-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input aria-label={`${container.name} 환경변수 이름 ${rowIndex + 1}`} placeholder="이름" value={row.name} disabled={busy} onChange={(event) => changeRow(containerIndex, "env", rowIndex, "name", event.target.value)} className={INPUT + " font-kode-mono"}/>
        <input aria-label={`${container.name} 환경변수 값 ${rowIndex + 1}`} placeholder="값" value={row.value} disabled={busy} onChange={(event) => changeRow(containerIndex, "env", rowIndex, "value", event.target.value)} className={INPUT + " font-kode-mono"}/>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => removeRow(containerIndex, "env", rowIndex)}>삭제</button>
      </div>)}<button type="button" className={BUTTON} disabled={busy} onClick={() => addRow(containerIndex, "env")}>환경변수 추가</button></div>
      <div><p className="mb-1">비밀값 연결</p>{container.secret_env.map((row, rowIndex) => <div key={rowIndex} className="mb-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input aria-label={`${container.name} 비밀값 주입 이름 ${rowIndex + 1}`} placeholder="주입 이름 (예: FLAG)" value={row.name} disabled={busy} onChange={(event) => changeRow(containerIndex, "secret_env", rowIndex, "name", event.target.value)} className={INPUT + " font-kode-mono"}/>
        <input aria-label={`${container.name} 저장된 비밀값 이름 ${rowIndex + 1}`} list="stored-runtime-secret-names" placeholder="저장된 이름 (예: flag)" value={row.value} disabled={busy} onChange={(event) => changeRow(containerIndex, "secret_env", rowIndex, "value", event.target.value)} className={INPUT + " font-kode-mono"}/>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => removeRow(containerIndex, "secret_env", rowIndex)}>삭제</button>
      </div>)}<button type="button" className={BUTTON} disabled={busy} onClick={() => addRow(containerIndex, "secret_env")}>비밀값 연결 추가</button></div>
    </section>)}
    {error && <p role="alert" className="text-admin-failed">{error}</p>}
    <button type="submit" className={BUTTON} disabled={busy}>새 설정 버전 저장</button>
  </form>;
}

export default function AdminChallengeRuntimeDialog({ challenge, onClose, embedded = false, active = true, initialReleaseId = "", onBusyChange, onChanged }) {
  const [releaseId, setReleaseId] = useState(initialReleaseId);
  const [panel, setPanel] = useState("overview");
  const [environmentMethod, setEnvironmentMethod] = useState(null);
  const [showSecretHistory, setShowSecretHistory] = useState(false);
  const [showFlagBindings, setShowFlagBindings] = useState(false);
  const focusSecret = useRef(false);
  const [name, setName] = useState("flag");
  const [value, setValue] = useState("");
  const [upload, setUpload] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const busy = saving || testBusy;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const [confirming, setConfirming] = useState(false);
  const pending = useRef(false);
  const fileSequence = useRef(0);
  const fileInput = useRef(null);
  const secretNameInput = useRef(null);
  useEffect(() => {
    if (panel === "secrets" && focusSecret.current) {
      secretNameInput.current?.focus();
      focusSecret.current = false;
    }
  }, [panel]);
  const runtime = useAdminResource((config) => loadRuntime(challenge.challenge_id, config), [challenge.challenge_id], "실행 설정을 불러오지 못했습니다");
  useEffect(() => () => { fileSequence.current += 1; }, []);
  const releases = runtime.data?.releases ?? [];
  const selected = releases.find((release) => release.release_id === releaseId) ?? releases.find((release) => release.is_current) ?? releases[0];
  const validationError = validateRuntimeSecret(name.trim(), value);
  const loading = runtime.status === "loading";
  const storedSecrets = runtime.data?.secrets ?? [];
  const visibleSecrets = showSecretHistory ? storedSecrets : storedSecrets.filter((secret) => secret.is_latest);
  const requirements = upload ? releaseRequirements(upload.artifact, runtime.data?.secrets ?? []) : null;
  const slugMismatch = Boolean(upload && challenge.challenge_slug && upload.artifact.challenge_slug !== challenge.challenge_slug);

  async function mutate(action, success) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await action();
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "요청을 처리하지 못했습니다");
      setConfirming(false);
      const refreshed = await runtime.reload();
      setNotice(refreshed ? success : "저장은 처리됐지만 최신 상태를 조회하지 못했습니다");
      await onChanged?.();
      return response.data.data ?? true;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "요청을 처리하지 못했습니다");
      return false;
    } finally { pending.current = false; setBusy(false); }
  }

  async function saveSecret(event) {
    event.preventDefault();
    if (validationError) return;
    const secretValue = value;
    setValue("");
    await mutate(() => registerChallengeRuntimeSecret(challenge.challenge_id, { name: name.trim(), value: secretValue }), "비밀값을 저장했습니다 새 설정 버전을 만들면 이 값이 연결됩니다");
  }

  async function readFile(event) {
    const sequence = ++fileSequence.current;
    const file = event.target.files?.[0];
    setUpload(null);
    setError("");
    if (!file) return;
    if (file.size > 1024 * 1024) { setError("릴리스 파일은 1MB 이하여야 합니다"); return; }
    try {
      const artifact = parseReleaseFile(await file.text());
      if (sequence === fileSequence.current) setUpload({ artifact, filename: file.name });
    } catch (readError) {
      if (sequence === fileSequence.current) setError(readError.message);
    }
  }

  async function saveRelease(event) {
    event.preventDefault();
    if (!upload || slugMismatch || requirements.missingSecrets.length > 0) return;
    const saved = await mutate(() => registerChallengeRelease(challenge.challenge_id, { artifact: upload.artifact, note: "관리자 릴리스 파일 등록" }), "릴리스를 등록했습니다 내용을 확인한 뒤 사용할 버전을 선택해주세요");
    if (saved) { setUpload(null); setReleaseId(saved.release_id ?? ""); setPanel("overview"); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function saveDerived(sourceId, settings) {
    const saved = await mutate(() => deriveChallengeRelease(challenge.challenge_id, sourceId, settings), "새 설정 버전을 저장했습니다 내용을 확인한 뒤 사용할 버전을 선택해주세요");
    if (saved) { setReleaseId(saved.release_id ?? ""); setEnvironmentMethod(null); setPanel("overview"); }
  }

  async function saveEnvironmentFile(sourceId, body) {
    const saved = await mutate(() => importChallengeEnvironmentFile(challenge.challenge_id, sourceId, body), ".env 설정 버전을 저장했습니다 내용을 확인한 뒤 이 버전 사용을 선택해주세요");
    if (saved) { setReleaseId(saved.release_id ?? ""); setEnvironmentMethod(null); setPanel("overview"); }
    return saved;
  }

  async function saveRepositoryEnvironment(sourceId, body) {
    const saved = await mutate(() => importChallengeRepositoryEnvironment(challenge.challenge_id, sourceId, body), "저장소 설정으로 새 버전을 저장했습니다 내용을 확인한 뒤 이 버전 사용을 선택해주세요");
    if (saved) { setReleaseId(saved.release_id ?? ""); setEnvironmentMethod(null); setPanel("overview"); }
    return saved;
  }

  async function saveReleaseFiles(sourceId, body, key) {
    const saved = await mutate(() => configureChallengeReleaseFiles(challenge.challenge_id, sourceId, body, key), "파일 연결을 새 버전으로 저장했습니다 ‘이 버전 사용’을 누르면 적용됩니다");
    if (saved) { setReleaseId(saved.release_id); setPanel("files"); }
    return saved;
  }

  const fileSummary = selected?.user_files;
  const fileLabel = fileSummary?.status === "unavailable" ? "파일 연결 확인 필요"
    : fileSummary?.file?.present ? `ZIP 발행 ${fileSummary.file.registry_revision} · 파일 ${fileSummary.file.file_count}개`
    : fileSummary?.status === "pending" ? "같은 발행번호의 파일 수집 대기" : "파일 없음";

  const content = <>
    <AdminStatusMessage status={runtime.status} error={runtime.error} onRetry={runtime.retry}/>
    {error && <p role="alert" className="mb-4 text-admin-failed">{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {runtime.status === "success" && <>
      <div className={styles.versionBar}>
        {selected ? <>
          <label>배포 버전
            <select aria-label="배포 버전" className={styles.select} value={selected.release_id} disabled={busy}
              onChange={(event) => { setReleaseId(event.target.value); setConfirming(false); setShowFlagBindings(false); setEnvironmentMethod(null); }}>
              {releases.map((release) => <option key={release.release_id} value={release.release_id}>버전 {release.version} · 발행 #{release.registry_revision}{release.is_current ? " · 사용 중" : ""}</option>)}
            </select>
          </label>
          <AdminBadge tone={selected.is_current ? "good" : "neutral"}>{selected.is_current ? "새 인스턴스에 적용 중" : "아직 적용하지 않음"}</AdminBadge>
          {!selected.is_current && <button type="button" className={styles.primary}
            disabled={busy || !selected.is_deployable || loading || selected.containers.some((container) => container.secret_bindings?.some((binding) => binding.status === "missing"))}
            onClick={() => setConfirming(true)}>이 버전 사용</button>}
        </> : <p className={styles.secondary}>등록된 실행 이미지가 없습니다</p>}
        <button type="button" className={BUTTON} onClick={runtime.retry} disabled={busy || loading}>새로고침</button>
      </div>
      {confirming && selected && <div className={styles.confirmation}>
        <p className="mb-3">새 인스턴스부터 버전 {selected.version}의 이미지와 파일 연결을 사용합니다 실행 중인 인스턴스와 초기화에는 생성 당시 버전이 유지됩니다</p>
        <p className="mb-3">참가자 파일: {fileLabel}</p>
        <button type="button" className={styles.primary} disabled={busy || loading}
          onClick={() => mutate(() => activateChallengeRelease(challenge.challenge_id, selected.release_id), "새 인스턴스에 적용할 설정을 변경했습니다")}>이 버전 사용 확인</button>
        <button type="button" className={BUTTON + " ml-2"} disabled={busy} onClick={() => setConfirming(false)}>취소</button>
      </div>}
      <AdminTabs idPrefix="runtime-settings" label="배포 설정 메뉴" value={panel} onChange={setPanel} disabled={busy}
        items={[{ id: "overview", label: "버전 정보" }, { id: "test", label: "배포 테스트" }, { id: "files", label: "참가자 파일" }, { id: "environment", label: "환경변수" },
          { id: "secrets", label: "비밀값" }, { id: "image", label: "수동 등록" }]}/>

      <section role="tabpanel" id="runtime-settings-panel-overview" aria-labelledby="runtime-settings-tab-overview" hidden={panel !== "overview"} className={styles.panel}>
        {selected ? <>
          <dl className={styles.environmentSummary} aria-label="배포 환경 요약">
            <div><dt>실행 환경</dt><dd>{selected.runtime_type} · {selected.architecture}<span>{selected.isolation_profile} 격리 · 컨테이너 {selected.containers.length}개</span></dd></div>
            <div><dt>할당 자원</dt><dd>CPU {selected.resource_profile?.cpu_millicores}m · 메모리 {selected.resource_profile?.memory_mib}MiB<span>임시 저장 {selected.resource_profile?.ephemeral_storage_mib}MiB</span></dd></div>
            <div><dt>주입 설정</dt><dd>환경변수 {selected.containers.reduce((sum, item) => sum + Object.keys(item.env ?? {}).length, 0)}개 · 비밀값 {selected.containers.reduce((sum, item) => sum + (item.secret_bindings?.length ?? 0), 0)}개<span>이미지 발행 {selected.registry_revision}</span></dd></div>
          </dl>
          <div className={styles.releaseFilesSummary}><div><strong>참가자 파일</strong><span className={styles.secondary}>{fileLabel}</span></div>
            <button type="button" className={BUTTON} disabled={busy} onClick={() => setPanel("files")}>파일 설정</button></div>
          <h3 className={styles.sectionTitle}>컨테이너</h3>
          {!selected.is_deployable && <p className="mb-4 text-admin-failed">현재 실행 계약으로 사용할 수 없는 버전입니다</p>}
          {selected.containers.map((container) => <section key={container.name} className={styles.containerCard}>
            <div className={styles.containerHeader}>
              <h3>{container.name}</h3>
              <span>포트 {container.ports.map((port) => port.port + (port.public ? " 공개" : " 내부")).join(" · ") || "없음"}</span>
            </div>
            <details className={styles.containerValues}>
              <summary>환경변수 {Object.keys(container.env ?? {}).length}개 · 비밀값 {(container.secret_bindings ?? []).length}개</summary>
              {Object.keys(container.env ?? {}).length + (container.secret_bindings ?? []).length === 0
              ? <p className={styles.empty}>추가로 주입하는 값이 없습니다</p>
              : <table className={styles.settingsTable} aria-label={container.name + " 환경변수"}>
                <thead><tr><th>환경변수</th><th>값 또는 연결</th><th>구분</th></tr></thead>
                <tbody>
                  {Object.entries(container.env ?? {}).map(([key, envValue]) => <tr key={key}>
                    <td className={styles.mono}>{key}</td><td className={styles.mono}>{envValue || "(빈 문자열)"}</td>
                    <td><span className={styles.secondary}>일반{container.env_rules?.[key]?.required ? " · 필수" : ""}</span></td>
                  </tr>)}
                  {(container.secret_bindings ?? []).map((binding) => <tr key={binding.env_name}>
                    <td className={styles.mono}>{binding.env_name}</td>
                    <td>{binding.status === "missing" ? <AdminBadge tone="bad">저장값 없음</AdminBadge>
                      : <><span className={styles.mono}>{binding.name}</span><span className={styles.secondary}>버전 {binding.version}{!binding.is_latest ? " · 이전 저장값 연결" : ""}</span></>}</td>
                    <td><span className={styles.secondary}>비밀값{container.env_rules?.[binding.env_name]?.required ? " · 필수" : ""}</span></td>
                  </tr>)}
                </tbody>
              </table>}
            </details>
          </section>)}
          <button type="button" className={BUTTON} disabled={busy || !selected.is_deployable} onClick={() => setPanel("environment")}>환경변수 수정</button>
          {selected.is_current && <details className={styles.details} onToggle={(event) => setShowFlagBindings(event.currentTarget.open)}>
            <summary>채점 플래그와 주입 값 비교</summary>
            {showFlagBindings && <div className="mt-4"><AdminActiveFlagBindings challengeId={challenge.challenge_id} releaseVersion={selected.version}/></div>}
          </details>}
          <details className={styles.details}>
            <summary>이미지·자원 상세</summary>
            <dl>
              <dt>실행 방식</dt><dd>{selected.runtime_type} · {selected.architecture} · {selected.isolation_profile}</dd>
              <dt>발행 번호</dt><dd>{selected.registry_revision}</dd>
              {selected.resource_profile && <><dt>자원</dt><dd>CPU {selected.resource_profile.cpu_millicores}m · 메모리 {selected.resource_profile.memory_mib}MiB · 임시 저장 {selected.resource_profile.ephemeral_storage_mib}MiB</dd></>}
              {selected.healthcheck && <><dt>상태 확인</dt><dd>{selected.healthcheck.container}:{selected.healthcheck.port}{selected.healthcheck.path}</dd></>}
              {selected.containers.map((container) => <div key={container.name} className="contents"><dt>{container.name} 이미지</dt><dd className={styles.mono}>{container.image_ref}</dd></div>)}
              {selected.source_ref && <><dt>출처</dt><dd className={styles.mono}>{selected.source_ref}</dd></>}
              {selected.note && <><dt>메모</dt><dd>{selected.note}</dd></>}
            </dl>
          </details>
        </> : <div className={styles.empty}><p className="mb-4">파일만 제공하는 문제는 수집된 ZIP을 확인할 수 있습니다 실행 환경이 필요하면 이미지를 등록해주세요</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={BUTTON} onClick={() => setPanel("files")}>참가자 파일 보기</button>
            <button type="button" className={BUTTON} onClick={() => setPanel("image")}>이미지 등록</button>
          </div></div>}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-test" aria-labelledby="runtime-settings-tab-test" hidden={panel !== "test"} className={styles.panel}>
        {panel === "test" && active && (selected
          ? <AdminDeploymentTestPanel challengeId={challenge.challenge_id} release={selected} onBusyChange={setTestBusy}/>
          : <p className={styles.empty}>실행할 배포 버전을 먼저 등록해주세요</p>)}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-files" aria-labelledby="runtime-settings-tab-files" hidden={panel !== "files"} className={styles.panel}>
        {panel === "files" && selected?.user_files && <AdminReleaseFilesEditor key={selected.release_id} challengeId={challenge.challenge_id} release={selected} busy={busy} onSave={saveReleaseFiles}/>}
        {panel === "files" && selected && <RepositoryFilesDetails challengeId={challenge.challenge_id}/>}
        {panel === "files" && !selected && <AdminCollectedFilesPanel challengeId={challenge.challenge_id}/>}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-environment" aria-labelledby="runtime-settings-tab-environment" hidden={panel !== "environment"} className={styles.panel}>
        {selected?.is_deployable ? <>
          <div className={styles.fileNotice} role="status">
            <strong>버전 {selected.version} 환경변수 · {selected.is_current ? "새 인스턴스에 적용 중" : "저장됨 · 아직 적용 전"}</strong>
            <p className={styles.helpText}>{selected.is_current
              ? "아래 값과 비밀값 연결이 새 인스턴스에 들어갑니다 실행 중인 인스턴스는 생성 당시 설정을 유지합니다"
              : "이 버전을 적용하려면 위의 ‘이 버전 사용’을 눌러주세요"}</p>
          </div>
          {selected.containers.map((container) => <section key={container.name} className={styles.containerCard}>
            <div className={styles.containerHeader}><h3>{container.name}</h3>
              <span>일반 {Object.keys(container.env ?? {}).length}개 · 비밀값 {(container.secret_bindings ?? []).length}개</span></div>
            {Object.keys(container.env ?? {}).length + (container.secret_bindings ?? []).length === 0
              ? <p className={styles.empty}>이 버전에 추가로 주입하는 값이 없습니다</p>
              : <div className={styles.tableWrap}><table className={styles.settingsTable} aria-label={container.name + " 적용 환경변수"}>
                <thead><tr><th>이름</th><th>값 또는 연결</th><th>구분</th></tr></thead>
                <tbody>
                  {Object.entries(container.env ?? {}).map(([key, envValue]) => <tr key={key}>
                    <td className={styles.mono}>{key}</td><td className={styles.mono}>{envValue || "(빈 문자열)"}</td><td>일반</td></tr>)}
                  {(container.secret_bindings ?? []).map((binding) => <tr key={binding.env_name}>
                    <td className={styles.mono}>{binding.env_name}</td>
                    <td>{binding.status === "missing" ? <AdminBadge tone="bad">저장값 없음</AdminBadge> : <span className={styles.mono}>{binding.name} · 버전 {binding.version}</span>}</td>
                    <td>비밀값</td></tr>)}
                </tbody>
              </table></div>}
          </section>)}
          <div className="mt-5">
            <button type="button" className={BUTTON} disabled={busy} onClick={() => setEnvironmentMethod(environmentMethod ? null : "manual")}>{environmentMethod ? "수정 닫기" : "새 설정 버전 만들기"}</button>
            {environmentMethod && <p className={styles.helpText}>수정하면 새 버전이 저장됩니다 위에서 ‘이 버전 사용’을 눌러야 새 인스턴스에 적용됩니다</p>}
          </div>
          {environmentMethod && <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="환경변수 수정 방법">
            {[{ id: "manual", label: "직접 수정" }, { id: "repository", label: "저장소 값으로 새 버전 만들기" }, { id: "file", label: ".env 파일로 새 버전 만들기" }].map((method) =>
              <button key={method.id} type="button" aria-pressed={environmentMethod === method.id} className={environmentMethod === method.id ? styles.primary : BUTTON}
                disabled={busy} onClick={() => setEnvironmentMethod(method.id)}>{method.label}</button>)}
          </div>}
          {environmentMethod === "repository" && <div>
            <AdminRepositoryEnvironmentImporter key={selected.release_id} challengeId={challenge.challenge_id} release={selected}
              secrets={storedSecrets} busy={busy} onSave={(body) => saveRepositoryEnvironment(selected.release_id, body)}/>
          </div>}
          {environmentMethod === "file" && <div>
          <AdminEnvironmentFileImporter key={selected.release_id} challengeId={challenge.challenge_id} release={selected}
            secrets={storedSecrets} busy={busy} onSave={(body) => saveEnvironmentFile(selected.release_id, body)}/>
          </div>}
          {environmentMethod === "manual" && <div>
            <RuntimeSettingsEditor key={selected.release_id} release={selected} secrets={storedSecrets} busy={busy} onSave={(settings) => saveDerived(selected.release_id, settings)}/>
          </div>}
        </> : <p className={styles.empty}>사용할 수 있는 이미지 릴리스를 먼저 등록해주세요</p>}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-secrets" aria-labelledby="runtime-settings-tab-secrets" hidden={panel !== "secrets"} className={styles.panel}>
        <p className={styles.panelIntro}>이 문제의 비밀값 보관함입니다 각 배포 버전은 연결한 값의 버전을 유지합니다</p>
        <p className={styles.helpText}>채점용 플래그 원문은 기본 정보에서 확인할 수 있습니다</p>
        {storedSecrets.some((secret) => !secret.is_latest) && <label className="mb-3 flex items-center gap-2">
          <input type="checkbox" checked={showSecretHistory} onChange={(event) => setShowSecretHistory(event.target.checked)}/>이전 버전도 보기</label>}
        {visibleSecrets.length === 0 ? <p className={styles.empty}>저장된 비밀값이 없습니다</p> : <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="저장된 비밀값"><thead><tr><th>이름</th><th>버전</th><th>저장 시각</th></tr></thead>
            <tbody>{visibleSecrets.map((secret) => <tr key={secret.secret_id}><td className={styles.mono}>{secret.name}</td>
              <td>{secret.version}{secret.is_latest ? " · 최신" : ""}</td><td>{toKst(secret.created_at)}</td></tr>)}</tbody>
          </table>
        </div>}
        <form onSubmit={saveSecret} className={styles.secretForm}>
          <label>비밀값 이름<input ref={secretNameInput} value={name} maxLength={64} disabled={busy} onChange={(event) => setName(event.target.value)} className={INPUT} autoComplete="off"/></label>
          <label>새 값<input type="password" value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} className={INPUT} autoComplete="new-password"/></label>
          <button type="submit" disabled={busy || Boolean(validationError)} className={styles.primary}>비밀값 저장</button>
          {value && validationError && <p className="text-admin-muted sm:col-span-3">{validationError}</p>}
        </form>
      </section>

      <section role="tabpanel" id="runtime-settings-panel-image" aria-labelledby="runtime-settings-tab-image" hidden={panel !== "image"} className={styles.panel}>
        <p className={styles.panelIntro}>GitHub CI 발행본은 백엔드가 자동으로 수집해 위 배포 버전 목록에 추가합니다 이 화면은 수집되지 않은 JSON 파일을 직접 등록할 때만 사용해주세요</p>
        <form onSubmit={saveRelease} className="space-y-4">
          <label className={styles.fileBox}>릴리스 파일
            <input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={readFile}/>
          </label>
          {upload && <div className="space-y-3">
            <p className={styles.title}>{upload.artifact.challenge_slug} · 발행 {upload.artifact.registry_revision}</p>
            {slugMismatch && <p className="text-admin-failed">이 파일은 {challenge.challenge_slug} 문제의 릴리스가 아닙니다</p>}
            {requirements.containers.map((container) => <div key={container.name} className={styles.containerCard}>
              <div className={styles.containerHeader}><h3>{container.name}</h3></div>
              <div className="p-4"><p>일반 환경변수: {container.envNames.join(", ") || "없음"}</p>
                <p>비밀값 연결: {container.secretBindings.map(([envName, secretName]) => envName + " → " + secretName).join(", ") || "없음"}</p></div>
            </div>)}
            {requirements.missingSecrets.length > 0 && <div>
              <p className="text-admin-failed">먼저 저장할 비밀값: {requirements.missingSecrets.join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">{requirements.missingSecrets.map((secretName) => <button key={secretName} type="button" className={BUTTON}
                onClick={() => { setName(secretName); focusSecret.current = true; setPanel("secrets"); }}>{secretName} 입력</button>)}</div>
            </div>}
          </div>}
          <button type="submit" disabled={busy || !upload || slugMismatch || requirements.missingSecrets.length > 0} className={styles.primary}>이미지 릴리스 등록</button>
        </form>
      </section>
    </>}
  </>;
  return embedded ? content : <AdminDialog title={challenge.title + " · 배포"} onClose={onClose} busy={busy} variant="workspace">{content}</AdminDialog>;
}
