import { useEffect, useRef, useState } from "react";
import {
  checkoutPayment,
  getPaymentHistory,
  refundPayment,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import useAdminResource from "../hooks/useAdminResource.js";
import {
  canRefund,
  paymentErrorMessage,
  validateCheckout,
} from "../utils/adminMileage.js";
import AdminDialog from "./AdminDialog.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import AdminQrScanner from "./AdminQrScannerLoader.jsx";
import PaymentIcon from "./PaymentIcon.jsx";
import styles from "./AdminPayments.module.css";

const EMPTY = { paymentToken: "", amount: "", itemName: "" };
const number = (value) =>
  Number.isFinite(Number(value)) && value !== null && value !== undefined
    ? Number(value).toLocaleString("ko-KR")
    : "미제공";

export default function AdminPaymentsPanel({
  teams,
  onChanged,
  active = true,
}) {
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [teamId, setTeamId] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [detail, setDetail] = useState(null);
  const tokenInput = useRef(null);
  const amountInput = useRef(null);
  const receiptAction = useRef(null);
  const focusScannedAmount = useRef(false);
  useEffect(() => {
    if (manualEntry) tokenInput.current?.focus();
  }, [manualEntry]);
  useEffect(() => {
    if (!scanning && focusScannedAmount.current) {
      focusScannedAmount.current = false;
      amountInput.current?.focus();
    }
  }, [scanning]);
  useEffect(() => {
    if (receipt && !busy) receiptAction.current?.focus();
  }, [receipt, busy]);
  useEffect(() => {
    if (!active) setScanning(false);
  }, [active]);
  const history = useAdminResource(
    (config) =>
      getPaymentHistory(
        { teamId: teamId || undefined, page, size: 50 },
        config,
      ),
    [teamId, page],
    "결제 내역을 불러오지 못했습니다",
  );

  async function runPayment() {
    if (pending.current || !confirmation) return;
    if (confirmation.kind === "checkout" && validateCheckout(confirmation.form))
      return;
    if (confirmation.kind === "refund" && !canRefund(confirmation.entry))
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response =
        confirmation.kind === "checkout"
          ? await checkoutPayment({
              paymentToken: confirmation.form.paymentToken.trim(),
              amount: Number(confirmation.form.amount),
              itemName: confirmation.form.itemName.trim(),
            })
          : await refundPayment(confirmation.entry.history_id);
      if (!isSuccess(response.data)) {
        throw Object.assign(new Error("결제가 처리되지 않았습니다"), {
          response,
        });
      }
      const result = response.data.data;
      const action = confirmation.kind === "checkout" ? "결제" : "환불";
      setReceipt({
        action,
        amount:
          confirmation.kind === "checkout"
            ? Number(confirmation.form.amount)
            : -confirmation.entry.amount,
        itemName:
          confirmation.kind === "checkout"
            ? confirmation.form.itemName.trim()
            : confirmation.entry.reason,
        teamName: result?.team_name || "선택한 팀",
        balance: result?.current_mileage,
      });
      setConfirmation(null);
      if (action === "결제") {
        setForm(EMPTY);
        setManualEntry(false);
      }
      setNotice(
        `${result?.team_name || "선택한 팀"} ${action} 완료 / 잔액 ${result?.current_mileage ?? "미제공"} MI`,
      );
      const refreshed = await history.reload();
      onChanged();
      if (!refreshed)
        setError(
          `${action}는 처리됐지만 내역을 불러오지 못했습니다 새로고침해서 확인하세요`,
        );
    } catch (requestError) {
      setError(paymentErrorMessage(requestError));
      // 이미 처리된 토큰이나 환불은 서버 상태를 다시 읽는다
      if (
        [
          "PAYMENT_TOKEN_INVALID",
          "ALREADY_REFUNDED",
          "NOT_REFUNDABLE",
        ].includes(requestError?.response?.data?.code)
      ) {
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

  function openScanner() {
    setForm((current) => ({ ...current, paymentToken: "" }));
    setManualEntry(false);
    setError("");
    setNotice("");
    setScanning(true);
  }

  return (
    <section aria-label="결제와 환불" className={styles.payments}>
      {receipt ? (
        <section
          className={styles.receipt}
          aria-label={`${receipt.action} 완료`}
        >
          <PaymentIcon name="check" />
          <h2>{receipt.action} 완료</h2>
          <p className={styles.confirmAmount}>
            {number(receipt.amount)}
            <span>MI</span>
          </p>
          <dl className={styles.receiptDetails}>
            <dt>팀</dt>
            <dd>{receipt.teamName}</dd>
            <dt>품목</dt>
            <dd>{receipt.itemName || "미제공"}</dd>
            <dt>남은 마일리지</dt>
            <dd>{number(receipt.balance)} MI</dd>
          </dl>
          <p role="status" className={styles.srOnly}>
            {notice}
          </p>
          <button
            type="button"
            ref={receiptAction}
            className={styles.primaryButton}
            disabled={busy}
            onClick={() => {
              setReceipt(null);
              setNotice("");
              setError("");
            }}
          >
            다음 결제
            <PaymentIcon name="arrow" />
          </button>
        </section>
      ) : (
        <form onSubmit={prepareCheckout}>
          <fieldset disabled={busy} className={styles.checkout}>
            <div>
              <p className={styles.eyebrow}>마일리지샵</p>
              <h2 className={styles.scanHeading}>
                참가자 QR을 <br />
                읽어주세요
              </h2>
              {form.paymentToken.trim() ? (
                <div className={styles.scanReady}>
                  <PaymentIcon name="check" />
                  <strong>QR 입력 완료</strong>
                  <p>품목과 금액을 확인해주세요</p>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={openScanner}
                  >
                    다시 읽기
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.scanButton}
                  onClick={openScanner}
                  aria-label="카메라로 읽기"
                >
                  <PaymentIcon name="qr" />
                  <span className={styles.scanButtonLabel}>
                    카메라로 읽기
                    <PaymentIcon name="arrow" />
                  </span>
                </button>
              )}
              <div className={styles.manualToggle}>
                <button
                  type="button"
                  className={styles.textButton}
                  aria-expanded={manualEntry}
                  aria-controls="payment-manual-token"
                  onClick={() => setManualEntry(!manualEntry)}
                >
                  {manualEntry ? "직접 입력 닫기" : "토큰 직접 입력"}
                </button>
              </div>
              <div
                id="payment-manual-token"
                hidden={!manualEntry}
                className={styles.manualField}
              >
                <label className={styles.field}>
                  QR 결제 토큰
                  <input
                    ref={tokenInput}
                    className={styles.input}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={form.paymentToken}
                    onChange={(event) =>
                      setForm({ ...form, paymentToken: event.target.value })
                    }
                    placeholder="참가자 토큰 붙여넣기"
                  />
                </label>
              </div>
              {notice && (
                <p role="status" className={styles.srOnly}>
                  {notice}
                </p>
              )}
            </div>
            <div>
              <h3 className={styles.detailsHeading}>결제 정보</h3>
              <label className={styles.amountField}>
                결제 금액
                <span className={styles.amountInput}>
                  <input
                    aria-label="결제 금액 (MI)"
                    ref={amountInput}
                    data-long={form.amount.length > 8}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2147483647}
                    step={1}
                    required
                    placeholder="0"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                  />
                  <span>MI</span>
                </span>
              </label>
              <label className={styles.field}>
                품목
                <input
                  className={styles.input}
                  required
                  maxLength={100}
                  value={form.itemName}
                  placeholder="교환할 품목을 입력해주세요"
                  onChange={(event) =>
                    setForm({ ...form, itemName: event.target.value })
                  }
                />
              </label>
              <div className={styles.checkoutAction}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={Boolean(validateCheckout(form))}
                >
                  결제 확인
                  <PaymentIcon name="arrow" />
                </button>
                <p className={styles.actionHint}>
                  {form.paymentToken.trim()
                    ? "다음 화면에서 확인 후 결제됩니다"
                    : "참가자 QR을 먼저 읽어주세요"}
                </p>
              </div>
            </div>
          </fieldset>
        </form>
      )}
      {error && !confirmation && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <section className={styles.history} aria-label="결제 / 환불 내역">
        <div className={styles.historyHeader}>
          <div className={styles.historyTitle}>
            <h2>결제 내역</h2>
            {history.status === "success" && (
              <span>{number(history.data?.total_count)}건</span>
            )}
          </div>
          <div className={styles.historyTools}>
            <label>
              <span className={styles.srOnly}>팀 필터</span>
              <select
                value={teamId}
                disabled={busy}
                onChange={(event) => {
                  setTeamId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">전체 팀</option>
                {teams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.team_name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="결제 내역 새로고침"
              title="새로고침"
              onClick={history.retry}
              disabled={busy || history.status === "loading"}
            >
              <PaymentIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className={styles.historyStatus}>
          <AdminStatusMessage
            status={history.status}
            error={history.error}
            onRetry={history.retry}
          />
        </div>
        {history.status === "success" && (
          <table className={styles.historyTable}>
            <thead>
              <tr>
                {["품목 / 팀", "마일리지", "처리 정보 (KST)", ""].map(
                  (label, index) => (
                    <th scope="col" key={index}>
                      {label || <span className={styles.srOnly}>조치</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(history.data?.history ?? []).map((entry) => (
                <tr key={entry.history_id}>
                  <td>
                    <span className={styles.entryTitle}>
                      {entry.type === "REFUND"
                        ? "결제 환불"
                        : entry.reason || "품목 미제공"}
                    </span>
                    <span className={styles.entryTeam}>{entry.team_name}</span>
                  </td>
                  <td
                    className={styles.entryAmount}
                    data-refund={entry.type === "REFUND"}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {number(entry.amount)} <small>MI</small>
                  </td>
                  <td className={styles.entryMeta}>
                    <span>{toKst(entry.created_at)}</span>
                    <span>{entry.processed_by || "처리자 미제공"}</span>
                  </td>
                  <td className={styles.entryActions}>
                    <div>
                      {canRefund(entry) ? (
                        <button
                          type="button"
                          className={styles.refundButton}
                          disabled={busy}
                          aria-label={`${entry.team_name} ${entry.reason} 환불`}
                          onClick={() => {
                            setError("");
                            setNotice("");
                            setConfirmation({ kind: "refund", entry });
                          }}
                        >
                          환불
                        </button>
                      ) : entry.is_refunded ? (
                        <span className={styles.refunded}>환불 완료</span>
                      ) : null}
                      <button
                        type="button"
                        className={styles.textButton}
                        disabled={busy}
                        aria-label={`${entry.team_name} ${entry.reason || "결제"} 상세`}
                        onClick={() => setDetail(entry)}
                      >
                        상세
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {history.data?.history?.length === 0 && (
                <tr>
                  <td className={styles.empty} colSpan={4}>
                    아직 결제 내역이 없어요
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <div className={styles.pagination}>
          <AdminPagination
            page={page}
            totalCount={history.data?.total_count}
            onChange={setPage}
            disabled={busy || history.status !== "success"}
          />
        </div>
      </section>
      {scanning && active && (
        <AdminQrScanner
          onClose={() => setScanning(false)}
          onManual={() => {
            setScanning(false);
            setManualEntry(true);
          }}
          onToken={(token) => {
            focusScannedAmount.current = true;
            setForm((current) => ({ ...current, paymentToken: token }));
            setScanning(false);
            setNotice("QR을 읽었습니다 품목과 금액을 확인해주세요");
          }}
        />
      )}
      {confirmation && (
        <AdminDialog
          variant="payment"
          title={confirmation.kind === "checkout" ? "결제 확인" : "환불 확인"}
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          <p className={styles.confirmHeading}>
            {confirmation.kind === "checkout"
              ? "이 금액으로 결제할까요?"
              : "이 결제를 환불할까요?"}
          </p>
          <p className={styles.confirmAmount}>
            {number(
              confirmation.kind === "checkout"
                ? confirmation.form.amount
                : -confirmation.entry.amount,
            )}
            <span>MI</span>
          </p>
          <dl className={styles.receiptDetails}>
            <dt>품목</dt>
            <dd>
              {confirmation.kind === "checkout"
                ? confirmation.form.itemName
                : confirmation.entry.reason}
            </dd>
            <dt>{confirmation.kind === "checkout" ? "결제 수단" : "팀"}</dt>
            <dd>
              {confirmation.kind === "checkout"
                ? "참가자 QR"
                : confirmation.entry.team_name}
            </dd>
          </dl>
          <p className={styles.actionHint}>
            {confirmation.kind === "checkout"
              ? "참가자 마일리지에서 차감됩니다"
              : "결제한 마일리지가 팀에 돌아갑니다"}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.confirmationActions}>
            <button
              type="button"
              disabled={busy}
              className={styles.secondaryButton}
              onClick={() => setConfirmation(null)}
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              className={styles.primaryButton}
              onClick={runPayment}
            >
              {busy
                ? "처리 중"
                : confirmation.kind === "checkout"
                  ? "결제하기"
                  : "환불하기"}
            </button>
          </div>
        </AdminDialog>
      )}
      {detail && (
        <AdminDialog
          variant="payment"
          title="결제 내역 상세"
          onClose={() => setDetail(null)}
        >
          <p className={styles.confirmAmount}>
            {detail.amount > 0 ? "+" : ""}
            {number(detail.amount)}
            <span>MI</span>
          </p>
          <dl className={styles.receiptDetails}>
            <dt>팀</dt>
            <dd>{detail.team_name}</dd>
            <dt>유형</dt>
            <dd>
              {detail.type === "REFUND" ? "환불" : "결제"}
              {detail.is_refunded ? " / 환불 완료" : ""}
            </dd>
            <dt>품목 / 사유</dt>
            <dd>{detail.reason || "미제공"}</dd>
            <dt>처리자</dt>
            <dd>{detail.processed_by || "미제공"}</dd>
            <dt>시각 (KST)</dt>
            <dd>{toKst(detail.created_at)}</dd>
            <dt>내역 ID</dt>
            <dd>{detail.history_id}</dd>
          </dl>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setDetail(null)}
          >
            확인
          </button>
        </AdminDialog>
      )}
    </section>
  );
}
