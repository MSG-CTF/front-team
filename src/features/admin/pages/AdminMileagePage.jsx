import { lazy, Suspense, useRef, useState } from "react";
import {
  adjustMileage,
  createAdminIdempotencyKey,
  getAdminMileageHistory,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import AdminPagination from "../components/AdminPagination.jsx";
import {
  mileageAttempt,
  validateMileageAdjustment,
} from "../utils/adminMileage.js";
import paymentStyles from "../components/AdminPayments.module.css";

const AdminPaymentsPanel = lazy(
  () => import("../components/AdminPaymentsPanel.jsx"),
);

// 마일리지 관리 - Figma 사이드바 항목("마일리지 관리", node 384:417). 전용 화면
// 시안은 없어서, 팀별 목록/팀 상세와 같은 톤의 표+폼으로 구성했다.
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
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-2 font-song-myung text-sm"
    >
      <label className="flex flex-col gap-1">
        팀
        <select
          disabled={isSubmitting || disabled}
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="rounded border border-admin-divider bg-white/60 px-3 py-1.5"
        >
          <option value="">선택</option>
          {teams.map((team) => (
            <option key={team.team_id} value={team.team_id}>
              {team.team_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        변동량
        <input
          type="number"
          step={1}
          required
          disabled={isSubmitting || disabled}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="+지급 / -회수"
          className="w-32 rounded border border-admin-divider bg-white/60 px-3 py-1.5 font-kode-mono"
        />
      </label>
      <label className="flex flex-col gap-1">
        사유
        <input
          required
          maxLength={500}
          disabled={isSubmitting || disabled}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-52 rounded border border-admin-divider bg-white/60 px-3 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={
          isSubmitting ||
          disabled ||
          Boolean(validateMileageAdjustment({ teamId, amount, reason }))
        }
        className="rounded border border-admin-ink px-4 py-1.5 disabled:opacity-50"
      >
        지급/회수
      </button>
      {error && (
        <p role="alert" className="w-full text-admin-failed">
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

  return (
    <AdminLayout
      title="마일리지 / 결제 관리"
      variant={tab === "payment" ? "payment" : undefined}
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
      />
      <div hidden={tab !== "payment"}>
        {paymentOpened && (
          <Suspense fallback={<p role="status">결제 화면을 불러오는 중</p>}>
            <AdminPaymentsPanel
              teams={teams}
              onChanged={history.reload}
              active={tab === "payment"}
            />
          </Suspense>
        )}
      </div>
      <div hidden={tab !== "mileage"}>
        <GrantForm
          onDone={history.reload}
          teams={teams}
          disabled={teamOptions.status !== "success"}
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label>
            팀 필터{" "}
            <select
              value={teamId}
              onChange={(event) => {
                setTeamId(event.target.value);
                setPage(1);
              }}
              className="rounded border border-admin-divider bg-white/60 px-3 py-2"
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
            className="rounded border border-admin-divider px-3 py-2 disabled:opacity-50"
          >
            마일리지 내역 새로고침
          </button>
        </div>

        <AdminStatusMessage
          status={history.status}
          error={history.error}
          onRetry={history.retry}
        />
        {history.status === "success" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-song-myung text-sm">
              <thead>
                <tr className="border-b border-admin-divider text-left text-xs text-admin-muted">
                  <th className="px-2 py-2 font-normal">팀</th>
                  <th className="px-2 py-2 font-normal">유형</th>
                  <th className="px-2 py-2 font-normal">변동</th>
                  <th className="px-2 py-2 font-normal">사유</th>
                  <th className="px-2 py-2 font-normal">시각</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.history ?? []).map((entry) => (
                  <tr
                    key={entry.history_id}
                    className="border-b border-admin-divider/40 last:border-0"
                  >
                    <td className="px-2 py-2">{entry.team_name}</td>
                    <td className="px-2 py-2 text-admin-muted">{entry.type}</td>
                    <td
                      className={`px-2 py-2 font-kode-mono ${entry.amount > 0 ? "text-admin-running" : "text-admin-failed"}`}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </td>
                    <td className="px-2 py-2">{entry.reason || "-"}</td>
                    <td className="px-2 py-2 font-kode-mono text-xs">
                      {toKst(entry.created_at)}
                    </td>
                  </tr>
                ))}
                {(history.data?.history ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-6 text-center text-admin-muted"
                    >
                      내역 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          page={page}
          totalCount={history.data?.total_count}
          onChange={setPage}
          disabled={history.status !== "success"}
        />
      </div>
    </AdminLayout>
  );
}
