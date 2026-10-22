import { useId, useState } from "react";
import AdminDialog from "./AdminDialog.jsx";
import { REASON_PRESETS } from "../utils/adminReasons.js";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminPicker.module.css";

// 사유 입력: 자주 쓰는 사유를 칩으로 한 번에 넣고, 필요하면 이어서 고쳐 쓴다
export function AdminReasonField({
  label = "사유", note, value, onChange, presets = [], multiline = false, rows = 2, maxLength = 500,
  disabled = false, required = false, placeholder = "직접 입력", hint, autoFocus = false,
}) {
  const id = useId();
  const trimmed = value.trim();
  const shared = {
    id, value, maxLength, disabled, required, placeholder, autoFocus,
    onChange: (event) => onChange(event.target.value),
  };
  return <div className={ui.field}>
    <label htmlFor={id} className={ui.fieldLabel}>{label}{note && <small>{note}</small>}</label>
    {presets.length > 0 && <div className={styles.chips} role="group" aria-label={`${label} 빠른 선택`}>
      {presets.map((preset) => <button key={preset} type="button" className={styles.chip} aria-pressed={trimmed === preset}
        disabled={disabled} onClick={() => onChange(preset)}>{preset}</button>)}
    </div>}
    {multiline ? <textarea {...shared} rows={rows} className={ui.textarea} /> : <input {...shared} className={ui.input} />}
    {hint && <span className={ui.fieldHint}>{hint}</span>}
  </div>;
}

// 수량 빠른 선택: 자주 주는 양을 한 번에 넣는다
export function AdminAmountChips({ values, current, onPick, disabled = false, unit = "", label = "빠른 입력" }) {
  return <div className={styles.chips} role="group" aria-label={label}>
    {values.map((amount) => <button key={amount} type="button" className={styles.chip} data-tone={amount < 0 ? "minus" : "plus"}
      aria-pressed={String(current) === String(amount)} disabled={disabled} onClick={() => onPick(String(amount))}>
      {amount > 0 ? `+${amount}` : amount}{unit}
    </button>)}
  </div>;
}

// 하나만 고르는 칩: 조회 범위처럼 자주 쓰는 선택지를 한 번에 누른다
export function AdminChoiceChips({ items, value, onPick, disabled = false, label }) {
  return <div className={styles.chips} role="group" aria-label={label}>
    {items.map((item) => <button key={item.key} type="button" className={styles.chip} aria-pressed={value === item.key}
      disabled={disabled} onClick={() => onPick(item.key)}>{item.label}</button>)}
  </div>;
}

// 분할 단추: 지급과 회수처럼 둘 중 하나를 고른다
export function AdminSegmented({ items, value, onChange, label, disabled = false, tone }) {
  return <div className={styles.segmented} role="radiogroup" aria-label={label} data-tone={tone}>
    {items.map((item) => <button key={item.key} type="button" role="radio" aria-checked={value === item.key} disabled={disabled || item.disabled}
      title={item.title} data-key={item.key} onClick={() => onChange(item.key)}>{item.label}</button>)}
  </div>;
}

// iOS 토글: 공개 상태처럼 켜고 끄는 값
export function AdminSwitch({ checked, onChange, label, disabled = false }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled}
    className={styles.switch} onClick={() => onChange(!checked)}>
    <span className={styles.knob} />
  </button>;
}

// 밴 처리 시트: 사유 칩을 누르고 바로 확인한다
export function AdminBanDialog({ team, busy = false, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return <AdminDialog title="팀 밴 처리" onClose={onClose} busy={busy}>
    <form className={ui.formStack} onSubmit={(event) => {
      event.preventDefault();
      if (reason.trim()) onConfirm(reason.trim());
    }}>
      <p className={ui.dialogLead}><strong>{team.team_name}</strong> 팀을 밴합니다 순위표에서 빠지고 사유는 운영 기록에 남습니다</p>
      <AdminReasonField label="밴 사유" note="1~500자" value={reason} onChange={setReason} presets={REASON_PRESETS.ban}
        disabled={busy} required autoFocus />
      <div className={ui.formActions}>
        <button type="button" className={ui.button} onClick={onClose} disabled={busy}>취소</button>
        <button type="submit" className={ui.dangerSolid} disabled={busy || !reason.trim()}>밴 처리</button>
      </div>
    </form>
  </AdminDialog>;
}
