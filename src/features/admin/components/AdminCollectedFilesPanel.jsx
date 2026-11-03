import { useEffect, useRef, useState } from "react";
import { createAdminIdempotencyKey, getAdminChallengeFiles, getAdminChallengeRepositoryFiles, getPublishedChallenges, selectStaticChallengeFile } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { FILE_KINDS, formatFileSize } from "../utils/adminChallengeSettings.js";
import { validateReleaseActivationReason } from "../utils/adminRuntime.js";
import { describeStaticFile, isStaticFileChoice, newerCollectedFile, uncollectedPublication } from "../utils/adminStaticFiles.js";
import { notifyAdminResourceChanged } from "../utils/adminResourceEvents.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminFileDownloadButton from "./AdminFileDownloadButton.jsx";
import AdminPublicationImportDialog from "./AdminPublicationImportDialog.jsx";
import { AdminReasonField } from "./AdminFormParts.jsx";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export function RepositoryFilesDetails({ challengeId }) {
  const [showSource, setShowSource] = useState(false);
  return <details className={styles.details} onToggle={(event) => setShowSource(event.currentTarget.open)}>
    <summary>출제 저장소의 원본 파일 보기</summary>
    {showSource && <div className={styles.detailsBody}><RepositoryFilesPanel challengeId={challengeId}/></div>}
  </details>;
}

function RepositoryFilesPanel({ challengeId }) {
  const resource = useAdminResource((config) => getAdminChallengeRepositoryFiles(challengeId, config), [challengeId], "저장소 파일 목록을 불러오지 못했습니다");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const files = resource.data?.files ?? [];
  const filtered = files.filter((file) => (!kind || file.kind === kind) && file.path.toLowerCase().includes(search.toLowerCase()));
  const visible = filtered.slice((page - 1) * 30, page * 30);
  return <>
    <AdminStatusMessage status={resource.status} error={resource.error} onRetry={resource.retry}/>
    {resource.status === "success" && <>
      <h3 className={styles.sectionTitle}>저장소 파일 <span className={styles.secondary}>{files.length}개</span></h3>
      <p className={styles.panelIntro}>출제 저장소의 원본 목록입니다 현재 참가자에게 배포되는 ZIP과 버전이 다를 수 있습니다</p>
      <div className={styles.toolbar}>
        <label>구분 <select className={styles.select} value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
          <option value="">전체 ({files.length})</option>{Object.entries(FILE_KINDS).map(([value, label]) =>
            <option key={value} value={value}>{label} ({files.filter((file) => file.kind === value).length})</option>)}
        </select></label>
        <label className={styles.fileSearch}>파일 검색<input type="search" value={search} className={styles.input} placeholder="파일명 또는 경로"
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></label>
      </div>
      {filtered.length ? <div className={styles.tableWrap}><table className={styles.fileTable} aria-label="저장소 파일 목록">
        <thead><tr><th>파일 / 경로</th><th>구분</th><th>크기</th></tr></thead>
        <tbody>{visible.map((file) => <tr key={file.path}><td>
          {file.source_url ? <a className={styles.fileLink} href={file.source_url} target="_blank" rel="noreferrer">{file.name} ↗</a> : <span className={styles.title}>{file.name}</span>}
          <span className={styles.filePath}>{file.path}</span></td><td>{FILE_KINDS[file.kind]}</td><td>{formatFileSize(file.size_bytes)}</td></tr>)}</tbody>
      </table></div> : <p className={styles.empty}>{kind === "participant" && !search ? "prob/for_user에 저장된 배포용 파일이 없습니다" : "조건에 맞는 파일이 없습니다"}</p>}
      {filtered.length > 30 && <div className={styles.filePagination}><button type="button" className={styles.button} disabled={page === 1} onClick={() => setPage((value) => value - 1)}>이전</button>
        <span>{page} / {Math.ceil(filtered.length / 30)}</span><button type="button" className={styles.button} disabled={page * 30 >= filtered.length} onClick={() => setPage((value) => value + 1)}>다음</button></div>}
      <p className={styles.helpText}>{resource.data.repository} · {resource.data.source_revision.slice(0, 8)}
        {!resource.data.source_published && " · 로컬에 저장된 버전"}</p>
    </>}
  </>;
}

const MESSAGES = {
  no_release: "배포 버전을 선택하면 해당 버전의 참가자 파일이 연결됩니다",
  pending: "이 버전의 파일 수집 기록이 없습니다 CI 발행과 백엔드 수집 상태를 확인해주세요",
  none: "이 버전은 첨부파일 없이 발행됐습니다",
  disabled: "현재 설정 버전은 참가자에게 첨부파일을 제공하지 않습니다",
  unavailable: "연결된 파일을 찾지 못했습니다 배포 파일 설정과 수집 상태를 확인해주세요",
};

export function UncollectedNotice({ publication, disabled, onImport }) {
  return <div className={styles.newerNotice}>
    <span><strong>GitHub에 아직 수집되지 않은 발행본이 있습니다</strong>
      {formatAdminTime(publication.published_at, { seconds: false })} 발행{publication.source_sha ? ` · 소스 ${publication.source_sha.slice(0, 8)}` : ""}</span>
    <button type="button" className={styles.button} disabled={disabled} onClick={() => onImport(publication)}>가져오기</button>
  </div>;
}

// GitHub 최근 발행 목록 첫 쪽만 본다 그보다 오래된 발행본은 주기 수집이 이미 가져갔다고 본다
function PublicationCheck({ challengeSlug, data, disabled, onImport }) {
  const catalog = useAdminResource((config) => getPublishedChallenges(1, config), [challengeSlug], "발행 목록을 불러오지 못했습니다");
  const publication = catalog.status === "success" ? uncollectedPublication(catalog.data.items, challengeSlug, data) : null;
  return publication ? <UncollectedNotice publication={publication} disabled={disabled} onImport={onImport}/> : null;
}

function ChoiceConfirmation({ data, choice, reason, saving, onReason, onConfirm, onCancel }) {
  const form = useRef(null);
  useEffect(() => { form.current?.focus(); }, [choice]);
  const pinning = choice.mode === "SELECTED";
  const next = pinning ? choice.file : data.latest_file;
  const reasonError = validateReleaseActivationReason(reason);
  return <form ref={form} tabIndex={-1} className={`${styles.confirmation} ${styles.releaseConfirmation}`} aria-label="참가자 파일 전환 확인" onSubmit={onConfirm}>
    <h4 className={styles.groupTitle}>{pinning ? "참가자 파일 고정" : "최신 자동으로 돌리기"}</h4>
    <p className={styles.dialogLead}>지금: <strong>{describeStaticFile(data.status === "available" ? data.current_file : null, data.mode === "SELECTED")}</strong> → <strong>{describeStaticFile(next, pinning)}</strong></p>
    <p className={styles.dialogLead}>{pinning ? "새 발행본이 수집돼도 고정을 풀 때까지 이 ZIP을 줍니다" : "앞으로 새 발행본이 수집되면 참가자 파일도 바로 바뀝니다"} 이미 내려받은 참가자 파일은 그대로입니다</p>
    <AdminReasonField label="전환 사유" note="선택" value={reason} onChange={onReason} multiline maxLength={null} disabled={saving}
      placeholder={pinning ? "예: 새 ZIP에 빠진 파일이 있어 이전 발행본으로 되돌림" : "예: 고친 발행본 확인 후 최신 자동으로 복구"}
      hint={`${Array.from(reason.trim()).length}/500자 · 처리자와 함께 감사 로그에 남습니다`}/>
    {reasonError && <p role="alert" className={styles.errorText}>{reasonError}</p>}
    <div className={styles.formActions}>
      <button type="button" className={styles.button} disabled={saving} onClick={onCancel}>취소</button>
      <button type="submit" className={styles.primary} disabled={saving || Boolean(reasonError)}>{saving ? "처리 중…" : pinning ? "고정 확인" : "최신 자동 확인"}</button>
    </div>
  </form>;
}

export function CollectedFilesView({ data, challengeId, choice = null, reason = "", saving = false, error = "", notice = "", publicationNotice = null,
  onChoose, onReason, onConfirm, onCancel }) {
  const file = data.current_file;
  // 파일만 주는 문제는 배포 버전 대신 여기서 참가자 ZIP을 고정하거나 최신 자동으로 둔다
  const pinnable = isStaticFileChoice(data);
  const pinned = pinnable && data.mode === "SELECTED";
  const newer = pinnable ? newerCollectedFile(data) : null;
  return <>
    <div className={styles.settingHeading}><h3 className={styles.sectionTitle}>참가자 첨부파일</h3>
      {data.release_version && <span className={styles.secondary}>사용 중인 설정 버전 {data.release_version}</span>}
      {pinnable && <AdminBadge tone={pinned ? "orange" : "good"}>{pinned ? "고정" : "최신 자동"}</AdminBadge>}
    </div>
    <p className={styles.panelIntro}>prob/for_user 아래 파일을 묶은 ZIP입니다 참가자는 문제를 개방한 뒤 내려받을 수 있습니다
      {pinnable && (pinned ? " 고정한 ZIP을 주고, 새 발행본이 수집돼도 최신 자동으로 돌리기 전까지 바뀌지 않습니다"
        : " 가장 높은 발행번호의 ZIP을 자동으로 주고, 새 발행본이 수집되면 바로 바뀝니다")}</p>
    {error && <p role="alert" className={styles.callout} data-tone="bad">{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {publicationNotice}
    {newer && !choice && <div className={styles.newerNotice} data-tone="warn">
      <span><strong>더 높은 발행 #{newer.registry_revision}이 수집돼 있습니다</strong>고정을 풀면 참가자 파일이 바로 바뀝니다</span>
      <button type="button" className={styles.button} disabled={saving} onClick={() => onChoose({ mode: "LATEST" })}>최신 자동으로 돌리기</button>
    </div>}
    {data.status === "available" ? <div className={styles.attachmentCard}>
      <div><strong>{file.file_name}</strong><span className={styles.secondary}>ZIP 발행 {file.registry_revision} · 파일 {file.file_count}개 · {formatFileSize(file.file_size)}</span>
        <span className={styles.secondary}>압축 해제 시 {formatFileSize(file.uncompressed_size_bytes)} · 소스 {file.source_sha.slice(0, 8)}</span>
        {pinned && data.selected_at && <span className={styles.secondary}>{formatAdminTime(data.selected_at, { seconds: false })} {data.selected_by} 고정</span>}</div>
      <div className={styles.rowActions}>
        <AdminFileDownloadButton key={file.file_id} challengeId={challengeId} file={file}/>
        {pinnable && !pinned && <button type="button" className={styles.button} disabled={saving} onClick={() => onChoose({ mode: "SELECTED", file })}>이 ZIP으로 고정</button>}
        {pinned && !newer && <button type="button" className={styles.button} disabled={saving} onClick={() => onChoose({ mode: "LATEST" })}>최신 자동으로 돌리기</button>}
      </div>
    </div> : <p className={styles.fileNotice}>{MESSAGES[data.status] ?? "파일 정보를 확인해주세요"}</p>}
    {choice && <ChoiceConfirmation data={data} choice={choice} reason={reason} saving={saving} onReason={onReason} onConfirm={onConfirm} onCancel={onCancel}/>}
    <p className={styles.helpText}>저장소 설정: {data.storage.provider === "gcs" ? `GCS · ${data.storage.bucket}` : "로컬 파일 저장소"}</p>
    {data.history.length > 0 && <details className={styles.details} open={pinnable || undefined}><summary>다른 발행 버전의 파일 ({data.history.length}건)</summary>
      <p className={styles.helpText}>{pinnable ? "발행별 파일을 내려받아 확인하고 참가자에게 줄 ZIP으로 고정할 수 있습니다" : "발행별 파일을 내려받아 확인할 수 있습니다"} 현재 제공하는 파일은 위에 표시됩니다</p>
      <div className={styles.tableWrap}><table className={styles.fileTable} data-choice={pinnable || undefined} aria-label="첨부파일 발행 이력">
        <thead><tr><th>발행 / 소스</th><th>파일</th><th>다운로드</th>{pinnable && <th>참가자 제공</th>}</tr></thead>
        <tbody>{data.history.map((item) => <tr key={item.file_id}><td>발행 {item.registry_revision}
          {pinnable && item.file_id === data.latest_file?.file_id && <> <AdminBadge tone="orange">최신</AdminBadge></>}
          <span className={styles.secondary}>{item.source_sha.slice(0, 8)}</span></td>
          <td>{item.present ? `${item.file_count}개` : "파일 없음"}{item.present && <span className={styles.secondary}>{formatFileSize(item.file_size)}</span>}</td>
          <td>{item.present ? <AdminFileDownloadButton challengeId={challengeId} file={item} small/> : "없음"}</td>
          {pinnable && <td>{item.download_available ? <button type="button" className={`${styles.button} ${styles.small}`} disabled={saving}
            aria-label={`발행 ${item.registry_revision} ZIP으로 고정`} onClick={() => onChoose({ mode: "SELECTED", file: item })}>이 ZIP 사용</button> : "—"}</td>}
        </tr>)}</tbody></table></div>
      {data.history_has_more && <p className={styles.helpText}>최근 20건의 수집 기록을 표시합니다</p>}
    </details>}
  </>;
}

export default function AdminCollectedFilesPanel({ challengeId, challengeSlug, onBusyChange }) {
  const resource = useAdminResource((config) => getAdminChallengeFiles(challengeId, config), [challengeId], "참가자 파일을 불러오지 못했습니다");
  const data = resource.data;
  const [choice, setChoice] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(null);
  const requestKey = useRef(null);
  useEffect(() => { onBusyChange?.(saving); }, [saving, onBusyChange]);

  function choose(next) { setChoice(next); setReason(""); setError(""); setNotice(""); requestKey.current = null; }
  function changeReason(value) { setReason(value); requestKey.current = null; }

  async function confirm(event) {
    event.preventDefault();
    if (!choice || saving || validateReleaseActivationReason(reason)) return;
    const trimmed = reason.trim();
    const body = { mode: choice.mode, ...(choice.mode === "SELECTED" ? { file_id: choice.file.file_id } : {}), ...(trimmed ? { reason: trimmed } : {}) };
    // 응답을 못 받고 다시 누르면 같은 키로 보내 한 번만 바뀌게 한다
    requestKey.current ??= createAdminIdempotencyKey("static-files");
    setSaving(true);
    setError("");
    try {
      const response = await selectStaticChallengeFile(challengeId, body, requestKey.current);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "참가자 파일 설정을 저장하지 못했습니다");
      const current = response.data.data?.current_file;
      setChoice(null);
      setReason("");
      requestKey.current = null;
      setNotice(choice.mode === "SELECTED" ? `발행 #${current?.registry_revision ?? choice.file.registry_revision} ZIP으로 고정했습니다 참가자 화면에 바로 적용됩니다`
        : "최신 자동으로 돌렸습니다 가장 높은 발행번호의 ZIP을 줍니다");
      // 기본 정보의 파일 카드도 같은 파일을 보이게 열린 조회를 모두 다시 읽는다
      notifyAdminResourceChanged();
    } catch (failure) {
      setError(failure?.response?.data?.message || failure.message || "참가자 파일 설정을 저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  }

  function imported() {
    setNotice("발행본을 가져왔습니다 아래에서 참가자에게 주는 파일을 확인해주세요");
    notifyAdminResourceChanged();
  }

  return <>
    <AdminStatusMessage status={resource.status} error={resource.error} onRetry={resource.retry} hasData={Boolean(data)}/>
    {data && <CollectedFilesView data={data} challengeId={challengeId} choice={choice} reason={reason} saving={saving} error={error} notice={notice}
      publicationNotice={isStaticFileChoice(data) && challengeSlug
        ? <PublicationCheck key={data.latest_file?.file_id ?? "none"} challengeSlug={challengeSlug} data={data} disabled={saving} onImport={setImporting}/> : null}
      onChoose={choose} onReason={changeReason} onConfirm={confirm} onCancel={() => { setChoice(null); setReason(""); requestKey.current = null; }}/>}
    <RepositoryFilesDetails challengeId={challengeId}/>
    {importing && <AdminPublicationImportDialog initialPublication={importing} onClose={() => setImporting(null)} onImported={imported}/>}
  </>;
}
