import { useEffect, useRef, useState } from "react";
import { activateChallengeRelease, getChallengeReleases, getChallengeRuntimeSecrets, registerChallengeRelease, registerChallengeRuntimeSecret } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { parseReleaseFile, validateRuntimeSecret } from "../utils/adminRuntime.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";

const BUTTON = "rounded border border-admin-divider px-3 py-1.5 text-sm disabled:opacity-50";
const INPUT = "w-full rounded border border-admin-divider bg-white/60 px-3 py-2";

async function loadRuntime(challengeId, config) {
  const [releases, secrets] = await Promise.all([getChallengeReleases(challengeId, config), getChallengeRuntimeSecrets(challengeId, config)]);
  for (const response of [releases, secrets]) {
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "실행 설정을 불러오지 못했습니다");
  }
  return { data: { code: "SUCCESS", data: { ...releases.data.data, secrets: secrets.data.data.secrets } } };
}

export default function AdminChallengeRuntimeDialog({ challenge, onClose }) {
  const [releaseId, setReleaseId] = useState("");
  const [name, setName] = useState("flag");
  const [value, setValue] = useState("");
  const [upload, setUpload] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pending = useRef(false);
  const fileSequence = useRef(0);
  const fileInput = useRef(null);
  const runtime = useAdminResource((config) => loadRuntime(challenge.challenge_id, config), [challenge.challenge_id], "실행 설정을 불러오지 못했습니다");
  useEffect(() => () => { fileSequence.current += 1; }, []);
  const releases = runtime.data?.releases ?? [];
  const selected = releases.find((release) => release.release_id === releaseId) ?? releases.find((release) => release.is_current) ?? releases[0];
  const validationError = validateRuntimeSecret(name.trim(), value);
  const loading = runtime.status === "loading";

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
    await mutate(() => registerChallengeRuntimeSecret(challenge.challenge_id, { name: name.trim(), value: secretValue }), "비밀값을 저장했습니다 새 릴리스를 등록하면 이 버전이 연결됩니다");
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
    if (!upload) return;
    const saved = await mutate(() => registerChallengeRelease(challenge.challenge_id, { artifact: upload.artifact, note: "관리자 릴리스 파일 등록" }), "릴리스를 등록했습니다 내용을 확인한 뒤 사용할 버전을 선택해주세요");
    if (saved) { setUpload(null); setReleaseId(saved.release_id ?? ""); if (fileInput.current) fileInput.current.value = ""; }
  }

  return <AdminDialog title={challenge.title + " · 실행 설정"} onClose={onClose} busy={busy} wide>
    <div className="space-y-5 font-song-myung text-sm">
      <div className="flex items-center justify-between gap-3">
        <p>문제별 이미지, 환경변수, 비밀값 연결을 확인합니다</p>
        <button type="button" className={BUTTON} onClick={runtime.retry} disabled={busy || loading}>설정 새로고침</button>
      </div>
      <AdminStatusMessage status={runtime.status} error={runtime.error} onRetry={runtime.retry}/>
      {error && <p role="alert" className="text-admin-failed">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {runtime.status === "success" && <>
        <section className="rounded-lg border border-admin-divider p-4">
          <h3 className="mb-3 text-base">실행 릴리스</h3>
          {releases.length === 0 ? <p className="text-admin-muted">등록된 실행 릴리스가 없습니다 파일만 배포하는 문제라면 실행 릴리스가 필요하지 않습니다</p> : <>
            {!runtime.data.current_release_id && <p className="mb-3 text-admin-muted">사용 중인 릴리스가 없습니다 등록된 내용부터 확인해주세요</p>}
            <label className="block">릴리스 선택<select className={INPUT + " mt-1"} value={selected.release_id} disabled={busy} onChange={(event) => { setReleaseId(event.target.value); setConfirming(false); }}>
              {releases.map((release) => <option key={release.release_id} value={release.release_id}>버전 {release.version} · 발행 {release.registry_revision}{release.is_current ? " · 사용 중" : ""}</option>)}
            </select></label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AdminBadge tone={selected.is_current ? "good" : "neutral"}>{selected.is_current ? "새 인스턴스에 적용 중" : "등록됨"}</AdminBadge>
              <span>실행 방식 {selected.runtime_type} · 격리 {selected.isolation_profile} · {selected.architecture}</span>
            </div>
            {selected.resource_profile && <p className="mt-2 text-admin-muted">CPU {selected.resource_profile.cpu_millicores}m · 메모리 {selected.resource_profile.memory_mib}MiB · 임시 저장 {selected.resource_profile.ephemeral_storage_mib}MiB</p>}
            {selected.healthcheck && <p className="mt-2">상태 확인 {selected.healthcheck.container}:{selected.healthcheck.port}{selected.healthcheck.path}</p>}
            {selected.source_ref && <p className="mt-2 break-all text-admin-muted">출처 {selected.source_ref}</p>}
            {selected.note && <p className="mt-2 break-all">{selected.note}</p>}
            <div className="mt-4 space-y-4">{selected.containers.map((container) => <section key={container.name} className="rounded border border-admin-divider/50 bg-white/30 p-3">
              <h4 className="mb-2 font-kode-mono">{container.name}</h4>
              <p className="break-all font-kode-mono text-xs">{container.image_ref}</p>
              <p className="mt-2">포트 {container.ports.map((port) => port.port + (port.public ? " (공개)" : " (내부)")).join(", ") || "없음"}</p>
              <h5 className="mb-1 mt-3">환경변수</h5>
              {Object.keys(container.env ?? {}).length === 0 ? <p className="text-admin-muted">이 릴리스에 전달되는 환경변수가 없습니다</p> : <table className="w-full text-left"><thead><tr><th className="py-1 font-normal">이름</th><th className="py-1 font-normal">값</th></tr></thead><tbody>{Object.entries(container.env).map(([key, envValue]) => <tr key={key}><td className="py-1 font-kode-mono">{key}</td><td className="break-all py-1 font-kode-mono">{envValue}</td></tr>)}</tbody></table>}
              <h5 className="mb-1 mt-3">비밀값 연결</h5>
              {(container.secret_bindings ?? []).length === 0 ? <p className="text-admin-muted">이 릴리스에는 비밀값 연결이 없습니다</p> : <table className="w-full text-left"><thead><tr>{["주입 이름", "저장된 이름", "연결 버전", "상태"].map((label) => <th key={label} className="py-1 font-normal">{label}</th>)}</tr></thead><tbody>{container.secret_bindings.map((binding) => <tr key={binding.env_name}><td className="py-1 font-kode-mono">{binding.env_name}</td><td className="py-1 font-kode-mono">{binding.name ?? "-"}</td><td className="py-1">{binding.version ? "버전 " + binding.version : "-"}</td><td className="py-1"><AdminBadge tone={binding.status === "missing" ? "bad" : "good"}>{binding.status === "missing" ? "저장값 없음" : binding.is_latest ? "연결됨" : "이전 버전 연결"}</AdminBadge></td></tr>)}</tbody></table>}
            </section>)}</div>
            {!selected.is_current && <div className="mt-4">
              {!selected.is_deployable && <p className="mb-2 text-admin-failed">현재 계약으로 실행할 수 없는 릴리스입니다</p>}
              {confirming ? <div className="space-y-2"><p>새로 생성하는 인스턴스부터 버전 {selected.version}을 사용합니다 기존 인스턴스는 생성 당시 버전을 유지합니다</p><button type="button" className={BUTTON} disabled={busy || loading} onClick={() => mutate(() => activateChallengeRelease(challenge.challenge_id, selected.release_id), "사용할 릴리스를 변경했습니다")}>이 버전 사용 확인</button><button type="button" className={BUTTON + " ml-2"} disabled={busy} onClick={() => setConfirming(false)}>취소</button></div> : <button type="button" className={BUTTON} disabled={busy || !selected.is_deployable || loading || selected.containers.some((container) => container.secret_bindings?.some((binding) => binding.status === "missing"))} onClick={() => setConfirming(true)}>이 버전 사용</button>}
            </div>}
          </>}
        </section>
        <section className="rounded-lg border border-admin-divider p-4">
          <h3 className="mb-2 text-base">저장된 비밀값</h3>
          <p className="mb-3 text-admin-muted">값은 다시 조회하지 않습니다 새 값을 저장해도 기존 릴리스의 연결 버전은 바뀌지 않습니다</p>
          {(runtime.data.secrets ?? []).length === 0 ? <p className="mb-3">저장된 비밀값이 없습니다</p> : <table className="mb-4 w-full text-left"><thead><tr>{["이름", "버전", "저장 시각", "상태"].map((label) => <th key={label} className="py-2 font-normal">{label}</th>)}</tr></thead><tbody>{runtime.data.secrets.map((secret) => <tr key={secret.secret_id} className="border-t border-admin-divider/40"><td className="py-2 font-kode-mono">{secret.name}</td><td className="py-2">{secret.version}</td><td className="py-2">{toKst(secret.created_at)}</td><td className="py-2">{secret.is_latest ? "최신 저장값" : "이전 저장값"}</td></tr>)}</tbody></table>}
          <form onSubmit={saveSecret} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <label>비밀값 이름<input value={name} maxLength={64} disabled={busy} onChange={(event) => setName(event.target.value)} className={INPUT + " mt-1"} autoComplete="off"/></label>
            <label>새 비밀값<input type="password" value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} className={INPUT + " mt-1"} autoComplete="new-password"/></label>
            <button type="submit" disabled={busy || Boolean(validationError)} className={BUTTON + " self-end"}>비밀값 저장</button>
            {value && validationError && <p className="text-admin-muted sm:col-span-3">{validationError}</p>}
          </form>
        </section>
        <section className="rounded-lg border border-admin-divider p-4">
          <h3 className="mb-2 text-base">릴리스 등록</h3>
          <p className="mb-3 text-admin-muted">CI에서 받은 실행 릴리스 JSON을 선택해주세요 필요한 비밀값을 먼저 저장한 뒤 등록합니다</p>
          <form onSubmit={saveRelease} className="space-y-3"><label className="block">릴리스 파일<input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={readFile} className="mt-1 block w-full"/></label>
            {upload && <p>{upload.artifact.challenge_slug} · 발행 {upload.artifact.registry_revision}</p>}
            <button type="submit" disabled={busy || !upload} className={BUTTON}>릴리스 등록</button>
          </form>
        </section>
      </>}
    </div>
  </AdminDialog>;
}
