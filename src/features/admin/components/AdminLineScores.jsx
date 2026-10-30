import { useState } from "react";
import { updateAdminLineScore } from "../../../api/admin.js";
import { displayLineScore, exactLineScore, lineScoreBody } from "../utils/adminLineScore.js";
import { AdminReasonField } from "./AdminFormParts.jsx";
import AdminActionDialog from "./AdminActionDialog.jsx";
import ui from "./AdminWorkspace.module.css";
import local from "./AdminApiActions.module.css";

export default function AdminLineScores({ teamId, lines, onSaved, disabled, onBusyChange }) {
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const parsed = lineScoreBody(score, reason);
  if (!Array.isArray(lines)) return <p className={ui.quietNote}>현재 서버에서 독점 라인 목록을 제공하지 않습니다 새로고침 후 다시 확인해주세요</p>;
  if (!lines.length) return <p className={ui.empty}>이 팀이 독점한 라인이 없습니다</p>;
  const line = lines.find(row => String(row.line_number) === selected);
  return <div className={local.stack}>
    {notice && <p role="status" className={ui.callout}>{notice}</p>}
    <div className={local.table}><table className={ui.table} aria-label="독점 라인 점수"><thead><tr><th>라인</th><th>현재 점수</th><th>분야 보너스</th></tr></thead>
      <tbody>{lines.map(row => <tr key={row.line_number}><td>{row.line_number}번</td><td>{displayLineScore(exactLineScore(row))}</td><td>{row.is_category_bonus ? "포함" : "없음"}</td></tr>)}</tbody></table></div>
    <form className={ui.formStack} onSubmit={event => { event.preventDefault(); if (line && !parsed.error) setConfirmation({ line, ...parsed.body }); else setError(parsed.error || "라인을 선택해주세요"); }}>
      <div className={local.fields}>
        <label className={local.field}>보정할 라인<select className={ui.select} value={selected} disabled={disabled || busy} required onChange={e => { const row = lines.find(item => String(item.line_number) === e.target.value); setSelected(e.target.value); setScore(row ? exactLineScore(row) : ""); setError(""); }}><option value="">선택해주세요</option>{lines.map(row => <option key={row.line_number} value={row.line_number}>{row.line_number}번 라인</option>)}</select></label>
        <label className={local.field}>변경 점수<input className={ui.input} inputMode="decimal" value={score} maxLength={21} required disabled={disabled || busy || !line} onChange={e => { setScore(e.target.value); setError(""); }} /></label>
      </div>
      <AdminReasonField label="보정 사유" value={reason} onChange={setReason} disabled={disabled || busy} required />
      {error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={local.actions}><button type="submit" className={ui.button} disabled={disabled || busy || !line || Boolean(parsed.error)}>점수 보정 확인</button></div>
    </form>
    {confirmation && <AdminActionDialog title="라인 점수 보정" confirmLabel="점수 변경" onClose={() => setConfirmation(null)} onBusyChange={value => { setBusy(value); onBusyChange?.(value); }}
      action={() => updateAdminLineScore(teamId, confirmation.line.line_number, confirmation.earned_score, confirmation.reason)}
      onDone={async () => { setConfirmation(null); setReason(""); setNotice("라인 점수를 변경했습니다"); if (!await onSaved()) setNotice("점수는 변경됐지만 최신 목록을 확인하지 못했습니다 다시 조회해주세요"); }}>
      <p className={`${ui.callout} ${local.long}`}>{confirmation.line.line_number}번 라인 점수를 {displayLineScore(exactLineScore(confirmation.line))}점에서 <strong>{displayLineScore(confirmation.earned_score)}점</strong>으로 변경합니다 팀 점수와 순위에도 반영됩니다</p>
      <p className={local.long}>사유: {confirmation.reason}</p>
    </AdminActionDialog>}
  </div>;
}
