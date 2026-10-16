import { useState } from "react";
import { getAdminChallengeFiles, getAdminChallengeRepositoryFiles } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { FILE_KINDS, formatFileSize } from "../utils/adminChallengeSettings.js";
import AdminFileDownloadButton from "./AdminFileDownloadButton.jsx";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export function RepositoryFilesDetails({ challengeId }) {
  const [showSource, setShowSource] = useState(false);
  return <details className={styles.details} onToggle={(event) => setShowSource(event.currentTarget.open)}>
    <summary>출제 저장소의 원본 파일 보기</summary>
    {showSource && <div className="mt-5"><RepositoryFilesPanel challengeId={challengeId}/></div>}
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

export default function AdminCollectedFilesPanel({ challengeId }) {
  const resource = useAdminResource((config) => getAdminChallengeFiles(challengeId, config), [challengeId], "참가자 파일을 불러오지 못했습니다");
  const data = resource.data;
  const file = data?.current_file;
  const messages = {
    no_release: "배포 버전을 선택하면 해당 버전의 참가자 파일이 연결됩니다",
    pending: "이 버전의 파일 수집 기록이 없습니다 CI 발행과 백엔드 수집 상태를 확인해주세요",
    none: "이 버전은 첨부파일 없이 발행됐습니다",
    disabled: "현재 설정 버전은 참가자에게 첨부파일을 제공하지 않습니다",
    unavailable: "연결된 파일을 찾지 못했습니다 배포 파일 설정과 수집 상태를 확인해주세요",
  };
  return <>
    <AdminStatusMessage status={resource.status} error={resource.error} onRetry={resource.retry}/>
    {resource.status === "success" && <>
      <div className={styles.settingHeading}><h3 className={styles.sectionTitle}>참가자 첨부파일</h3>
        {data.release_version && <span className={styles.secondary}>사용 중인 설정 버전 {data.release_version}</span>}</div>
      <p className={styles.panelIntro}>prob/for_user 아래 파일을 묶은 ZIP입니다 참가자는 문제를 개방한 뒤 내려받을 수 있습니다</p>
      {data.status === "available" ? <div className={styles.attachmentCard}>
        <div><strong>{file.file_name}</strong><span className={styles.secondary}>ZIP 발행 {file.registry_revision} · 파일 {file.file_count}개 · {formatFileSize(file.file_size)}</span>
          <span className={styles.secondary}>압축 해제 시 {formatFileSize(file.uncompressed_size_bytes)} · 소스 {file.source_sha.slice(0, 8)}</span></div>
        <AdminFileDownloadButton key={file.file_id} challengeId={challengeId} file={file}/>
      </div> : <p className={styles.fileNotice}>{messages[data.status] ?? "파일 정보를 확인해주세요"}</p>}
      <p className={styles.helpText}>저장소 설정: {data.storage.provider === "gcs" ? `GCS · ${data.storage.bucket}` : "로컬 파일 저장소"}</p>
      {data.history.length > 0 && <details className={styles.details}><summary>다른 발행 버전의 파일 ({data.history.length}건)</summary>
        <p className={styles.helpText}>발행별 파일을 내려받아 확인할 수 있습니다 현재 제공하는 파일은 위에 표시됩니다</p>
        <div className={styles.tableWrap}><table className={styles.fileTable} aria-label="첨부파일 발행 이력">
          <thead><tr><th>발행 / 소스</th><th>파일</th><th>다운로드</th></tr></thead>
          <tbody>{data.history.map((item) => <tr key={item.file_id}><td>발행 {item.registry_revision}<span className={styles.secondary}>{item.source_sha.slice(0, 8)}</span></td>
            <td>{item.present ? `${item.file_count}개` : "파일 없음"}{item.present && <span className={styles.secondary}>{formatFileSize(item.file_size)}</span>}</td>
            <td>{item.present ? <AdminFileDownloadButton challengeId={challengeId} file={item}/> : "없음"}</td></tr>)}</tbody></table></div>
        {data.history_has_more && <p className={styles.helpText}>최근 20건의 수집 기록을 표시합니다</p>}
      </details>}
    </>}
    <RepositoryFilesDetails challengeId={challengeId}/>
  </>;
}
