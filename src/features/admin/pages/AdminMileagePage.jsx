import { lazy, Suspense, useRef, useState } from "react";
import {
  adjustMileage,
  createAdminIdempotencyKey,
  getAdminMileageHistory,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import AdminPagination from "../components/AdminPagination.jsx";
import {
  formatMileageAmount,
  getMileageTypeLabel,
  mileageAttempt,
  validateMileageAdjustment,
} from "../utils/adminMileage.js";
import paymentStyles from "../components/AdminPayments.module.css";
import ui from "../components/AdminWorkspace.module.css";

const AdminPaymentsPanel = lazy(
  () => import("../components/AdminPaymentsPanel.jsx"),
);

// 마일리지 관리 - Figma 사이드바 항목("마일리지 관리", node 384:417). 전용 화면
// 시안은 없어서, 팀별 목록/팀 상세와 같은 카드와 표 규격으로 구성했다.
// GET /admin/mileage_history(README 8절, 백엔드: PR 대기)로 팀 구분 없이 전체
// 내역을 보여주고, 지급/회수는 기존 adjustMileage(팀 상세와 동일 엔드포인트)를 쓴다.
function GrantForm({ onDone, teams, disabled }) {
  const [teamId, setTeamId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // 같은 지급/회수 시도를 재시도할 때 동일 키를 재사용해야 서버가 중복 지급을
  // 막아준다. 성공하면 비우고, 다음 제출에서 새로 발급한다.
  const attempt = useRef(null);
  const pending = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (pending.current || disabled) return;
    const validation = validateMileageAdjustment({ teamId, amount, reason });
    if (validation) {
      setError(validation);
      return;
    }
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    attempt.current = mileageAttempt(
      attempt.current,
      { teamId, amount, reason },
      () => createAdminIdempotencyKey("admin-mileage"),
    );
    try {
      const res = await adjustMileage(teamId, {
        amount: parsed,
        reason: reason.trim(),
        idempotencyKey: attempt.current.key,
      });
      if (!isSuccess(res.data))
        throw new Error(res.data?.message || "처리에 실패했습니다.");
      attempt.current = null;
      setAmount("");
      setReason("");
      const refreshed = await onDone();
      if (!refreshed)
        setError(
          "마일리지 조정은 처리됐지만 내역을 불러오지 못했습니다 새로고침해서 확인하세요",
        );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "처리 결과를 확인하지 못했습니다 같은 내용으로 다시 요청하면 중복 지급 없이 결과를 확인합니다",
      );
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={ui.grantForm}>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>팀</span>
        <select
          disabled={isSubmitting || disabled}
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className={ui.select}
        >
          <option value="">선택</option>
          {teams.map((team) => (
            <option key={team.team_id} value={team.team_id}>
              {team.team_name}
            </option>
          ))}
        </select>
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>변동량</span>
        <input
          type="number"
          step={1}
          required
          disabled={isSubmitting || disabled}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="+지급 / -회수"
          className={ui.input}
        />
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>사유</span>
        <input
          required
          maxLength={500}
          disabled={isSubmitting || disabled}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="참가자에게 보이는 지급 이유"
          className={ui.input}
        />
      </label>
      <button
        type="submit"
        disabled={
          isSubmitting ||
          disabled ||
          Boolean(validateMileageAdjustment({ teamId, amount, reason }))
        }
        className={ui.primary}
      >
        지급/회수
      </button>
      {error && (
        <p role="alert" className={`${ui.errorText} ${ui.grantError}`}>
          {error}
        </p>
      )}
    </form>
  );
}

export default function AdminMileagePage() {
  const [tab, setTab] = useState("mileage");
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [page, setPage] = useState(1);
  const [teamId, setTeamId] = useState("");
  const teamOptions = useAdminTeamOptions();
  const teams = teamOptions.data?.teams ?? [];
  const history = useAdminResource(
    (config) =>
      getAdminMileageHistory(
        { teamId: teamId || undefined, page, size: 50 },
        config,
      ),
    [teamId, page],
    "마일리지 내역을 불러오지 못했습니다.",
  );
  const rows = history.data?.history ?? [];

  return (
    <AdminLayout
      title="마일리지 · 결제"
    >
      <div className={paymentStyles.tabs} aria-label="관리 항목">
        <button
          type="button"
          aria-pressed={tab === "mileage"}
          onClick={() => setTab("mileage")}
        >
          지급 / 회수
        </button>
        <button
          type="button"
          aria-pressed={tab === "payment"}
          onClick={() => {
            setTab("payment");
            setPaymentOpened(true);
          }}
        >
          QR 결제 / 환불
        </button>
      </div>
      <AdminStatusMessage
        status={teamOptions.status}
        error={teamOptions.error}
        onRetry={teamOptions.retry}
        hasData={Boolean(teamOptions.data)}
      />
      <div hidden={tab !== "payment"}>
        {paymentOpened && (
          <Suspense fallback={<p role="status" className={ui.statusLoading}>결제 화면을 불러오는 중</p>}>
            <AdminPaymentsPanel
              teams={teams}
              onChanged={history.reload}
              active={tab === "payment"}
            />
          </Suspense>
        )}
      </div>
      <div hidden={tab !== "mileage"}>
        <div className={ui.stack}>
        <section className={ui.card} aria-labelledby="mileage-grant">
          <header className={ui.cardHeader}>
            <h2 id="mileage-grant" className={ui.cardTitle}><span className={ui.eyebrow}>GRANT</span>마일리지 지급 · 회수</h2>
            <span className={ui.cardMeta}>같은 내용으로 다시 보내도 한 번만 처리됩니다</span>
          </header>
          <div className={ui.cardBody}>
            <GrantForm
              onDone={history.reload}
              teams={teams}
              disabled={teamOptions.status !== "success"}
            />
          </div>
        </section>

        <section className={ui.card} aria-labelledby="mileage-history">
          <header className={ui.cardHeader}>
            <h2 id="mileage-history" className={ui.cardTitle}><span className={ui.eyebrow}>HISTORY</span>마일리지 내역</h2>
            <div className={ui.cardActions}>
              <label className={ui.inlineLabel}>
                <span>팀</span>
                <select
                  value={teamId}
                  onChange={(event) => {
                    setTeamId(event.target.value);
                    setPage(1);
                  }}
                  className={`${ui.select} ${ui.small}`}
                >
                  <option value="">전체</option>
                  {teams.map((team) => (
                    <option key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={history.retry}
                disabled={history.status === "loading"}
                className={`${ui.button} ${ui.small}`}
              >
                새로고침
              </button>
            </div>
          </header>
          {(!history.data || ["error", "unavailable"].includes(history.status)) && (
            <div className={ui.cardBody}>
              <AdminStatusMessage
                status={history.status}
                error={history.error}
                onRetry={history.retry}
              />
            </div>
          )}
          {history.data && (
            <div className={`${ui.tableWrap} ${ui.tableFlush} ${ui.historyStack}`}>
              <table className={ui.table} aria-label="마일리지 내역">
                <thead>
                  <tr>
                    <th>시각 (KST)</th>
                    <th>팀</th>
                    <th>유형</th>
                    <th className={ui.num}>변동</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr key={entry.history_id}>
                      <td className={ui.time}>{formatAdminTime(entry.created_at)}</td>
                      <td><span className={ui.title}>{entry.team_name}</span></td>
                      <td className={ui.muted} title={entry.type}>{getMileageTypeLabel(entry.type)}</td>
                      <td className={`${ui.num} ${entry.amount > 0 ? ui.amountPlus : ui.amountMinus}`}>
                        {formatMileageAmount(entry.amount)}
                      </td>
                      <td className={ui.wrap}>{entry.reason || "-"}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr className={ui.emptyRow}>
                      <td colSpan={5} className={ui.empty}>
                        내역 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className={ui.cardFooter}>
            <span className={ui.cardMeta}>한 페이지에 50건씩 보입니다</span>
            <AdminPagination
              page={page}
              totalCount={history.data?.total_count}
              onChange={setPage}
              disabled={history.status !== "success"}
            />
          </div>
        </section>
        </div>
      </div>
    </AdminLayout>
  );
}
