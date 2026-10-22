import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminSignature, getAdminSignatures, publishAdminSignature, updateAdminSignature } from "../../../api/admin.js";
import { getKothClubs } from "../../../api/koth.js";
import { isSuccess } from "../../../utils/response.js";
import AdminDialog from "../components/AdminDialog.jsx";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { IconButton } from "../components/AdminWidgets.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { signaturePayload, validateSignature } from "../utils/adminSignature.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { AdminSwitch } from "../components/AdminFormParts.jsx";
import { Glyph } from "../components/AdminGlyph.jsx";
import ui from "../components/AdminWorkspace.module.css";

const EMPTY_FORM = { clubId: "", title: "", description: "", flag: "", score: "300" };
const MISSING_FIELD_LABELS = { title: "제목", description: "지문", flag: "플래그" };

export default function AdminSignaturesPage() {
  const signatures = useAdminResource(getAdminSignatures, [], "시그니처 목록을 불러오지 못했습니다");
  const clubs = useAdminResource(getKothClubs, [], "동아리 목록을 불러오지 못했습니다");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scoreConfirmed, setScoreConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const editing = dialog?.kind === "edit";
  const draft = editing && !dialog.entry.is_published;
  const scoreChanged = editing && Number(form.score) !== Number(dialog.entry.score);
  const availableClubs = (clubs.data?.clubs ?? []).filter((club) =>
    !(signatures.data?.signatures ?? []).some((entry) => entry.club_id === club.club_id));
  const rows = signatures.data?.signatures ?? [];

  function openEditor(entry) {
    setError("");
    setNotice("");
    setScoreConfirmed(false);
    setForm(entry ? { clubId: entry.club_id, title: entry.title, description: entry.description, flag: "", score: String(entry.score) } : EMPTY_FORM);
    setDialog({ kind: entry ? "edit" : "create", entry });
  }

  function closeDialog() {
    setDialog(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (pending.current || !dialog) return;
    if (dialog.kind !== "publish") {
      const validation = validateSignature(form, editing, draft);
      if (validation) { setError(validation); return; }
      if (scoreChanged && !scoreConfirmed) { setError("기존 해결 팀의 점수 변경을 확인해주세요"); return; }
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = dialog.kind === "publish"
        ? await publishAdminSignature(dialog.entry.signature_id, !dialog.entry.is_published)
        : editing
          ? await updateAdminSignature(dialog.entry.signature_id, signaturePayload(form, true))
          : await createAdminSignature(signaturePayload(form));
      if (!isSuccess(response.data)) throw Object.assign(new Error("요청을 처리하지 못했습니다"), { response });
      const success = dialog.kind === "create" ? "비공개로 등록했습니다" : dialog.kind === "publish" ? "공개 상태를 변경했습니다" : "문제를 수정했습니다";
      closeDialog();
      const refreshed = await signatures.reload();
      setNotice(refreshed ? success : `${success} 목록을 새로고침해서 확인하세요`);
    } catch (requestError) {
      const status = requestError?.response?.status;
      setError(!status || status >= 500
        ? "처리 결과를 확인하지 못했습니다 닫은 뒤 목록을 새로고침해서 확인하세요"
        : requestError.response?.data?.message || "요청을 처리하지 못했습니다");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <AdminLayout title="시그니처 문제" actions={<>
    <IconButton icon="refresh" label="새로고침" onClick={signatures.retry} disabled={busy || signatures.status === "loading"} />
    <button type="button" className={ui.primary} onClick={() => openEditor()} disabled={busy || signatures.status !== "success" || clubs.status !== "success" || availableClubs.length === 0}>시그니처 등록</button>
  </>}>
    <AdminStatusMessage status={signatures.status} error={signatures.error} onRetry={signatures.retry} hasData={Boolean(signatures.data)} />
    <AdminStatusMessage status={clubs.status} error={clubs.error} onRetry={clubs.retry} hasData={Boolean(clubs.data)} />
    {notice && <p role="status" className={ui.callout} data-tone="good">{notice}</p>}
    {signatures.data && <div className={`${ui.tableWrap} ${ui.signatureStack}`}>
      <table className={ui.table} aria-label="시그니처 문제 목록">
        <thead><tr>
          <th>동아리</th>
          <th>제목</th>
          <th className={ui.num}>점수</th>
          <th className={ui.num}>해결 팀</th>
          <th>공개 상태</th>
          <th>관리</th>
        </tr></thead>
        <tbody>
          {rows.map((entry) => <tr key={entry.signature_id}>
            <td><span className={ui.title}>{entry.club_name}</span></td>
            <td className={`${ui.wrap} ${ui.titleCell}`}>{entry.title || <span className={ui.muted}>제목 미등록</span>}</td>
            <td className={ui.num}>{formatAdminNumber(entry.score)}</td>
            <td className={ui.num}>{entry.solved_team_count}</td>
            <td>
              <span className={ui.publishCell}>
                <AdminSwitch checked={entry.is_published} disabled={busy || (!entry.is_published && entry.missing_fields?.length > 0)}
                  label={`${entry.club_name} ${entry.is_published ? "비공개로 전환" : "공개로 전환"}`}
                  onChange={() => { setError(""); setNotice(""); setDialog({ kind: "publish", entry }); }} />
                <span data-on={entry.is_published || undefined}>{entry.is_published ? "공개" : entry.missing_fields?.length ? "준비 중" : "비공개"}</span>
              </span>
              {entry.missing_fields?.length > 0 && <span className={ui.secondary}>{entry.missing_fields.map((field) => MISSING_FIELD_LABELS[field]).join(" · ")} 미등록</span>}
            </td>
            <td><div className={ui.rowActions}>
              <button type="button" className={`${ui.button} ${ui.small}`} disabled={busy} aria-label={`${entry.club_name} 문제 수정`} onClick={() => openEditor(entry)}>수정</button>
              <Link className={ui.fileLink} to={`/admin/signatures/${entry.signature_id}/preview`} target="_blank" rel="noreferrer"
                aria-label={`${entry.club_name} 참가자 화면 미리보기`} title="저장한 내용으로 열립니다">미리보기 ↗</Link>
            </div></td>
          </tr>)}
          {rows.length === 0 && <tr className={ui.emptyRow}><td colSpan={6} className={ui.empty}>등록된 시그니처 문제가 없습니다</td></tr>}
        </tbody>
      </table>
    </div>}
    {dialog && <AdminDialog title={dialog.kind === "publish" ? "공개 상태 변경" : editing ? "시그니처 수정" : "시그니처 등록"} busy={busy} onClose={closeDialog}
      headerMeta={editing && dialog.entry && <Link className={ui.headerLink} to={`/admin/signatures/${dialog.entry.signature_id}/preview`} target="_blank" rel="noreferrer"
        aria-label="참가자 화면 미리보기" title="저장한 내용으로 열립니다"><Glyph name="external" size={13} strokeWidth={2.2} /><span>참가자 화면</span></Link>}>
      <form onSubmit={save} className={ui.formStack}>
        {dialog.kind === "publish" ? <div>
          <p className={ui.dialogLead}><strong>{dialog.entry.club_name}</strong> · {dialog.entry.title}</p>
          <p className={ui.callout}>{dialog.entry.is_published ? "비공개로 바꾸면 참가자가 문제를 조회하거나 제출할 수 없습니다 기존 해결 기록은 유지됩니다" : "공개하면 참가자가 문제를 조회하고 제출할 수 있습니다"}</p>
        </div> : <fieldset disabled={busy} className={ui.formStack}>
          {editing
            ? <p className={ui.dialogLead}>동아리 <strong>{dialog.entry.club_name}</strong></p>
            : <label className={ui.field}>
              <span className={ui.fieldLabel}>동아리</span>
              <select required className={ui.select} value={form.clubId} onChange={(event) => setForm({ ...form, clubId: event.target.value })}>
                <option value="">선택</option>{availableClubs.map((club) => <option key={club.club_id} value={club.club_id}>{club.name}</option>)}
              </select>
            </label>}
          <label className={ui.field}>
            <span className={ui.fieldLabel}>제목</span>
            <input required maxLength={200} className={ui.input} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          {draft && <p className={ui.fieldHint}>내용을 나눠 저장할 수 있습니다 지문과 플래그를 등록하면 공개할 수 있습니다</p>}
          <label className={ui.field}>
            <span className={ui.fieldLabel}>설명</span>
            <textarea required={!draft} rows={4} className={ui.textarea} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>
              {editing ? dialog.entry.missing_fields?.includes("flag") ? <>플래그 <small>미등록</small></> : <>새 플래그 <small>비우면 기존 값 유지</small></> : "플래그"}
            </span>
            <input type="password" autoComplete="new-password" required={!editing} maxLength={512} className={ui.input} value={form.flag} onChange={(event) => setForm({ ...form, flag: event.target.value })} />
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>점수</span>
            <input type="number" required min="0.01" max="9999999999.99" step="0.01" className={ui.input} value={form.score} onChange={(event) => { setScoreConfirmed(false); setForm({ ...form, score: event.target.value }); }} />
          </label>
          {scoreChanged && <label className={ui.check}><input type="checkbox" checked={scoreConfirmed} onChange={(event) => setScoreConfirmed(event.target.checked)} />이미 해결한 팀의 점수도 {form.score}점으로 바뀌는 것을 확인했습니다</label>}
        </fieldset>}
        {error && <p role="alert" className={ui.callout} data-tone="bad">{error}</p>}
        <div className={ui.formActions}>
          <button type="button" className={ui.button} onClick={closeDialog} disabled={busy}>취소</button>
          <button className={ui.primary} type="submit" disabled={busy || (dialog.kind !== "publish" && (Boolean(validateSignature(form, editing, draft)) || (scoreChanged && !scoreConfirmed)))}>
            {busy ? "처리 중" : dialog.kind === "publish" ? "변경 확인" : editing ? "수정 저장" : "비공개로 등록"}
          </button>
        </div>
      </form>
    </AdminDialog>}
  </AdminLayout>;
}
