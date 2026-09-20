import { useRef, useState } from "react";
import { checkoutPayment, getPaymentHistory, refundPayment } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { canRefund, paymentErrorMessage, validateCheckout } from "../utils/adminMileage.js";
import AdminDialog from "./AdminDialog.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { AdminStatusMessage } from "./AdminLayout.jsx";

const INPUT = "rounded border border-admin-divider bg-white/60 px-3 py-2";
const BUTTON = "rounded border border-admin-divider px-3 py-2 text-sm disabled:opacity-50";
const EMPTY = { paymentToken: "", amount: "", itemName: "" };

export default function AdminPaymentsPanel({ teams, onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [teamId, setTeamId] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const history = useAdminResource(
    (config) => getPaymentHistory({ teamId: teamId || undefined, page, size: 50 }, config),
    [teamId, page], "결제 내역을 불러오지 못했습니다",
  );

  async function runPayment() {
    if (pending.current || !confirmation) return;
    if (confirmation.kind === "checkout" && validateCheckout(confirmation.form)) return;
    if (confirmation.kind === "refund" && !canRefund(confirmation.entry)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = confirmation.kind === "checkout"
        ? await checkoutPayment({
          paymentToken: confirmation.form.paymentToken.trim(),
          amount: Number(confirmation.form.amount), itemName: confirmation.form.itemName.trim(),
        })
        : await refundPayment(confirmation.entry.history_id);
      if (!isSuccess(response.data)) {
        throw Object.assign(new Error("결제가 처리되지 않았습니다"), { response });
      }
      const result = response.data.data;
      const action = confirmation.kind === "checkout" ? "결제" : "환불";
      setConfirmation(null);
      if (action === "결제") setForm(EMPTY);
      setNotice(`${result?.team_name || "선택한 팀"} ${action} 완료 / 잔액 ${result?.current_mileage ?? "미제공"} MI`);
      const refreshed = await history.reload();
      onChanged();
      if (!refreshed) setError(`${action}는 처리됐지만 내역을 불러오지 못했습니다 새로고침해서 확인하세요`);
    } catch (requestError) {
      setError(paymentErrorMessage(requestError));
      // 이미 처리된 토큰이나 환불은 서버 상태를 다시 읽는다
      if (["PAYMENT_TOKEN_INVALID", "ALREADY_REFUNDED", "NOT_REFUNDABLE"].includes(requestError?.response?.data?.code)) {
        setConfirmation(null);
        await history.reload();
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function prepareCheckout(event) {
    event.preventDefault();
    if (pending.current) return;
    const validation = validateCheckout(form);
    setError(validation);
    setNotice("");
    if (!validation) setConfirmation({ kind: "checkout", form: { ...form } });
  }

  return <section aria-label="결제와 환불" className="font-song-myung text-sm">
    <h2 className="mb-2 text-lg">QR 결제</h2>
    <p className="mb-4 text-admin-muted">참가자의 QR을 읽은 토큰을 입력하세요 카메라 스캔은 아직 지원하지 않습니다</p>
    <form onSubmit={prepareCheckout} className="mb-6">
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">QR 결제 토큰
          <input className={INPUT} autoComplete="off" spellCheck={false} required value={form.paymentToken}
            onChange={(event) => setForm({ ...form, paymentToken: event.target.value })} placeholder="pt_..." />
        </label>
        <label className="flex flex-col gap-1">품목
          <input className={INPUT} required maxLength={100} value={form.itemName}
            onChange={(event) => setForm({ ...form, itemName: event.target.value })} />
        </label>
        <label className="flex flex-col gap-1">결제 금액 (MI)
          <input className={`${INPUT} w-36`} type="number" min={1} max={2147483647} step={1} required value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
        <button type="submit" className={BUTTON} disabled={Boolean(validateCheckout(form))}>결제 확인</button>
      </fieldset>
    </form>
    {notice && <p role="status" className="mb-3 text-admin-running">{notice}</p>}
    {error && <p role="alert" className="mb-3 text-admin-failed">{error}</p>}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg">결제 / 환불 내역</h2>
      <label>팀 필터 <select className={INPUT} value={teamId} disabled={busy}
        onChange={(event) => { setTeamId(event.target.value); setPage(1); }}>
        <option value="">전체</option>{teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
      </select></label>
      <button type="button" className={BUTTON} onClick={history.retry} disabled={busy || history.status === "loading"}>결제 내역 새로고침</button>
    </div>
    <AdminStatusMessage status={history.status} error={history.error} onRetry={history.retry} />
    {history.status === "success" && <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left"><thead><tr>
        {["팀", "유형", "변동", "품목 / 사유", "처리자", "시각 (KST)", "조치"].map((label) => <th className="px-2 py-2 font-normal text-admin-muted" key={label}>{label}</th>)}
      </tr></thead><tbody>
        {(history.data?.history ?? []).map((entry) => <tr key={entry.history_id} className="border-t border-admin-divider/40">
          <td className="px-2 py-3">{entry.team_name}</td>
          <td className="px-2 py-3">{entry.type === "REFUND" ? "환불" : "결제"}</td>
          <td className="px-2 py-3 font-kode-mono">{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</td>
          <td className="max-w-xs break-words px-2 py-3">{entry.reason || "미제공"}</td>
          <td className="px-2 py-3">{entry.processed_by || "미제공"}</td>
          <td className="px-2 py-3">{toKst(entry.created_at)}</td>
          <td className="px-2 py-3">{canRefund(entry)
            ? <button type="button" className={BUTTON} disabled={busy} aria-label={`${entry.team_name} ${entry.reason} 환불`}
              onClick={() => { setError(""); setNotice(""); setConfirmation({ kind: "refund", entry }); }}>환불</button>
            : entry.is_refunded ? "환불 완료" : ""}</td>
        </tr>)}
        {history.data?.history?.length === 0 && <tr><td className="py-6 text-center text-admin-muted" colSpan={7}>결제 내역 없음</td></tr>}
      </tbody></table>
    </div>}
    <AdminPagination page={page} totalCount={history.data?.total_count} onChange={setPage} disabled={busy || history.status !== "success"} />
    {confirmation && <AdminDialog title={confirmation.kind === "checkout" ? "결제 확인" : "환불 확인"} busy={busy} onClose={() => setConfirmation(null)}>
      {confirmation.kind === "checkout"
        ? <p className="mb-4">{confirmation.form.itemName} / {Number(confirmation.form.amount)} MI를 차감합니다</p>
        : <p className="mb-4">{confirmation.entry.team_name}의 {confirmation.entry.reason} 결제 {-confirmation.entry.amount} MI를 환불합니다</p>}
      {error && <p role="alert" className="mb-3 text-admin-failed">{error}</p>}
      <button type="button" disabled={busy} className={BUTTON} onClick={runPayment}>
        {busy ? "처리 중" : confirmation.kind === "checkout" ? "결제 실행" : "환불 실행"}
      </button>
    </AdminDialog>}
  </section>;
}
