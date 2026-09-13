import { useRef, useState } from "react";
import { registerAdminAccount } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { validateAdminAccount } from "../utils/adminValidation.js";

const INITIAL = { loginId: "", password: "", nickname: "", role: "PARTICIPANT", isLeader: false, teamMode: "NONE", teamId: "" };
const INPUT_CLASS = "rounded border border-admin-divider bg-white/60 px-3 py-2";

export default function AdminAccountsPage() {
  const [form, setForm] = useState(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const pending = useRef(false);
  const teams = useAdminTeamOptions([result]);
  const validationError = validateAdminAccount(form);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (validationError) { setError(validationError); return; }
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await registerAdminAccount({
        loginId: form.loginId.trim(), password: form.password, nickname: form.nickname.trim(),
        role: form.role, isLeader: form.isLeader,
        teamId: form.teamMode === "EXISTING" ? form.teamId : undefined,
      });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "계정 등록에 실패했습니다");
      setResult(response.data.data);
      setForm(INITIAL);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "계정 등록에 실패했습니다");
    } finally { pending.current = false; setIsSubmitting(false); }
  };

  return <AdminLayout title="계정 등록">
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4 font-song-myung text-sm">
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">아이디
          <input required maxLength={100} value={form.loginId} onChange={(event) => update("loginId", event.target.value)} autoComplete="off" className={INPUT_CLASS}/>
        </label>
        <label className="flex flex-col gap-1">비밀번호 (8~128자)
          <input required type="password" minLength={8} maxLength={256} value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" className={INPUT_CLASS}/>
        </label>
        <label className="flex flex-col gap-1">닉네임
          <input required maxLength={100} value={form.nickname} onChange={(event) => update("nickname", event.target.value)} className={INPUT_CLASS}/>
        </label>
        <label className="flex flex-col gap-1">권한
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value, isLeader: event.target.value === "ADMIN" ? false : current.isLeader }))} className={INPUT_CLASS}>
            <option value="PARTICIPANT">PARTICIPANT</option><option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={form.role === "ADMIN"} checked={form.isLeader} onChange={(event) => update("isLeader", event.target.checked)}/>팀장으로 등록
        </label>
        <fieldset className="flex flex-col gap-2 rounded border border-admin-divider p-3">
          <legend>소속 팀</legend>
          <label><input type="radio" name="team-mode" checked={form.teamMode === "NONE"} onChange={() => update("teamMode", "NONE")}/> 무소속으로 등록</label>
          <label><input type="radio" name="team-mode" checked={form.teamMode === "EXISTING"} onChange={() => update("teamMode", "EXISTING")}/> 기존 팀에 합류</label>
          {form.teamMode === "EXISTING" && <>
            <AdminStatusMessage status={teams.status} error={teams.error} onRetry={teams.retry}/>
            <select aria-label="소속 팀 선택" required value={form.teamId} onChange={(event) => update("teamId", event.target.value)} disabled={teams.status !== "success"} className={INPUT_CLASS}>
              <option value="">선택</option>
              {(teams.data?.teams ?? []).map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
            </select>
          </>}
        </fieldset>
      </fieldset>
      {form.loginId && form.password && form.nickname && validationError && <p className="text-admin-muted">{validationError}</p>}
      {error && <p role="alert" className="text-admin-failed">{error}</p>}
      {result && <p role="status" className="text-admin-running">등록 완료: {result.login_id} ({result.nickname}) {result.team_name || "무소속"}</p>}
      <button type="submit" disabled={isSubmitting || Boolean(validationError)} className="self-start rounded border border-admin-ink px-4 py-1.5 disabled:opacity-50">{isSubmitting ? "등록 중" : "등록"}</button>
    </form>
  </AdminLayout>;
}
