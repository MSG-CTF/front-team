import { useMemo, useState } from "react";
import { downloadAdminKothFiles, getAdminKothFiles, updateAdminKothFiles } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { KOTH_FILE_MODES, groupKothFiles, kothFileWarnings, repositoryFreshness } from "../utils/adminKoth.js";
import { formatFileSize } from "../utils/adminChallengeSettings.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminReasonField, AdminSegmented } from "./AdminFormParts.jsx";
import { AdminDownloadButton } from "./AdminFileDownloadButton.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "../pages/AdminKoth.module.css";

const REASONS = {
  REPOSITORY: ["저장소 파일 반영", "출제자 요청", "캐시 파일 정리 후 다시 묶기"],
  NONE: ["접속 주소만으로 풀이", "파일 점검 중", "출제자 요청"],
};

// 문제 정보 탭에 붙는 한 줄 요약: 참가자가 받는 zip 과 묶은 시각, 받아 보기
export function KothFileSummary({ challenge, limited, onOpenFiles }) {
  const bundle = challenge.files?.mode === "REPOSITORY" ? challenge.files.bundle : null;
  if (limited || !challenge.files) return null;
  return <section className={styles.fileSummary} aria-label="참가자 파일">
    <span className={styles.fileSummaryLabel}>참가자 파일</span>
    {bundle ? <span className={styles.fileSummaryText}><strong>{bundle.file_name}</strong>
      {[`${formatAdminNumber(bundle.file_count)}개`, formatFileSize(bundle.size_bytes), bundle.built_at && `${formatAdminTime(bundle.built_at, { seconds: false })} 묶음`].filter(Boolean).join(" · ")}</span>
      : <span className={styles.fileSummaryText}>주지 않음 · 참가자는 접속 주소만 받습니다</span>}
    {bundle && <AdminDownloadButton small fetchFile={(config) => downloadAdminKothFiles(challenge.koth_challenge_id, config)} fileName={bundle.file_name}
      ariaLabel={`${bundle.file_name} 받기`} />}
    {onOpenFiles && <button type="button" className={`${ui.button} ${ui.small}`} onClick={onOpenFiles}>바꾸기</button>}
  </section>;
}

// 참가자 파일: 제오파디 문제처럼 파일이 있을 수도 없을 수도 있다
// 저장소 prob/for_user 폴더를 zip 하나로 묶어 주거나, 접속 주소만 주고 파일은 주지 않는다
export default function AdminKothFilesPanel({ challenge, limited, onSaved, onOpenRepository }) {
  const files = useAdminResource((config) => getAdminKothFiles(challenge.koth_challenge_id, config),
    [challenge.koth_challenge_id, challenge.repository?.slug], "참가자 파일 정보를 불러오지 못했습니다");
  const data = files.data;
  const list = useMemo(() => data?.files ?? [], [data]);
  const groups = useMemo(() => groupKothFiles(list), [list]);
  const warnings = useMemo(() => kothFileWarnings(list), [list]);
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const hasRepositoryFiles = list.length > 0;
  const mode = data?.mode ?? "NONE";
  const shownMode = pending ?? mode;

  function pick(next) {
    setSaved("");
    setError("");
    setPending(next === mode ? null : next);
  }

  async function save(target) {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await updateAdminKothFiles(challenge.koth_challenge_id, { mode: target, reason: reason.trim() });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "저장하지 못했습니다");
      setSaved(target === "NONE" ? "참가자 파일을 내렸습니다" : mode === "REPOSITORY" ? "저장소 최신 파일로 다시 묶었습니다" : "참가자에게 저장소 파일을 줍니다");
      setPending(null);
      setReason("");
      await Promise.all([files.reload(), onSaved?.()]);
    } catch (failure) {
      setError(failure?.response?.data?.message || failure?.message || "저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (limited || files.status === "unavailable") {
    return <p className={ui.quietNote}>참가자 파일은 GET /admin/koth/challenges/&#123;id&#125;/files 가 백엔드에 반영되면 고를 수 있습니다 저장소 prob/for_user 폴더를 zip 하나로 묶어 주는 계약입니다</p>;
  }
  if (!data) return <AdminStatusMessage status={files.status} error={files.error} onRetry={files.retry} hasData={false} />;

  const toggle = (key) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const rebuilding = pending === "REPOSITORY" && mode === "REPOSITORY";
  const fresh = repositoryFreshness(data.repository && { source_revision: data.bundle?.source_revision ?? data.repository.revision,
    latest_revision: data.repository.latest_revision, latest_committed_at: data.repository.latest_committed_at });

  return <div className={styles.files}>
    <div className={styles.filesHead}>
      <AdminSegmented label="참가자 파일" value={shownMode} onChange={pick} disabled={busy}
        items={KOTH_FILE_MODES.map((item) => ({ ...item, disabled: item.key === "REPOSITORY" && !hasRepositoryFiles }))} />
      <p className={styles.filesLead}>
        {shownMode === "NONE" ? "참가자 화면에는 접속 주소만 보입니다"
          : data.bundle ? <>참가자는 <strong>{data.bundle.file_name}</strong> 하나를 받습니다 · {formatFileSize(data.bundle.size_bytes)}</>
            : "저장하면 저장소 파일을 zip 하나로 묶어 참가자 화면에 받기 버튼을 둡니다"}
      </p>
    </div>

    {!data.repository && <div className={styles.filesEmpty}>
      <strong>연결된 저장소 폴더가 없습니다</strong>
      <p>저장소 연결 탭에서 koth 폴더를 연결하면 prob/for_user 파일을 줄 수 있습니다</p>
      {onOpenRepository && <button type="button" className={ui.button} onClick={onOpenRepository}>저장소 연결로 가기</button>}
    </div>}
    {data.repository && !hasRepositoryFiles && <div className={styles.filesEmpty}>
      <strong>저장소에 줄 파일이 없습니다</strong>
      <p>{data.repository.path} 폴더가 비어 있거나 없습니다 이 문제는 접속 주소만으로 진행합니다</p>
    </div>}

    {data.repository && hasRepositoryFiles && <section className={styles.bundle} aria-label="저장소 파일" data-muted={shownMode === "NONE" || undefined}>
      <header className={styles.bundleHead}>
        <div className={styles.bundleTitle}>
          <strong className={ui.mono}>{data.repository.path}</strong>
          <span>{formatAdminNumber(list.length)}개 파일 · 압축 전 {formatFileSize(data.total_size_bytes ?? 0)}
            {data.bundle?.source_revision ? ` · 커밋 ${data.bundle.source_revision}` : data.repository.revision ? ` · 커밋 ${data.repository.revision}` : ""}
            {data.bundle?.built_at ? ` · ${formatAdminTime(data.bundle.built_at, { seconds: false })} 묶음` : ""}</span>
        </div>
        {shownMode === "NONE" && <AdminBadge>주지 않음</AdminBadge>}
        {data.repository.source_url && <a className={`${ui.button} ${ui.small}`} href={data.repository.source_url} target="_blank" rel="noreferrer">GitHub에서 보기 ↗</a>}
        {data.bundle && <AdminDownloadButton small fetchFile={(config) => downloadAdminKothFiles(challenge.koth_challenge_id, config)} fileName={data.bundle.file_name}
          label="ZIP 받기" ariaLabel={`${data.bundle.file_name} 받기`} />}
        {mode === "REPOSITORY" && !pending && <button type="button" className={`${ui.button} ${ui.small}`} disabled={busy} onClick={() => { setPending("REPOSITORY"); setSaved(""); }}>저장소 최신으로 다시 묶기</button>}
      </header>
      {mode === "REPOSITORY" && fresh.behind && <p className={ui.callout} data-tone="warn"><strong>저장소 main 에 새 커밋이 있습니다</strong>
        {" "}{[fresh.latest, fresh.latestAt && formatAdminTime(fresh.latestAt, { seconds: false })].filter(Boolean).join(" · ")} · 다시 묶으면 참가자 파일도 이 커밋으로 바뀝니다</p>}

      {warnings.length > 0 && <ul className={styles.fileWarnings} aria-label="확인할 파일">
        {warnings.map((warning) => <li key={warning.key}>
          <strong>{warning.label} {formatAdminNumber(warning.paths.length)}개</strong>
          <span>{warning.hint} 저장소에서 지운 뒤 다시 묶으세요</span>
          <code title={warning.paths.join("\n")}>{warning.paths.slice(0, 2).join(", ")}{warning.paths.length > 2 ? ` 외 ${warning.paths.length - 2}개` : ""}</code>
        </li>)}
      </ul>}

      <ul className={styles.fileTree} aria-label="파일 목록">
        {groups.map((group) => {
          const expanded = open.has(group.key);
          const warned = (path) => warnings.some((warning) => warning.paths.includes(path));
          if (!group.folder) {
            return <li key={group.key} className={styles.fileRow} data-warn={warned(group.files[0].path) || undefined}>
              <span className={styles.fileName}>{group.name}</span>
              <span className={styles.fileSize}>{formatFileSize(group.size)}</span>
            </li>;
          }
          return <li key={group.key}>
            <button type="button" className={`${styles.fileRow} ${styles.folderRow}`} aria-expanded={expanded} onClick={() => toggle(group.key)}
              data-warn={group.files.some((file) => warned(file.path)) || undefined}>
              <span className={styles.fileName}><span className={styles.folderCaret} aria-hidden="true" />{group.name}</span>
              <span className={styles.fileCount}>{formatAdminNumber(group.files.length)}개</span>
              <span className={styles.fileSize}>{formatFileSize(group.size)}</span>
            </button>
            {expanded && <ul className={styles.fileChildren}>
              {group.files.map((file) => <li key={file.path} className={styles.fileRow} data-warn={warned(file.path) || undefined}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size_bytes ?? 0)}</span>
              </li>)}
            </ul>}
          </li>;
        })}
      </ul>
    </section>}

    {pending && <section className={styles.filesSave} aria-label="참가자 파일 바꾸기">
      <p>{pending === "NONE" ? "참가자 화면에서 파일 받기 버튼이 사라집니다 이미 받은 팀의 파일은 그대로 남습니다"
        : rebuilding ? "저장소 main 의 최신 prob/for_user 로 zip 을 다시 만듭니다 받기 버튼은 그대로 두고 파일만 바뀝니다"
          : "저장소 prob/for_user 를 zip 으로 묶어 참가자 화면에 받기 버튼을 둡니다"}</p>
      <AdminReasonField label="사유" value={reason} onChange={setReason} presets={REASONS[pending]} disabled={busy} required />
      {error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={ui.formActions}>
        <button type="button" className={ui.button} disabled={busy} onClick={() => { setPending(null); setReason(""); setError(""); }}>취소</button>
        <button type="button" className={pending === "NONE" ? ui.dangerSolid : ui.primary} disabled={busy || !reason.trim()} onClick={() => save(pending)}>
          {busy ? "저장 중" : pending === "NONE" ? "파일 내리기" : rebuilding ? "다시 묶기" : "파일 주기"}
        </button>
      </div>
    </section>}

    {saved && <p className={ui.successText} role="status">{saved}</p>}
    {data.updated_at && <p className={styles.filesMeta}>{data.updated_by ? `${data.updated_by} · ` : ""}{formatAdminTime(data.updated_at, { seconds: false })} 바꿈</p>}
  </div>;
}
