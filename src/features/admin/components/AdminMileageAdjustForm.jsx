import { useId, useRef, useState } from "react";
import { createAdminIdempotencyKey } from "../../../api/admin.js";
import { amountDigits, formatAdminNumber, formatAmountDigits } from "../utils/adminNumber.js";
import { mileageAttempt, signedMileageAmount, validateMileageAdjustment } from "../utils/adminMileage.js";
import { MILEAGE_STEPS, REASON_PRESETS } from "../utils/adminReasons.js";
import AdminTeamPicker from "./AdminTeamPicker.jsx";
import { AdminChoiceChips, AdminReasonField, AdminSegmented } from "./AdminFormParts.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminMileageAdjustForm.module.css";

const MODES = [{ key: "grant", label: "지급" }, { key: "deduct", label: "회수" }];
const STEP_CHIPS = MILEAGE_STEPS.map((value) => ({ key: String(value), label: formatAdminNumber(value) }));
const FALLBACK = "처리 결과를 확인하지 못했습니다 같은 내용으로 다시 요청하면 중복 지급 없이 결과를 확인합니다";

function failureMessage(failure) {
  return failure?.response?.data?.message || (failure instanceof Error && !failure.isAxiosError && failure.message ? failure.message : FALLBACK);
}

// 마일리지 지급 · 회수 폼: 대시보드, 마일리지 화면, 팀 상세가 같은 폼을 쓴다
// 위에서부터 팀, 지급/회수와 금액, 사유, 맨 아래 요약 한 줄과 실행 단추 순서로 한 줄씩 내려간다
// 금액은 양수만 적고 지급/회수 단추로 방향을 고른다 고른 팀의 잔액이 바뀌는 모습을 미리 보인다
// submit은 { teamId, amount, reason, idempotencyKey }를 받아 성공하면 true를 돌려준다 실패는 던지거나 false를 돌려준다
export default function AdminMileageAdjustForm({ teams = [], teamsLoading = false, teamsCapped = false, team: fixedTeam, submit, disabled = false, actions }) {
  const id = useId();
  const [teamId, setTeamId] = useState(fixedTeam?.team_id ?? "");
  const [mode, setMode] = useState("grant");
  const [digits, setDigits] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const attempt = useRef(null);
  const pending = useRef(false);
  const team = fixedTeam ?? teams.find((item) => item.team_id === teamId);
  const amount = signedMileageAmount(mode, digits);
  const current = Number.isFinite(Number(team?.mileage)) && team?.mileage !== null && team?.mileage !== undefined ? Number(team.mileage) : null;
  const next = current === null || !digits ? null : current + Number(amount);
  const short = next !== null && next < 0;
  const invalid = validateMileageAdjustment({ teamId: team?.team_id ?? "", amount, reason });
  const locked = disabled || busy;
  const verb = mode === "deduct" ? "회수" : "지급";

  function clearFeedback() { setError(""); setDone(""); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending.current || locked) return;
    if (invalid || short) { setError(short ? "잔액보다 많이 회수할 수 없습니다" : invalid); return; }
    pending.current = true;
    setBusy(true);
    clearFeedback();
    attempt.current = mileageAttempt(attempt.current, { teamId: team.team_id, amount, reason }, () => createAdminIdempotencyKey("admin-mileage"));
    try {
      const ok = await submit({ teamId: team.team_id, amount: Number(amount), reason: reason.trim(), idempotencyKey: attempt.current.key, team });
      if (ok === false) return;
      attempt.current = null;
      setDone(`${team.team_name} ${formatAmountDigits(digits)} MI ${verb} 완료`);
      setDigits("");
      setReason("");
    } catch (failure) {
      setError(failureMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const summary = error || done || (team && digits
    ? `${team.team_name} 팀${mode === "deduct" ? "에서" : "에"} ${formatAmountDigits(digits)} MI ${verb}`
    : "");

  return <form onSubmit={handleSubmit} className={styles.form}>
    {!fixedTeam && <div className={ui.field}>
      <span className={ui.fieldLabel}>팀</span>
      <AdminTeamPicker teams={teams} value={teamId} onChange={(nextId) => { setTeamId(nextId); clearFeedback(); }} label={`${verb}할 팀`}
        disabled={locked} loading={teamsLoading} capped={teamsCapped} />
    </div>}

    <div className={ui.field}>
      <div className={styles.amountHead}>
        <label htmlFor={`${id}-amount`} className={ui.fieldLabel}>금액</label>
        <AdminSegmented items={MODES} value={mode} onChange={(nextMode) => { setMode(nextMode); clearFeedback(); }} label="지급 또는 회수" disabled={locked} />
      </div>
      <span className={styles.amountBox} data-mode={mode} data-disabled={locked || undefined}>
        <span className={styles.sign} aria-hidden="true">{mode === "deduct" ? "−" : "+"}</span>
        <input id={`${id}-amount`} inputMode="numeric" autoComplete="off" disabled={locked} placeholder="0"
          value={formatAmountDigits(digits)} onChange={(event) => { setDigits(amountDigits(event.target.value)); clearFeedback(); }}
          aria-describedby={`${id}-balance`} />
        <span className={styles.unit}>MI</span>
      </span>
      <AdminChoiceChips items={STEP_CHIPS} value={digits} onPick={(value) => { setDigits(value); clearFeedback(); }} label="금액 빠른 선택" disabled={locked} />
      <p id={`${id}-balance`} className={styles.balance} data-short={short || undefined}>
        {!team ? "팀을 고르면 지금 잔액이 보입니다"
          : current === null ? "잔액 정보가 없습니다"
            : <>잔액 <strong>{formatAdminNumber(current)}</strong>{next !== null && <> → <strong>{formatAdminNumber(next)}</strong></>} MI{short && " · 잔액보다 많이 회수할 수 없습니다"}</>}
      </p>
    </div>

    <AdminReasonField label="사유" note="참가자에게 보입니다" value={reason} onChange={(value) => { setReason(value); clearFeedback(); }}
      presets={mode === "deduct" ? REASON_PRESETS.mileageDeduct : REASON_PRESETS.mileageGrant} disabled={locked} required />

    <div className={styles.footer}>
      <p className={styles.summary} role={error ? "alert" : "status"} data-tone={error ? "bad" : done ? "good" : undefined}>{summary}</p>
      {actions}
      <button type="submit" disabled={locked || Boolean(invalid) || short} className={mode === "deduct" ? ui.dangerSolid : ui.primary}>{verb}하기</button>
    </div>
  </form>;
}
