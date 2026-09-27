import { useRef, useState } from "react";
import { createAdminSignature, getAdminSignatures, publishAdminSignature, updateAdminSignature } from "../../../api/admin.js";
import { getKothClubs } from "../../../api/koth.js";
import { isSuccess } from "../../../utils/response.js";
import AdminDialog from "../components/AdminDialog.jsx";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { signaturePayload, validateSignature } from "../utils/adminSignature.js";

const BUTTON = "rounded border border-admin-divider px-3 py-2 text-sm disabled:opacity-50";
const INPUT = "mt-1 block w-full rounded border border-admin-divider bg-white/60 p-2";
const EMPTY_FORM = { clubId: "", title: "", description: "", flag: "", score: "300" };

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
  const scoreChanged = editing && Number(form.score) !== Number(dialog.entry.score);
  const availableClubs = (clubs.data?.clubs ?? []).filter((club) =>
    !(signatures.data?.signatures ?? []).some((entry) => entry.club_id === club.club_id));

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
      const validation = validateSignature(form, editing);
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

  return <AdminLayout title="시그니처 문제" actions={<div className="flex gap-2">
    <button type="button" className={BUTTON} onClick={signatures.retry} disabled={busy || signatures.status === "loading"}>새로고침</button>
    <button type="button" className={BUTTON} onClick={() => openEditor()} disabled={busy || signatures.status !== "success" || clubs.status !== "success" || availableClubs.length === 0}>시그니처 등록</button>
  </div>}>
    <p className="mb-4 font-song-myung text-sm text-admin-muted">동아리마다 한 문제씩 등록하며 공개 전까지 참가자에게 보이지 않습니다</p>
    <AdminStatusMessage status={signatures.status} error={signatures.error} onRetry={signatures.retry} />
    <AdminStatusMessage status={clubs.status} error={clubs.error} onRetry={clubs.retry} />
    {notice && <p role="status" className="mb-4 font-song-myung">{notice}</p>}
    {signatures.status === "success" && <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-song-myung text-sm">
        <thead><tr>{["동아리", "제목", "점수", "해결 팀", "공개 상태", "관리"].map((label) => <th key={label} className="p-3 font-normal text-admin-muted">{label}</th>)}</tr></thead>
        <tbody>{(signatures.data?.signatures ?? []).map((entry) => <tr key={entry.signature_id} className="border-t border-admin-divider/40">
          <td className="p-3">{entry.club_name}</td><td className="max-w-xs break-words p-3">{entry.title}</td>
          <td className="p-3">{entry.score}</td><td className="p-3">{entry.solved_team_count}</td>
          <td className="p-3">{entry.is_published ? "공개" : "비공개"}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON} disabled={busy} aria-label={`${entry.club_name} 문제 수정`} onClick={() => openEditor(entry)}>수정</button>
            <button type="button" className={BUTTON} disabled={busy} aria-label={`${entry.club_name} ${entry.is_published ? "비공개" : "공개"} 전환`}
              onClick={() => { setError(""); setNotice(""); setDialog({ kind: "publish", entry }); }}>공개 상태 변경</button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {signatures.data?.signatures?.length === 0 && <p className="py-6 text-center font-song-myung">등록된 시그니처 문제가 없습니다</p>}
    </div>}
    {dialog && <AdminDialog title={dialog.kind === "publish" ? "공개 상태 변경" : editing ? "시그니처 수정" : "시그니처 등록"} busy={busy} onClose={closeDialog}>
      <form onSubmit={save} className="font-song-myung text-sm">
        {dialog.kind === "publish" ? <div className="mb-4">
          <p>{dialog.entry.club_name} / {dialog.entry.title}</p>
          <p className="mt-2">{dialog.entry.is_published ? "비공개로 바꾸면 참가자가 문제를 조회하거나 제출할 수 없습니다 기존 해결 기록은 유지됩니다" : "공개하면 참가자가 문제를 조회하고 제출할 수 있습니다"}</p>
        </div> : <fieldset disabled={busy} className="mb-4 flex flex-col gap-3">
          {editing ? <p>동아리: {dialog.entry.club_name}</p> : <label>동아리<select required className={INPUT} value={form.clubId} onChange={(event) => setForm({ ...form, clubId: event.target.value })}>
            <option value="">선택</option>{availableClubs.map((club) => <option key={club.club_id} value={club.club_id}>{club.name}</option>)}
          </select></label>}
          <label>제목<input required maxLength={200} className={INPUT} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>설명<textarea required rows={4} className={INPUT} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>{editing ? "새 플래그 (비우면 기존 값 유지)" : "플래그"}<input type="password" autoComplete="new-password" required={!editing} maxLength={512} className={INPUT} value={form.flag} onChange={(event) => setForm({ ...form, flag: event.target.value })} /></label>
          <label>점수<input type="number" required min="0.01" max="9999999999.99" step="0.01" className={INPUT} value={form.score} onChange={(event) => { setScoreConfirmed(false); setForm({ ...form, score: event.target.value }); }} /></label>
          {scoreChanged && <label className="flex items-start gap-2"><input type="checkbox" checked={scoreConfirmed} onChange={(event) => setScoreConfirmed(event.target.checked)} className="mt-1" />이미 해결한 팀의 점수도 {form.score}점으로 바뀌는 것을 확인했습니다</label>}
        </fieldset>}
        {error && <p role="alert" className="mb-3 text-admin-failed">{error}</p>}
        <button className={BUTTON} type="submit" disabled={busy || (dialog.kind !== "publish" && (Boolean(validateSignature(form, editing)) || (scoreChanged && !scoreConfirmed)))}>
          {busy ? "처리 중" : dialog.kind === "publish" ? "변경 확인" : editing ? "수정 저장" : "비공개로 등록"}
        </button>
      </form>
    </AdminDialog>}
  </AdminLayout>;
}
