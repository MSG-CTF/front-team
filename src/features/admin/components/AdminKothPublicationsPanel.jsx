import { useRef, useState } from "react";
import { getAdminKothPublications, getAdminKothPublished, importAdminKothPublication } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminReasonField } from "./AdminFormParts.jsx";
import { formatAdminTime } from "../utils/adminTime.js";
import ui from "./AdminWorkspace.module.css";

function checked(response) {
  if (!isSuccess(response.data)) throw new Error(response.data?.message || "발행본을 확인하지 못했습니다");
  return response.data.data;
}

export default function AdminKothPublicationsPanel({ challenge, onSaved, onEnvironment }) {
  const id = challenge.koth_challenge_id;
  const resource = useAdminResource((config) => getAdminKothPublications(id, config), [id], "발행본을 불러오지 못했습니다");
  const [catalog, setCatalog] = useState([]), [nextPage, setNextPage] = useState(1);
  const [preview, setPreview] = useState(null), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const working = useRef(false), generation = useRef(0);
  const imported = new Set(resource.data?.items.map((row) => row.publication_id));

  async function execute(action) {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try { await action(); }
    catch (caught) { setError(caught?.response?.data?.message || caught?.message || "발행본을 확인하지 못했습니다"); }
    finally { working.current = false; setBusy(false); }
  }
  function load() {
    execute(async () => {
      const result = checked(await getAdminKothPublished(nextPage, { params: { slug: challenge.repository?.slug } }));
      setCatalog((current) => [...new Map([...current, ...result.items].map((item) => [`${item.challenge_slug}:${item.run_id}`, item])).values()]);
      setNextPage(result.next_page);
    });
  }
  function inspect(item) {
    const request = ++generation.current;
    setNotice(""); setPreview(null); setReason("");
    execute(async () => {
      const result = checked(await importAdminKothPublication(id, { artifact_id: item.artifact_id }));
      if (generation.current === request) setPreview({ ...result, artifact_id: item.artifact_id });
    });
  }
  function save() {
    if (!preview || !reason.trim()) return;
    execute(async () => {
      const result = checked(await importAdminKothPublication(id, { artifact_id: preview.artifact_id, preview_token: preview.preview_token, reason: reason.trim() }));
      setPreview(null); setReason("");
      setNotice(`발행본 ${result.registry_revision}을 가져왔습니다 환경변수와 파일을 확인한 뒤 적용해주세요`);
      await Promise.all([resource.reload(), onSaved?.()]);
    });
  }

  return <section className={ui.stack} aria-label="KOTH 발행본">
    <div className={ui.panelHead}><div><h4>배포 버전</h4><p>CI가 성공한 발행본에서 지문·참가자 파일·환경변수를 함께 가져옵니다</p></div>
      <button type="button" className={ui.button} onClick={resource.reload} disabled={busy}>목록 새로고침</button></div>
    <p className={ui.fieldHint}>가져오기는 실행 중인 문제를 바꾸지 않습니다 버전을 적용하면 이미지와 환경변수를 먼저 확인한 뒤 지문과 파일도 같은 버전으로 전환합니다</p>
    <AdminStatusMessage status={resource.status} error={resource.error} onRetry={resource.retry} hasData={Boolean(resource.data)} />
    {notice && <p role="status" className={ui.successText}>{notice}</p>}
    {error && <p role="alert" className={ui.errorText}>{error}</p>}
    {resource.data && <div className={ui.tableWrap}><table className={ui.table}><caption className={ui.srOnly}>가져온 KOTH 발행본</caption>
      <thead><tr><th>발행본</th><th>소스</th><th>참가자 파일</th><th>상태</th><th>설정</th></tr></thead>
      <tbody>{resource.data.items.map((item) => <tr key={item.publication_id}>
        <td><strong>{item.registry_revision}</strong><div className={ui.fieldHint}>{formatAdminTime(item.created_at, { seconds: false })}</div></td>
        <td><a href={item.source_url} target="_blank" rel="noreferrer">{item.source_sha.slice(0, 12)}</a></td>
        <td>{item.files?.present ? `${item.files.file_count}개 파일` : "제공 파일 없음"}</td>
        <td><AdminBadge tone={item.missing.length ? "warn" : "neutral"}>{item.missing.length ? "설정 확인 필요" : item.source_sha === resource.data.running_source_sha ? "현재 실행 소스" : "가져옴"}</AdminBadge></td>
        <td><button type="button" className={ui.button} disabled={!item.version_id || busy} onClick={() => onEnvironment(item.version_id)}>환경변수·적용</button></td>
      </tr>)}{resource.data.items.length === 0 && <tr><td colSpan={5}>가져온 발행본이 없습니다 아래에서 GitHub 발행본을 확인해주세요</td></tr>}</tbody>
    </table></div>}
    <section className={ui.stack} aria-label="GitHub KOTH 발행본">
      <div className={ui.panelHead}><div><h4>GitHub에서 가져오기</h4><p>이미 가져온 버전은 표시만 하고 다시 등록하지 않습니다</p></div>
        <button type="button" className={ui.button} disabled={busy || nextPage == null} onClick={load}>{busy ? "확인 중" : catalog.length ? "이전 발행본 더 보기" : "발행본 확인"}</button></div>
      {catalog.filter((item) => item.challenge_slug === challenge.repository?.slug).map((item) => {
        const registered = item.registered || imported.has(item.publication_id) || resource.data?.items.some((row) => row.run_id === item.run_id);
        const ready = item.workflow_state === "success" && item.has_release_artifact && item.has_files_artifact;
        return <div className={ui.rowActions} key={item.run_id}>
          <span>{item.source_sha.slice(0, 12)} · {formatAdminTime(item.published_at, { seconds: false })}</span>
          <AdminBadge tone={registered ? "neutral" : ready ? "good" : "warn"}>{registered ? "이미 가져옴" : ready ? "가져오기 가능" : "CI 완료 확인 필요"}</AdminBadge>
          <button type="button" className={ui.button} disabled={busy || registered || !ready} onClick={() => inspect(item)}>내용 확인</button>
        </div>;
      })}
      {catalog.length > 0 && !catalog.some((item) => item.challenge_slug === challenge.repository?.slug) && <p className={ui.fieldHint}>이 목록에는 해당 문제의 발행본이 없습니다 이전 발행본을 더 확인해주세요</p>}
      {preview && <div className={ui.stack} aria-label="가져올 발행본 확인">
        <h4>발행본 {preview.registry_revision} · {preview.metadata.title}</h4>
        <p style={{ whiteSpace: "pre-wrap" }}>{preview.metadata.description || "지문 없음"}</p>
        <p>{preview.containers.length}개 컨테이너 · 일반 환경변수 {preview.containers.reduce((sum, row) => sum + row.env_count, 0)}개 · 비밀값 {preview.containers.reduce((sum, row) => sum + row.secret_count, 0)}개 · 참가자 파일 {preview.files.file_count}개</p>
        {preview.missing.length > 0 && <p className={ui.callout}>운영 연결이나 필수 값 확인이 필요한 항목이 {preview.missing.length}개 있습니다 확인 전에는 이 버전을 적용할 수 없습니다</p>}
        <AdminReasonField label="가져오기 사유" value={reason} onChange={setReason} disabled={busy} required />
        <div className={ui.formActions}><button type="button" className={ui.button} disabled={busy} onClick={() => { generation.current++; setPreview(null); }}>취소</button>
          <button type="button" className={ui.primary} disabled={busy || !reason.trim()} onClick={save}>{busy ? "가져오는 중" : "이 발행본 가져오기"}</button></div>
      </div>}
    </section>
  </section>;
}
