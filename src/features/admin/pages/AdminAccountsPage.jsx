import { useRef, useState } from "react";
import { registerAdminAccount } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import AdminTeamPicker from "../components/AdminTeamPicker.jsx";
import { Glyph } from "../components/AdminGlyph.jsx";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { generateStrongPassword, passwordStrength } from "../utils/adminPassword.js";
import { validateAdminAccount } from "../utils/adminValidation.js";
import ui from "../components/AdminWorkspace.module.css";
import styles from "./AdminAccountsPage.module.css";

const INITIAL = { loginId: "", password: "", nickname: "", role: "PARTICIPANT", isLeader: false, teamMode: "NONE", teamId: "", teamName: "" };
const TEAM_MODES = [
  { id: "NONE", label: "무소속으로 등록" },
  { id: "EXISTING", label: "기존 팀에 합류" },
  { id: "NEW", label: "새 팀 만들어서 등록" },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AdminAccountsPage() {
  const [form, setForm] = useState(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState("");
  const pending = useRef(false);
  // 팀 목록은 기존 팀에 합류시킬 때만 받는다 새 팀이나 무소속으로 등록할 때는 팀 전체를 받지 않는다
  const teams = useAdminTeamOptions([result], { enabled: form.teamMode === "EXISTING" });
  const validationError = validateAdminAccount(form);
  const strength = passwordStrength(form.password);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  function suggestPassword() {
    update("password", generateStrongPassword());
    setGenerated(true);
    setShowPassword(true);
  }

  async function copy(kind, text) {
    setCopied((await copyText(text)) ? kind : "failed");
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (validationError) { setError(validationError); return; }
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    setResult(null);
    setCopied("");
    const teamName = (teams.data?.teams ?? []).find((team) => team.team_id === form.teamId)?.team_name;
    try {
      const response = await registerAdminAccount({
        loginId: form.loginId.trim(), password: form.password, nickname: form.nickname.trim(),
        role: form.role, isLeader: form.isLeader,
        teamId: form.teamMode === "EXISTING" ? form.teamId : undefined,
        teamName: form.teamMode === "NEW" ? form.teamName.trim() : undefined,
      });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "계정 등록에 실패했습니다");
      // 비밀번호는 서버가 돌려주지 않으니 방금 넣은 값을 이 화면에서만 한 번 보여준다
      setResult({ ...response.data.data, password: form.password, team_name: response.data.data?.team_name ?? teamName ?? form.teamName.trim() });
      setForm(INITIAL);
      setGenerated(false);
      setShowPassword(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "계정 등록에 실패했습니다");
    } finally { pending.current = false; setIsSubmitting(false); }
  };

  return <AdminLayout title="계정 등록">
    <div className={styles.layout}>
      <form onSubmit={handleSubmit} className={`${ui.card} ${styles.form}`}>
        <fieldset disabled={isSubmitting} className={`${ui.cardBody} ${ui.formStack}`}>
          <div className={`${ui.formGrid} ${ui.formGrid2}`}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>아이디</span>
              <input required maxLength={100} value={form.loginId} onChange={(event) => update("loginId", event.target.value)} autoComplete="off" spellCheck={false} className={ui.input}/>
            </label>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>닉네임</span>
              <input required maxLength={100} value={form.nickname} onChange={(event) => update("nickname", event.target.value)} className={ui.input}/>
            </label>
          </div>
          <div className={ui.field}>
            <label htmlFor="account-password" className={ui.fieldLabel}>비밀번호 <small>8~128자</small></label>
            <div className={styles.password}>
              <div className={styles.passwordBox}>
              <input id="account-password" required type={showPassword ? "text" : "password"} minLength={8} maxLength={256} value={form.password}
                onChange={(event) => { update("password", event.target.value); setGenerated(false); }}
                autoComplete="new-password" spellCheck={false} className={`${ui.input} ${styles.passwordInput}`} data-generated={generated || undefined}/>
              <button type="button" className={styles.reveal} onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "비밀번호 가리기" : "비밀번호 보기"} title={showPassword ? "가리기" : "보기"}>
                <Glyph name={showPassword ? "eyeOff" : "eye"} size={16} strokeWidth={2} />
              </button>
              </div>
              <button type="button" className={ui.button} onClick={suggestPassword}>강력한 비밀번호</button>
            </div>
            {form.password
              ? <span className={styles.strength} data-level={generated ? 3 : strength.level}>
                <span className={styles.meter} aria-hidden="true"><span /><span /><span /></span>
                {generated ? "추천 비밀번호 · 대문자, 숫자 포함 20자" : strength.label}
              </span>
              : <span className={ui.fieldHint}>버튼을 누르면 헷갈리는 글자를 뺀 20자 비밀번호를 만들어 넣습니다</span>}
          </div>
          <div className={`${ui.formGrid} ${ui.formGrid2}`}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>권한</span>
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value, isLeader: event.target.value === "ADMIN" ? false : current.isLeader }))} className={ui.select}>
                <option value="PARTICIPANT">참가자</option><option value="ADMIN">관리자</option>
              </select>
            </label>
            <label className={`${ui.check} ${styles.leader}`}>
              <input type="checkbox" disabled={form.role === "ADMIN"} checked={form.isLeader} onChange={(event) => update("isLeader", event.target.checked)}/>팀장으로 등록
            </label>
          </div>
          <fieldset className={ui.teamModes}>
            <legend className={ui.fieldLabel}>소속 팀</legend>
            {TEAM_MODES.map((mode) => <div key={mode.id} className={styles.mode}>
              <label className={ui.check}><input type="radio" name="team-mode" checked={form.teamMode === mode.id} onChange={() => update("teamMode", mode.id)}/> {mode.label}</label>
              {mode.id === "EXISTING" && form.teamMode === "EXISTING" && <div className={ui.teamModeDetail}>
                <AdminStatusMessage status={teams.status} error={teams.error} onRetry={teams.retry}/>
                <AdminTeamPicker teams={teams.data?.teams ?? []} value={form.teamId} onChange={(teamId) => update("teamId", teamId)}
                  label="합류할 팀" disabled={teams.status !== "success"} loading={teams.status === "loading"} capped={teams.data?.capped} />
              </div>}
              {mode.id === "NEW" && form.teamMode === "NEW" && <div className={ui.teamModeDetail}>
                <input aria-label="새 팀 이름" required maxLength={100} placeholder="새 팀 이름 (1~100자)" value={form.teamName} onChange={(event) => update("teamName", event.target.value)} className={ui.input}/>
              </div>}
            </div>)}
          </fieldset>
        </fieldset>
        <div className={ui.cardFooter}>
          <div className={ui.formFeedback}>
            {form.loginId && form.password && form.nickname && validationError && <p className={ui.fieldHint}>{validationError}</p>}
            {error && <p role="alert" className={ui.errorText}>{error}</p>}
          </div>
          <button type="submit" disabled={isSubmitting || Boolean(validationError)} className={ui.primary}>{isSubmitting ? "등록 중" : "계정 등록"}</button>
        </div>
      </form>

      {result && <section className={`${ui.card} ${styles.done}`} aria-labelledby="account-done">
        <header className={styles.doneHead}>
          <span className={styles.doneIcon} aria-hidden="true"><Glyph name="solve" size={18} strokeWidth={2.6} /></span>
          <div><h2 id="account-done">등록했습니다</h2><p>비밀번호는 이 화면을 떠나면 다시 볼 수 없습니다</p></div>
        </header>
        <dl className={styles.credentials}>
          <div><dt>아이디</dt><dd>{result.login_id}</dd></div>
          <div><dt>비밀번호</dt><dd>{result.password}</dd></div>
          <div><dt>닉네임</dt><dd className={styles.plain}>{result.nickname}</dd></div>
          <div><dt>소속 팀</dt><dd className={styles.plain}>{result.team_name || "무소속"}</dd></div>
        </dl>
        <div className={styles.doneActions}>
          <button type="button" className={ui.primary} onClick={() => copy("both", `아이디: ${result.login_id}\n비밀번호: ${result.password}`)}>
            아이디와 비밀번호 복사
          </button>
          <button type="button" className={ui.button} onClick={() => copy("password", result.password)}>비밀번호만 복사</button>
          <span role="status" className={copied === "failed" ? ui.errorText : ui.successText}>
            {copied === "both" ? "둘 다 복사했습니다" : copied === "password" ? "비밀번호를 복사했습니다" : copied === "failed" ? "복사하지 못했습니다 직접 선택해 복사하세요" : ""}
          </span>
        </div>
      </section>}
    </div>
  </AdminLayout>;
}
