import { useEffect, useRef, useState } from "react";
import { activateChallengeRelease, deriveChallengeRelease, getChallengeReleases, getChallengeRuntimeSecrets, importChallengeEnvironmentFile, importChallengeRepositoryEnvironment, registerChallengeRelease, registerChallengeRuntimeSecret, configureChallengeReleaseFiles } from "../../../api/admin.js";
import AdminReleaseFilesEditor from "./AdminReleaseFilesEditor.jsx";
import AdminDeploymentTestPanel from "./AdminDeploymentTestPanel.jsx";
import AdminCollectedFilesPanel, { RepositoryFilesDetails } from "./AdminCollectedFilesPanel.jsx";
import AdminActiveFlagBindings from "./AdminActiveFlagBindings.jsx";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { RECENT_LIMIT, latestFirst } from "../utils/adminLists.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { buildDerivedSettings, describeRelease, orderReleasesByPublication, parseReleaseFile, releaseRequirements, releaseSettingsDraft, repositoryEnvStatus, unboundEnvironmentRules, validateRuntimeSecret, validateReleaseActivationReason } from "../utils/adminRuntime.js";
import AdminDialog from "./AdminDialog.jsx";
import AdminEnvironmentFileImporter from "./AdminEnvironmentFileImporter.jsx";
import AdminRepositoryEnvironmentImporter from "./AdminRepositoryEnvironmentImporter.jsx";
import AdminTabs from "./AdminTabs.jsx";
import styles from "./AdminWorkspace.module.css";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AppIcon, Glyph } from "./AdminGlyph.jsx";
import { IconButton, StatStrip, StatTile } from "./AdminWidgets.jsx";
import { AdminMiniPager } from "./AdminPagination.jsx";
import { AdminReasonField } from "./AdminFormParts.jsx";

const BUTTON = styles.button;
const INPUT = styles.input;
const MONO_INPUT = `${styles.input} ${styles.inputMono}`;

function UnboundEnvironmentRows({ container, release }) {
  return unboundEnvironmentRules(container, release.repository_env?.missing).map((row) => <tr key={row.name}>
    <td className={styles.mono}>{row.name}</td><td>{row.label}</td><td>{row.required ? "필수" : "선택 항목"}</td>
  </tr>);
}

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

  return <form onSubmit={submit} className={styles.editorBox}>
    <div className={styles.editorIntro}><h4>이 이미지의 주입 설정 바꾸기</h4><p className={styles.fieldHint}>문제 파일과 이미지는 건드리지 않습니다 저장하면 새 릴리스 버전이 생기고, 선택해서 사용해야 새 인스턴스에 적용됩니다</p><p className={styles.fieldHint}>이미지 안에 들어 있는 플래그나 파일은 이 설정으로 지워지지 않습니다</p></div>
    <datalist id="stored-runtime-secret-names">{names.map((name) => <option key={name} value={name}/>)}</datalist>
    {draft.map((container, containerIndex) => <section key={container.name} className={styles.editorContainer}>
      <h5 className={styles.editorName}>{container.name}</h5>
      {unboundEnvironmentRules(release.containers.find((item) => item.name === container.name), release.repository_env?.missing).map((row) =>
        <p key={row.name} className={styles.fieldHint}>{row.name} · {row.label} · 이 설정도 새 버전에 유지됩니다</p>)}
      <div className={styles.editorGroup}><p className={styles.fieldLabel}>일반 환경변수</p>{container.env.map((row, rowIndex) => <div key={rowIndex} className={styles.editorRow}>
        <input aria-label={`${container.name} 환경변수 이름 ${rowIndex + 1}`} placeholder="이름" value={row.name} disabled={busy} onChange={(event) => changeRow(containerIndex, "env", rowIndex, "name", event.target.value)} className={MONO_INPUT}/>
        <input aria-label={`${container.name} 환경변수 값 ${rowIndex + 1}`} placeholder="값" value={row.value} disabled={busy} onChange={(event) => changeRow(containerIndex, "env", rowIndex, "value", event.target.value)} className={MONO_INPUT}/>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => removeRow(containerIndex, "env", rowIndex)}>삭제</button>
      </div>)}<button type="button" className={BUTTON} disabled={busy} onClick={() => addRow(containerIndex, "env")}>환경변수 추가</button></div>
      <div className={styles.editorGroup}><p className={styles.fieldLabel}>비밀값 연결</p>{container.secret_env.map((row, rowIndex) => <div key={rowIndex} className={styles.editorRow}>
        <input aria-label={`${container.name} 비밀값 주입 이름 ${rowIndex + 1}`} placeholder="주입 이름 (예: FLAG)" value={row.name} disabled={busy} onChange={(event) => changeRow(containerIndex, "secret_env", rowIndex, "name", event.target.value)} className={MONO_INPUT}/>
        <input aria-label={`${container.name} 저장된 비밀값 이름 ${rowIndex + 1}`} list="stored-runtime-secret-names" placeholder="저장된 이름 (예: flag)" value={row.value} disabled={busy} onChange={(event) => changeRow(containerIndex, "secret_env", rowIndex, "value", event.target.value)} className={MONO_INPUT}/>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => removeRow(containerIndex, "secret_env", rowIndex)}>삭제</button>
      </div>)}<button type="button" className={BUTTON} disabled={busy} onClick={() => addRow(containerIndex, "secret_env")}>비밀값 연결 추가</button></div>
    </section>)}
    {error && <p role="alert" className={styles.errorText}>{error}</p>}
    <button type="submit" className={BUTTON} disabled={busy}>새 설정 버전 저장</button>
  </form>;
}

const VERSION_PAGE = 4;

export default function AdminChallengeRuntimeDialog({ challenge, onClose, embedded = false, active = true, initialReleaseId = "", focusPanel, onBusyChange, onChanged }) {
  const [releaseId, setReleaseId] = useState(initialReleaseId);
  const [panel, setPanel] = useState(focusPanel?.panel ?? "overview");
  // 다른 탭에서 특정 칸(참가자 파일 등)을 열어 달라고 하면 그 칸으로 옮긴다
  useEffect(() => { if (focusPanel?.panel) setPanel(focusPanel.panel); }, [focusPanel]);
  const [environmentMethod, setEnvironmentMethod] = useState(null);
  const [showSecretHistory, setShowSecretHistory] = useState(false);
  const [showAllSecrets, setShowAllSecrets] = useState(false);
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
  const [activationReason, setActivationReason] = useState("");
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
  const releases = orderReleasesByPublication(runtime.data?.releases ?? []);
  const selected = releases.find((release) => release.release_id === releaseId) ?? releases.find((release) => release.is_current) ?? releases[0];
  const currentRelease = releases.find((release) => release.is_current) ?? null;
  const isRollback = Boolean(currentRelease && selected && selected.version < currentRelease.version);
  const activationReasonError = validateReleaseActivationReason(activationReason);
  const selectedInfo = selected ? describeRelease(selected, releases) : null;
  const newerGithub = currentRelease ? describeRelease(currentRelease, releases).newerGithub : null;
  const repoEnv = repositoryEnvStatus(selected);
  const newerEnv = repositoryEnvStatus(newerGithub);
  // 버전 기록은 네 줄씩 쪽을 나눠 버전이 쌓여도 아래 칸을 밀어내지 않는다 처음에는 고른 버전이 든 쪽을 연다
  const [versionPage, setVersionPage] = useState(null);
  const versionRows = [...releases].sort((a, b) => b.version - a.version);
  const versionPageCount = Math.max(1, Math.ceil(versionRows.length / VERSION_PAGE));
  const selectedIndex = versionRows.findIndex((release) => release.release_id === selected?.release_id);
  const shownVersionPage = Math.min(versionPage ?? (selectedIndex >= 0 ? Math.floor(selectedIndex / VERSION_PAGE) + 1 : 1), versionPageCount);
  const shownVersions = versionRows.slice((shownVersionPage - 1) * VERSION_PAGE, shownVersionPage * VERSION_PAGE);
  const pickRelease = (id) => { setReleaseId(id); setVersionPage(null); setConfirming(false); setActivationReason(""); setShowFlagBindings(false); setEnvironmentMethod(null); };
  const validationError = validateRuntimeSecret(name.trim(), value);
  const loading = runtime.status === "loading";
  const storedSecrets = runtime.data?.secrets ?? [];
  const visibleSecrets = showSecretHistory ? storedSecrets : storedSecrets.filter((secret) => secret.is_latest);
  // 이전 버전까지 펼치면 저장할 때마다 줄이 늘어나므로 최근 20개만 보이고 나머지는 단추로 펼친다
  const secretRows = latestFirst(visibleSecrets, showAllSecrets ? Infinity : RECENT_LIMIT);
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

  async function activateRelease(event) {
    event.preventDefault();
    if (busy || pending.current || !selected || selected.is_current || activationReasonError) return;
    const reason = activationReason.trim();
    const saved = await mutate(
      () => activateChallengeRelease(challenge.challenge_id, selected.release_id, reason ? { reason } : {}),
      isRollback ? "이전 버전으로 되돌렸습니다" : "새 인스턴스에 적용할 설정을 변경했습니다",
    );
    if (saved) setActivationReason("");
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

  const content = <div className={styles.deploy}>
    <AdminStatusMessage status={runtime.status} error={runtime.error} onRetry={runtime.retry}/>
    {error && <p role="alert" className={styles.callout} data-tone="bad">{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {runtime.status === "success" && <>
      <section className={styles.versionHero} aria-label="배포 버전">
        <AppIcon name="version" tone={selected?.is_current ? "blue" : "gray"} size={42} />
        <div className={styles.versionText}>
          {selected ? <>
            <div className={styles.versionTitle}>
              <h3>버전 {selected.version}</h3>
              <AdminBadge tone={selected.is_current ? "good" : "neutral"}>{selected.is_current ? "새 인스턴스에 적용 중" : "아직 적용 전"}</AdminBadge>
              <AdminBadge tone={selectedInfo.tone}>{selectedInfo.label}{selectedInfo.baseVersion ? ` · v${selectedInfo.baseVersion} 기반` : ""}</AdminBadge>
              {selectedInfo.isLatestGithub && <AdminBadge tone="orange">GitHub 최신</AdminBadge>}
            </div>
            <p className={styles.versionMeta}>{[selected.created_at && `등록 ${formatAdminTime(selected.created_at, { seconds: false })}`,
              selected.registry_revision > 0 && `발행 #${selected.registry_revision}`, selected.runtime_type, selected.architecture].filter(Boolean).map((part) => <span key={part}>{part}</span>)}</p>
          </> : <>
            <div className={styles.versionTitle}><h3>{challenge.remote_run ? "원격 실행 문제" : "실행 이미지 없음"}</h3></div>
            <p>{challenge.remote_run
              ? "참가자가 낸 실행 파일을 검증 VM에서 돌리는 문제라 실행 이미지가 없습니다 설정과 실행 기록은 원격 실행 탭에서 봅니다"
              : "파일만 제공하는 문제이거나 아직 이미지를 등록하지 않았습니다"}</p>
          </>}
        </div>
        <div className={styles.versionTools}>
          {selected && releases.length > 1 && <select aria-label="배포 버전" className={`${styles.select} ${styles.versionSelect}`} value={selected.release_id} disabled={busy}
            onChange={(event) => pickRelease(event.target.value)}>
            {versionRows.map((release) => <option key={release.release_id} value={release.release_id}>버전 {release.version} · {describeRelease(release, releases).label} · {formatAdminTime(release.created_at, { seconds: false })}{release.is_current ? " · 사용 중" : ""}</option>)}
          </select>}
          <IconButton icon="refresh" label="새로고침" onClick={runtime.retry} disabled={busy || loading} />
          {selected && !selected.is_current && <button type="button" className={styles.primary}
            disabled={busy || !selected.is_deployable || loading || repoEnv?.blocked || selected.containers.some((container) => container.secret_bindings?.some((binding) => binding.status === "missing"))}
            onClick={() => { setActivationReason(""); setError(""); setConfirming(true); }}>이 버전 사용</button>}
        </div>
      </section>
      {newerGithub && selected?.release_id === currentRelease.release_id && <div className={styles.newerNotice}>
        <span><strong>GitHub에 새 발행본이 있습니다</strong> 버전 {newerGithub.version} · 발행 #{newerGithub.registry_revision} · {formatAdminTime(newerGithub.created_at, { seconds: false })} 등록{newerEnv ? (newerEnv.blocked ? " · 환경변수 채울 값 있음" : " · 저장소 환경변수 반영") : ""}</span>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => { pickRelease(newerGithub.release_id); setPanel("test"); }}>새 버전 시험하기</button>
      </div>}
      {/* 저장소 env 에서 못 채운 값이 있으면 사용 전환이 막히니 이유와 채우는 길을 바로 보인다 */}
      {selected && !selected.is_current && repoEnv?.blocked && <div className={styles.newerNotice} data-tone="warn">
        <span><strong>아직 사용할 수 없는 버전입니다</strong> 저장소 env에서 채우지 못한 값이 있습니다 · {repoEnv.missing.map((item) => item.label).join(" · ")}</span>
        <button type="button" className={BUTTON} disabled={busy} onClick={() => { setPanel("environment"); setEnvironmentMethod("repository"); }}>환경변수 채우기</button>
      </div>}
      {confirming && selected && !selected.is_current && <form className={`${styles.confirmation} ${styles.releaseConfirmation}`} aria-label="배포 버전 전환 확인" onSubmit={activateRelease}>
        <h4 className={styles.groupTitle}>{isRollback ? "이전 버전으로 되돌리기" : "배포 버전 전환"}</h4>
        <p className={styles.dialogLead}>현재 사용 중: <strong>{currentRelease ? `버전 ${currentRelease.version}` : "없음"}</strong> → <strong>버전 {selected.version}</strong></p>
        <p className={styles.dialogLead}>새 인스턴스부터 버전 {selected.version}의 이미지와 파일 연결을 사용합니다 실행 중인 인스턴스와 초기화에는 생성 당시 버전이 유지됩니다</p>
        <p className={styles.dialogLead}>참가자 파일: {fileLabel}</p>
        <AdminReasonField label="전환 사유" note="선택" value={activationReason} onChange={setActivationReason} multiline maxLength={null}
          disabled={busy} placeholder={isRollback ? "예: 새 버전 접속 오류로 이전 버전 복구" : "예: 검수한 새 이미지 적용"}
          hint={`${Array.from(activationReason.trim()).length}/500자 · 처리자와 함께 감사 로그에 남습니다`}/>
        {activationReasonError && <p role="alert" className={styles.errorText}>{activationReasonError}</p>}
        <div className={styles.formActions}>
          <button type="button" className={BUTTON} disabled={busy} onClick={() => { setConfirming(false); setActivationReason(""); }}>취소</button>
          <button type="submit" className={styles.primary} disabled={busy || loading || Boolean(activationReasonError)}>
            {busy ? "처리 중…" : isRollback ? "이전 버전으로 되돌리기" : "이 버전 사용 확인"}</button>
        </div>
      </form>}
      <div className={styles.deployLayout}>
      <AdminTabs idPrefix="runtime-settings" label="배포 설정 메뉴" variant="sidebar" value={panel} onChange={setPanel} disabled={busy}
        items={[
          { id: "overview", label: "버전 정보", icon: "info", tone: "blue" },
          { id: "test", label: "배포 테스트", icon: "bolt", tone: "orange" },
          { id: "files", label: "참가자 파일", icon: "download", tone: "green" },
          { id: "environment", label: "환경변수", icon: "sliders", tone: "graphite" },
          { id: "secrets", label: "비밀값", icon: "lock", tone: "red", badge: storedSecrets.filter((secret) => secret.is_latest).length || undefined },
          { id: "image", label: "수동 등록", icon: "upload", tone: "gray" },
        ]}/>
      <div className={styles.deployPanels}>

      <section role="tabpanel" id="runtime-settings-panel-overview" aria-labelledby="runtime-settings-tab-overview" hidden={panel !== "overview"} className={styles.panel}>
        {selected ? <>
          {!selected.is_deployable && <p className={styles.callout} data-tone="bad">현재 실행 계약으로 사용할 수 없는 버전입니다</p>}
          <div className={styles.groupHead}>
            <h4 className={styles.groupTitle}>버전 기록 <span>{versionRows.length}개</span></h4>
            <AdminMiniPager label="버전 기록 쪽" page={shownVersionPage} pageCount={versionPageCount} onChange={setVersionPage} />
          </div>
          <ul className={styles.group} aria-label="버전 기록" data-paged={versionPageCount > 1 || undefined}>
            {shownVersions.map((release) => {
              const info = describeRelease(release, releases);
              return <li key={release.release_id}>
                <button type="button" className={styles.versionRow} aria-current={release.release_id === selected.release_id || undefined} disabled={busy}
                  onClick={() => pickRelease(release.release_id)}>
                  <span className={styles.versionNumber}>v{release.version}</span>
                  <span className={styles.versionRowText}>
                    <span className={styles.versionRowTags}>
                      <AdminBadge tone={info.tone}>{info.label}{info.baseVersion ? ` · v${info.baseVersion} 기반` : ""}</AdminBadge>
                      {info.isLatestGithub && <AdminBadge tone="orange">GitHub 최신</AdminBadge>}
                      {release.is_current && <AdminBadge tone="good">사용 중</AdminBadge>}
                    </span>
                    <span className={styles.versionRowNote}>{release.note || "메모 없음"}</span>
                  </span>
                  <span className={styles.versionRowTime}>{formatAdminTime(release.created_at, { seconds: false })}{release.registry_revision > 0 && <small>발행 #{release.registry_revision}</small>}</span>
                </button>
              </li>;
            })}
          </ul>
          <div className={styles.groupColumns}>
            <div>
              <h4 className={styles.groupTitle}>실행 환경</h4>
              <dl className={styles.group} aria-label="실행 환경">
                <div><dt>런타임</dt><dd>{selected.runtime_type}</dd></div>
                <div><dt>플랫폼</dt><dd className={styles.mono}>{selected.architecture}</dd></div>
                <div><dt>격리 수준</dt><dd>{selected.isolation_profile}</dd></div>
                <div><dt>컨테이너</dt><dd>{selected.containers.length}개</dd></div>
              </dl>
            </div>
            <div>
              {selected.resource_profile && <>
                <h4 className={styles.groupTitle}>할당 자원</h4>
                <StatStrip label="할당 자원" className={styles.resourceStrip}>
                  <StatTile glyph="gauge" tone="green" label="CPU" value={selected.resource_profile.cpu_millicores} unit="m" />
                  <StatTile glyph="instance" tone="blue" label="메모리" value={selected.resource_profile.memory_mib} unit="MiB" />
                  <StatTile glyph="download" tone="indigo" label="임시 저장" value={selected.resource_profile.ephemeral_storage_mib} unit="MiB" />
                </StatStrip>
              </>}
              <h4 className={styles.groupTitle}>참가자 파일</h4>
              <div className={styles.group}>
                <button type="button" className={styles.rowButton} disabled={busy} onClick={() => setPanel("files")}>
                  <span>{fileLabel}</span><span className={styles.rowHint}>파일 설정</span><Glyph name="chevronRight" size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
          <h4 className={styles.groupTitle}>컨테이너</h4>
          <div className={styles.group}>
            {selected.containers.map((container) => <details key={container.name} className={styles.groupRow}>
              <summary>
                <strong className={styles.mono}>{container.name}</strong>
                <span>포트 {container.ports.map((port) => port.port + (port.public ? " 공개" : " 내부")).join(" · ") || "없음"}</span>
                <span className={styles.rowHint}>환경변수 {Object.keys(container.env ?? {}).length} · 비밀값 {(container.secret_bindings ?? []).length}</span>
              </summary>
              <div className={styles.groupRowBody}>
                {Object.keys(container.env ?? {}).length + (container.secret_bindings ?? []).length + Object.keys(container.env_rules ?? {}).length === 0
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
                    <UnboundEnvironmentRows container={container} release={selected}/>
                  </tbody>
                </table>}
              </div>
            </details>)}
            <button type="button" className={styles.rowButton} data-accent disabled={busy || !selected.is_deployable} onClick={() => setPanel("environment")}>
              <span>환경변수 수정</span><Glyph name="chevronRight" size={13} strokeWidth={2.4} />
            </button>
          </div>
          <h4 className={styles.groupTitle}>자세히</h4>
          <div className={styles.group}>
            {selected.is_current && <details className={styles.groupRow} onToggle={(event) => setShowFlagBindings(event.currentTarget.open)}>
              <summary><span>채점 플래그와 주입 값 비교</span></summary>
              {showFlagBindings && <div className={styles.groupRowBody}><AdminActiveFlagBindings challengeId={challenge.challenge_id} releaseVersion={selected.version}/></div>}
            </details>}
            <details className={styles.groupRow}>
              <summary><span>이미지 · 자원 상세</span></summary>
              <dl className={`${styles.groupRowBody} ${styles.detailList}`}>
                <dt>실행 방식</dt><dd>{selected.runtime_type} · {selected.architecture} · {selected.isolation_profile}</dd>
                <dt>발행 번호</dt><dd>{selected.registry_revision}</dd>
                {selected.healthcheck && <><dt>상태 확인</dt><dd className={styles.mono}>{selected.healthcheck.container}:{selected.healthcheck.port}{selected.healthcheck.path}</dd></>}
                {selected.containers.map((container) => <div key={container.name} className={styles.contents}><dt>{container.name} 이미지</dt><dd className={styles.mono}>{container.image_ref}</dd></div>)}
                {selected.source_ref && <><dt>출처</dt><dd className={styles.mono}>{selected.source_ref}</dd></>}
                {selected.note && <><dt>메모</dt><dd>{selected.note}</dd></>}
              </dl>
            </details>
          </div>
        </> : <div className={styles.emptyState}>
          <AppIcon name="version" tone="gray" size={44} />
          <strong>{challenge.remote_run ? "원격 실행 문제는 실행 이미지를 쓰지 않습니다" : "실행 이미지가 없습니다"}</strong>
          <p>{challenge.remote_run
            ? "참가자 파일만 여기서 확인하고, 검증 VM 설정은 원격 실행 탭에서 바꿔주세요"
            : "파일만 제공하는 문제는 수집된 ZIP을 확인하고, 실행 환경이 필요하면 이미지를 등록해주세요"}</p>
          <div className={styles.emptyActions}>
            <button type="button" className={BUTTON} onClick={() => setPanel("files")}>참가자 파일 보기</button>
            {!challenge.remote_run && <button type="button" className={styles.primary} onClick={() => setPanel("image")}>이미지 등록</button>}
          </div>
        </div>}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-test" aria-labelledby="runtime-settings-tab-test" hidden={panel !== "test"} className={styles.panel}>
        {panel === "test" && active && (selected
          ? <AdminDeploymentTestPanel challengeId={challenge.challenge_id} release={selected} currentRelease={currentRelease} onBusyChange={setTestBusy}
            onSelectRelease={(id) => { if (releases.some((release) => release.release_id === id)) pickRelease(id); }}
            onUseVersion={selected.is_current ? undefined : () => { setPanel("overview"); setConfirming(true); }}/>
          : <p className={styles.empty}>실행할 배포 버전을 먼저 등록해주세요</p>)}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-files" aria-labelledby="runtime-settings-tab-files" hidden={panel !== "files"} className={styles.panel}>
        {panel === "files" && selected?.user_files && <AdminReleaseFilesEditor key={selected.release_id} challengeId={challenge.challenge_id} release={selected} busy={busy} onSave={saveReleaseFiles}/>}
        {panel === "files" && selected && <RepositoryFilesDetails challengeId={challenge.challenge_id}/>}
        {panel === "files" && !selected && <AdminCollectedFilesPanel challengeId={challenge.challenge_id}/>}
      </section>

      <section role="tabpanel" id="runtime-settings-panel-environment" aria-labelledby="runtime-settings-tab-environment" hidden={panel !== "environment"} className={styles.panel}>
        {selected?.is_deployable ? <>
          <div className={styles.panelHead} role="status">
            <div>
              <h4>버전 {selected.version} 환경변수</h4>
              <p>일반 {selected.containers.reduce((sum, item) => sum + Object.keys(item.env ?? {}).length, 0)}개 · 비밀값 연결 {selected.containers.reduce((sum, item) => sum + (item.secret_bindings ?? []).length, 0)}개 · 컨테이너 {selected.containers.length}개</p>
            </div>
            <AdminBadge tone={selected.is_current ? "good" : "neutral"}>{selected.is_current ? "새 인스턴스에 적용 중" : "아직 적용 전"}</AdminBadge>
          </div>
          {repoEnv && <p className={styles.callout} data-tone={repoEnv.blocked ? "warn" : undefined}>
            GitHub 커밋 <span className={styles.mono}>{repoEnv.revision}</span>의 {repoEnv.files.join(", ")} 값을 등록할 때 넣었습니다
            {repoEnv.blocked ? ` 채우지 못한 값은 ${repoEnv.missing.map((item) => item.label).join(" · ")} · 아래 저장소 값 가져오기나 직접 수정으로 넣으면 새 버전이 생깁니다` : ""}
          </p>}
          <div className={styles.group}>
            {selected.containers.map((container) => <details key={container.name} className={styles.groupRow}>
              <summary><strong className={styles.mono}>{container.name}</strong>
                <span className={styles.rowHint}>일반 {Object.keys(container.env ?? {}).length}개 · 비밀값 {(container.secret_bindings ?? []).length}개</span></summary>
              <div className={styles.groupRowBody}>
                {Object.keys(container.env ?? {}).length + (container.secret_bindings ?? []).length + Object.keys(container.env_rules ?? {}).length === 0
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
                      <UnboundEnvironmentRows container={container} release={selected}/>
                    </tbody>
                  </table></div>}
              </div>
            </details>)}
          </div>
          <p className={styles.groupNote}>{selected.is_current
            ? "실행 중인 인스턴스는 생성 당시 설정을 유지합니다"
            : repoEnv?.blocked ? "못 채운 값을 넣은 새 버전을 만든 뒤 그 버전을 사용해주세요"
              : "이 버전을 적용하려면 위의 ‘이 버전 사용’을 눌러주세요"}</p>
          <h4 className={styles.groupTitle}>새 설정 버전 만들기</h4>
          <div className={styles.methodCards} role="group" aria-label="환경변수 수정 방법">
            {[{ id: "manual", label: "직접 수정", hint: "이름과 값을 한 줄씩 고칩니다", icon: "edit", tone: "blue" },
              { id: "repository", label: "저장소 값 가져오기", hint: "문제 저장소의 env 파일을 씁니다", icon: "download", tone: "graphite" },
              { id: "file", label: ".env 파일 올리기", hint: "내 컴퓨터의 파일을 씁니다", icon: "upload", tone: "green" }].map((method) =>
              <button key={method.id} type="button" aria-pressed={environmentMethod === method.id} className={styles.methodCard}
                disabled={busy} onClick={() => setEnvironmentMethod(environmentMethod === method.id ? null : method.id)}>
                <AppIcon name={method.icon} tone={method.tone} size={30} />
                <span><strong>{method.label}</strong><small>{method.hint}</small></span>
              </button>)}
          </div>
          {environmentMethod && <p className={styles.groupNote}>저장하면 새 버전이 생깁니다 위의 ‘이 버전 사용’을 눌러야 새 인스턴스에 적용됩니다</p>}
          {environmentMethod === "repository" && <div>
            <AdminRepositoryEnvironmentImporter key={selected.release_id} challengeId={challenge.challenge_id} release={selected}
              initialContainer={repoEnv?.missing.find((item) => item.container)?.container}
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
        <p className={styles.panelIntro}>배포 버전마다 연결한 비밀값의 버전을 그대로 씁니다 채점용 플래그 원문은 기본 정보에서 확인합니다</p>
        {storedSecrets.some((secret) => !secret.is_latest) && <label className={`${styles.check} ${styles.secretHistoryToggle}`}>
          <input type="checkbox" checked={showSecretHistory} onChange={(event) => setShowSecretHistory(event.target.checked)}/>이전 버전도 보기</label>}
        {visibleSecrets.length === 0 ? <p className={styles.empty}>저장된 비밀값이 없습니다</p> : <ul className={styles.group} aria-label="저장된 비밀값">
          {secretRows.items.map((secret) => <li key={secret.secret_id} className={styles.secretRow}>
            <span className={styles.secretIcon} aria-hidden="true"><Glyph name="lock" size={14} strokeWidth={2.2} /></span>
            <strong className={styles.mono}>{secret.name}</strong>
            <span className={styles.rowHint}>버전 {secret.version}</span>
            {secret.is_latest && <AdminBadge tone="good">최신</AdminBadge>}
            <span className={styles.secretTime}>{formatAdminTime(secret.created_at)}</span>
          </li>)}
          {visibleSecrets.length > RECENT_LIMIT && <li><button type="button" className={styles.rowButton} onClick={() => setShowAllSecrets((value) => !value)}>
            <span>{showAllSecrets ? `최근 ${RECENT_LIMIT}개만 보기` : `이전 기록 ${secretRows.hidden}개 더 보기`}</span></button></li>}
        </ul>}
        <form onSubmit={saveSecret} className={styles.secretForm}>
          <label>비밀값 이름<input ref={secretNameInput} value={name} maxLength={64} disabled={busy} onChange={(event) => setName(event.target.value)} className={INPUT} autoComplete="off"/></label>
          <label>새 값<input type="password" value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} className={INPUT} autoComplete="new-password"/></label>
          <button type="submit" disabled={busy || Boolean(validationError)} className={styles.primary}>비밀값 저장</button>
          {value && validationError && <p className={`${styles.fieldHint} ${styles.secretFormHint}`}>{validationError}</p>}
        </form>
      </section>

      <section role="tabpanel" id="runtime-settings-panel-image" aria-labelledby="runtime-settings-tab-image" hidden={panel !== "image"} className={styles.panel}>
        <p className={styles.panelIntro}>GitHub CI 발행본은 자동으로 수집됩니다 수집되지 않은 릴리스 JSON을 직접 올릴 때만 씁니다</p>
        <form onSubmit={saveRelease} className={styles.releaseForm}>
          <label className={styles.fileBox}>릴리스 파일
            <input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={readFile}/>
          </label>
          {upload && <div className={styles.stackTight}>
            <p className={styles.title}>{upload.artifact.challenge_slug} · 발행 {upload.artifact.registry_revision}</p>
            {slugMismatch && <p className={styles.errorText}>이 파일은 {challenge.challenge_slug} 문제의 릴리스가 아닙니다</p>}
            {requirements.containers.map((container) => <div key={container.name} className={styles.containerCard}>
              <div className={styles.containerHeader}><h3>{container.name}</h3></div>
              <div className={styles.containerBody}><p>일반 환경변수: {container.envNames.join(", ") || "없음"}</p>
                <p>비밀값 연결: {container.secretBindings.map(([envName, secretName]) => envName + " → " + secretName).join(", ") || "없음"}</p></div>
            </div>)}
            {requirements.missingSecrets.length > 0 && <div className={styles.stackTight}>
              <p className={styles.errorText}>먼저 저장할 비밀값: {requirements.missingSecrets.join(", ")}</p>
              <div className={styles.rowActions}>{requirements.missingSecrets.map((secretName) => <button key={secretName} type="button" className={BUTTON}
                onClick={() => { setName(secretName); focusSecret.current = true; setPanel("secrets"); }}>{secretName} 입력</button>)}</div>
            </div>}
          </div>}
          <button type="submit" disabled={busy || !upload || slugMismatch || requirements.missingSecrets.length > 0} className={styles.primary}>이미지 릴리스 등록</button>
        </form>
      </section>
      </div>
      </div>
    </>}
  </div>;
  return embedded ? content : <AdminDialog title={challenge.title + " · 배포"} onClose={onClose} busy={busy} variant="workspace">{content}</AdminDialog>;
}
