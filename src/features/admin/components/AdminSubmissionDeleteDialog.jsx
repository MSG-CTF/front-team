import { useEffect, useRef, useState } from "react";
import { deleteAdminChallengeSubmission } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatSolveTime } from "../utils/adminChallengeSolves.js";
import { submissionDeleteError, validateSubmissionReason } from "../utils/adminSubmissionDelete.js";
import { notifyAdminResourceChanged } from "../utils/adminResourceEvents.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminReasonField } from "./AdminFormParts.jsx";
import styles from "./AdminWorkspace.module.css";
import local from "./AdminSubmissionDeleteDialog.module.css";

export default function AdminSubmissionDeleteDialog({ challengeId, challengeTitle, row, onClose, onDeleted, onBusyChange }) {
  const [reason, setReason] = useState("");
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const validation = validateSubmissionReason(reason);
  async function confirm(event) {
    event.preventDefault();
    if (locked.current || validation) return;
    if (row.result === "CORRECT" && !warning) { setWarning(true); return; }
    locked.current = true;
    setBusy(true); setError(""); onBusyChange?.(true);
    try {
      const response = await deleteAdminChallengeSubmission(challengeId, row.submission_id, reason);
      if (!isSuccess(response.data)) throw new Error(response.data?.message);
      // 삭제 성공은 뒤따르는 조회 성공 여부와 분리한다.
      notifyAdminResourceChanged();
      if (active.current) onDeleted(response.data.data);
    } catch (failure) {
      if (active.current) setError(submissionDeleteError(failure));
    } finally {
      locked.current = false;
      if (active.current) { setBusy(false); onBusyChange?.(false); }
    }
  }
  return <AdminDialog title={warning ? "정답 회수 확인" : "제출 기록 삭제"} onClose={onClose} busy={busy}>
    <form onSubmit={confirm}>
      <dl className={local.details}>
        <dt>문제</dt><dd>{challengeTitle || challengeId}</dd>
        <dt>팀</dt><dd>{row.team_name ?? "-"}</dd>
        <dt>제출자</dt><dd>{row.user?.nickname ?? "기록 없음"}</dd>
        <dt>결과</dt><dd>{row.result}</dd>
        <dt>제출 시각</dt><dd>{formatSolveTime(row.created_at)}</dd>
      </dl>
      <AdminReasonField label="삭제 사유" value={reason} onChange={setReason} multiline required disabled={busy || warning}
        maxLength={10000} hint={`${Array.from(reason.trim()).length}/500자 · ${validation || "사유가 기록됩니다"}`} />
      {warning && <p className={styles.callout} role="alert">정답 기록을 지우면 이 팀의 문제 점수와 받은 마일리지를 회수합니다<br />라인 독점 보너스가 취소되고 동적 점수 때문에 다른 팀 점수도 바뀔 수 있습니다</p>}
      {error && <p className={styles.errorText} role="alert">{error}</p>}
      <div className={styles.formActions}>
        <button type="button" className={styles.button} disabled={busy} onClick={onClose}>취소</button>
        {warning && <button type="button" className={styles.button} disabled={busy} onClick={() => setWarning(false)}>사유 수정</button>}
        <button type="submit" className={styles.dangerSolid} disabled={busy || Boolean(validation)}>
          {busy ? "처리 중…" : warning ? "정답 회수 확정" : row.result === "CORRECT" ? "회수 내용 확인" : "삭제 확정"}
        </button>
      </div>
      {error && <button type="button" className={styles.button} disabled={busy} onClick={() => { notifyAdminResourceChanged(); onClose(); }}>목록 다시 조회</button>}
    </form>
  </AdminDialog>;
}
