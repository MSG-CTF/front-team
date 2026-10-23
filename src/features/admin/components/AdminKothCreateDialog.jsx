import { useMemo, useRef, useState } from "react";
import { createAdminKothChallenge, getAdminKothRepository } from "../../../api/admin.js";
import { getKothClubs } from "../../../api/koth.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { NEW_KOTH_CLUB, applyKothFolder, buildKothCreate, freeKothClubs, kothCreateForm, kothFolderTwin, validateKothCreate } from "../utils/adminKoth.js";
import { shiftKstInput } from "../utils/adminContestTime.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminReasonField } from "./AdminFormParts.jsx";
import pickerStyles from "./AdminPicker.module.css";
import ui from "./AdminWorkspace.module.css";
import styles from "../pages/AdminKoth.module.css";

const CREATE_REASONS = ["새 KoTH 문제 등록", "출제 저장소에서 등록", "동아리 문제 추가"];
const UNAVAILABLE = "KoTH 등록은 관리자 KoTH API(POST /admin/koth/challenges)가 백엔드에 반영되면 열립니다";
const NO_FOLDERS = async () => ({ data: { code: "SUCCESS", data: null } });

// KoTH 문제 등록: 제오파디의 직접 등록과 GitHub 가져오기처럼 직접 쓰거나 저장소 koth 폴더에서 채운다
// 동아리마다 문제는 하나고 새 문제는 공개 예정으로 만든다 문제 서버용 내부 토큰 원문은 등록 직후 한 번만 보인다
export default function AdminKothCreateDialog({ source = "manual", challenges = [], limited, onClose, onCreated, onOpen, onLink }) {
  const fromRepository = source === "repository";
  const clubs = useAdminResource(getKothClubs, [], "동아리 목록을 불러오지 못했습니다");
  const repository = useAdminResource(fromRepository ? getAdminKothRepository : NO_FOLDERS, [fromRepository], "저장소 폴더를 불러오지 못했습니다");
  const freeClubs = useMemo(() => freeKothClubs(clubs.data?.clubs), [clubs.data]);
  const folders = useMemo(() => (repository.data?.challenges ?? []).filter((folder) => !folder.linked_koth_challenge_id), [repository.data]);
  const [form, setForm] = useState(kothCreateForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const pending = useRef(false);
  const invalid = validateKothCreate(form);
  const needsFolder = fromRepository && !form.repository_slug;
  // 저장소 미연결로 이미 있는 같은 문제의 폴더를 고르면 새로 만들지 말고 그 문제에 잇도록 알린다
  const twin = fromRepository ? kothFolderTwin(folders.find((folder) => folder.slug === form.repository_slug), challenges) : null;
  const blocked = limited || repository.status === "unavailable";
  const edit = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  async function submit(event) {
    event.preventDefault();
    if (pending.current || blocked || invalid || needsFolder) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await createAdminKothChallenge(buildKothCreate(form));
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "KoTH 문제를 등록하지 못했습니다");
      const { internal_token: token, ...challenge } = response.data.data;
      setCreated({ challenge, token: token ?? "" });
      await onCreated?.(challenge);
    } catch (failure) {
      const result = getAdminRequestError(failure, "KoTH 문제를 등록하지 못했습니다");
      setError(result.status === "unavailable" ? UNAVAILABLE : result.error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(created.token); setCopied(true); }
    catch { setError("토큰을 복사하지 못했습니다 토큰을 직접 선택해 복사해주세요"); }
  }

  if (created) {
    return <AdminDialog title="KoTH 문제 등록" subtitle={created.challenge.title} onClose={onClose}>
      <div className={ui.formStack}>
        <p className={ui.callout} data-tone="good">{created.challenge.club_name ? `${created.challenge.club_name} · ` : ""}{created.challenge.title} 문제를 공개 예정으로 등록했습니다</p>
        {created.token ? <div className={ui.field}>
          <span className={ui.fieldLabel}>문제 서버 내부 토큰 <small>이 창을 닫으면 다시 볼 수 없습니다</small></span>
          <div className={styles.tokenRow}>
            <code className={`${styles.token} ${ui.mono}`}>{created.token}</code>
            <button type="button" className={ui.button} onClick={copy}>{copied ? "복사됨" : "복사"}</button>
          </div>
          <p className={ui.fieldHint}>문제 서버가 팀 토큰 확인과 팀 목록 API(/internal)를 부를 때 X-Internal-Token 헤더로 보냅니다 플랫폼에는 해시만 남습니다</p>
        </div> : <p className={ui.callout} data-tone="warn">백엔드 응답에 내부 토큰이 없습니다 문제 서버 토큰은 백엔드에서 따로 확인해주세요</p>}
        {error && <p role="alert" className={ui.errorText}>{error}</p>}
        <div className={ui.formActions}>
          <button type="button" className={ui.button} onClick={onClose}>닫기</button>
          <button type="button" className={ui.primary} onClick={() => onOpen(created.challenge)}>상세에서 이어서 설정</button>
        </div>
      </div>
    </AdminDialog>;
  }

  return <AdminDialog title="KoTH 문제 등록" onClose={onClose} busy={busy} wide
    subtitle={fromRepository ? "출제 저장소의 koth 폴더로 제목과 지문을 채웁니다 새 문제는 공개 예정으로 만듭니다" : "새 문제는 공개 예정으로 만듭니다 동아리마다 문제는 하나입니다"}>
    <form onSubmit={submit} className={ui.formStack}>
      {blocked && <p className={ui.callout}>{UNAVAILABLE}</p>}
      <fieldset disabled={busy || blocked} className={styles.editorFields}>
        {fromRepository && !blocked && <section className={styles.picker} aria-label="저장소 폴더 고르기">
          <AdminStatusMessage status={repository.status} error={repository.error} onRetry={repository.retry} hasData={Boolean(repository.data)} />
          {repository.data && <>
            <p className={ui.quietNote}>{repository.data.repository} · {repository.data.ref} 에서 아직 연결하지 않은 KoTH 폴더 {folders.length}개</p>
            {folders.length > 0 ? <ul className={styles.folderList} role="radiogroup" aria-label="저장소 폴더">
              {folders.map((folder) => <li key={folder.slug}>
                <label className={styles.folder}>
                  <input type="radio" name="koth-create-folder" value={folder.slug} checked={form.repository_slug === folder.slug}
                    onChange={() => { setForm((current) => applyKothFolder(current, folder)); setError(""); }} />
                  <span className={styles.folderText}>
                    <strong>{folder.title}</strong>
                    <span className={ui.mono}>{folder.slug}</span>
                    <span>출제 {folder.author || "-"}{folder.last_commit?.revision ? ` · ${folder.last_commit.revision}` : ""}</span>
                  </span>
                </label>
              </li>)}
            </ul> : <p className={ui.quietNote}>모든 koth 폴더가 이미 문제에 연결돼 있습니다 새 폴더를 저장소에 올리거나 직접 등록해주세요</p>}
            {twin && <div className={`${ui.callout} ${styles.twin}`} data-tone="warn">
              <span>{twin.club_name ? `${twin.club_name} · ` : ""}{twin.title} 문제가 저장소 미연결로 이미 있습니다 같은 문제라면 새로 등록하지 말고 그 문제에 이 폴더를 연결하세요</span>
              <button type="button" className={ui.button} onClick={() => onLink(twin)}>그 문제에 연결하기</button>
            </div>}
          </>}
        </section>}
        <div className={styles.createRow}>
          <label className={ui.field}><span className={ui.fieldLabel}>동아리 <small>동아리마다 문제 하나</small></span>
            <select className={ui.select} value={form.club_id} onChange={(event) => edit("club_id", event.target.value)}>
              <option value="">{clubs.status === "loading" ? "불러오는 중" : "고르세요"}</option>
              {freeClubs.map((club) => <option key={club.club_id} value={club.club_id}>{club.name}</option>)}
              <option value={NEW_KOTH_CLUB}>새 동아리 만들기</option>
            </select></label>
          {form.club_id === NEW_KOTH_CLUB
            ? <label className={ui.field}><span className={ui.fieldLabel}>새 동아리 이름</span>
              <input className={ui.input} maxLength={100} value={form.club_name} onChange={(event) => edit("club_name", event.target.value)} /></label>
            : <p className={ui.fieldHint}>{clubs.status === "error" ? clubs.error : `문제가 없는 동아리 ${freeClubs.length}곳`}</p>}
        </div>
        <div className={styles.createTitle}>
          <label className={ui.field}><span className={ui.fieldLabel}>제목</span>
            <input className={ui.input} value={form.title} maxLength={100} onChange={(event) => edit("title", event.target.value)} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>공개 순번 <small>1~12</small></span>
            <input className={ui.input} inputMode="numeric" value={form.open_group} onChange={(event) => edit("open_group", event.target.value.replace(/[^0-9]/g, "").slice(0, 2))} /></label>
        </div>
        <div className={styles.scheduleRow}>
          <div className={ui.field}>
            <label htmlFor="koth-create-opened" className={ui.fieldLabel}>여는 시각 <small>KST · 비워 두면 나중에 정함</small></label>
            <input id="koth-create-opened" type="datetime-local" className={ui.input} value={form.opened_at} onChange={(event) => edit("opened_at", event.target.value)} />
          </div>
          <div className={ui.field}>
            <label htmlFor="koth-create-closed" className={ui.fieldLabel}>닫는 시각 <small>KST</small></label>
            <input id="koth-create-closed" type="datetime-local" className={ui.input} value={form.closed_at} onChange={(event) => edit("closed_at", event.target.value)} />
          </div>
          <div className={pickerStyles.chips} role="group" aria-label="닫는 시각 빠른 선택">
            {[2, 4].map((hours) => <button key={hours} type="button" className={pickerStyles.chip} disabled={busy || blocked || !form.opened_at}
              onClick={() => edit("closed_at", shiftKstInput(form.opened_at, hours * 60))}>여는 시각부터 {hours}시간</button>)}
          </div>
        </div>
        <section className={styles.connection} aria-label="문제 서버 연결">
          <div className={styles.connectionFields}>
            <label className={ui.field}><span className={ui.fieldLabel}>참가자 접속 주소 <small>진행 중일 때만 참가자에게 보입니다</small></span>
              <input className={`${ui.input} ${ui.inputMono}`} value={form.challenge_url} placeholder="https://koth-example.msgctf.kr" onChange={(event) => edit("challenge_url", event.target.value)} /></label>
            <label className={ui.field}><span className={ui.fieldLabel}>채점 주소 <small>플랫폼만 부릅니다</small></span>
              <input className={`${ui.input} ${ui.inputMono}`} value={form.score_api_url} placeholder="http://koth-example:9090/internal/koth/scores" onChange={(event) => edit("score_api_url", event.target.value)} /></label>
            <label className={ui.field}><span className={ui.fieldLabel}>채점 토큰 환경 변수 <small>값이 아닌 이름</small></span>
              <input className={`${ui.input} ${ui.inputMono}`} value={form.score_api_token_env} placeholder="KOTH_EXAMPLE_TOKEN" onChange={(event) => edit("score_api_token_env", event.target.value.toUpperCase())} /></label>
          </div>
          <p className={ui.fieldHint}>주소는 나중에 문제 정보 탭에서 연결 확인과 함께 고칠 수 있습니다</p>
        </section>
        <label className={ui.field}><span className={ui.fieldLabel}>지문</span>
          <textarea className={`${ui.textarea} ${styles.description}`} rows={7} value={form.description} onChange={(event) => edit("description", event.target.value)} /></label>
        <AdminReasonField label="사유" note="운영 기록에 남습니다" value={form.reason} onChange={(value) => edit("reason", value)} presets={CREATE_REASONS} disabled={busy || blocked} required />
      </fieldset>
      <div className={ui.formActions}>
        <div className={ui.formFeedback}>
          {error && <p role="alert" className={ui.errorText}>{error}</p>}
          {!error && !blocked && (needsFolder ? repository.data && folders.length > 0 && <p className={ui.fieldHint}>저장소 폴더를 고르세요</p>
            : form.title && invalid && <p className={ui.fieldHint}>{invalid}</p>)}
        </div>
        <button type="button" onClick={onClose} disabled={busy} className={ui.button}>취소</button>
        <button type="submit" disabled={busy || blocked || Boolean(invalid) || needsFolder} className={ui.primary}>{busy ? "등록 중" : "문제 등록"}</button>
      </div>
    </form>
  </AdminDialog>;
}
