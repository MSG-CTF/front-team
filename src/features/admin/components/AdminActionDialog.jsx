import { useRef, useState } from "react";
import { isSuccess } from "../../../utils/response.js";
import { notifyAdminResourceChanged } from "../utils/adminResourceEvents.js";
import AdminDialog from "./AdminDialog.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminActionDialog({ title, children, confirmLabel, action, onDone, onClose, onBusyChange, onFailure, danger = false }) {
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (locked.current || !checked) return;
    locked.current = true; setBusy(true); setError(""); onBusyChange?.(true);
    let data;
    try {
      const response = await action();
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "요청을 처리하지 못했습니다");
      data = response.data.data ?? {};
    } catch (failure) {
      const unknown = !failure.response || failure.response.status >= 500;
      setUncertain(unknown);
      setError(unknown ? "처리 결과를 확인하지 못했습니다 이 창을 닫고 최신 목록을 확인해주세요 같은 작업을 바로 반복하지 마세요" : failure.response?.data?.message || "요청을 처리하지 못했습니다");
      locked.current = unknown;
      onFailure?.();
    } finally { setBusy(false); onBusyChange?.(false); }
    if (data) { await onDone(data); notifyAdminResourceChanged(); }
  }
  return <AdminDialog title={title} busy={busy} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={submit} className={styles.formStack}>
      {children}
      <label className={styles.check}><input type="checkbox" checked={checked} disabled={busy} onChange={e => setChecked(e.target.checked)} />대상과 변경 내용을 확인했습니다</label>
      {error && <p role="alert" className={styles.errorText}>{error}</p>}
      <div className={styles.formActions}>
        <button type="button" className={styles.button} disabled={busy} onClick={onClose}>취소</button>
        <button type="submit" className={danger ? styles.dangerSolid : styles.primary} disabled={busy || !checked || uncertain}>{busy ? "처리 중" : confirmLabel}</button>
      </div>
    </form>
  </AdminDialog>;
}
