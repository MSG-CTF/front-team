import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adjustMileage,
  getAdminDashboard,
  getAdminMileageHistory,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import AdminPagination from "../components/AdminPagination.jsx";
import AdminTeamPicker from "../components/AdminTeamPicker.jsx";
import AdminMileageAdjustForm from "../components/AdminMileageAdjustForm.jsx";
import { StatStrip, StatTile, IconButton } from "../components/AdminWidgets.jsx";
import { formatAdminNumber } from "../utils/adminNumber.js";
import {
  MILEAGE_FILTERS,
  MILEAGE_TYPE_TONES,
  formatMileageAmount,
  getMileageTypeLabel,
  loadMileageHistory,
} from "../utils/adminMileage.js";
import paymentStyles from "../components/AdminPayments.module.css";
import pickerStyles from "../components/AdminPicker.module.css";
import ui from "../components/AdminWorkspace.module.css";
import columns from "./AdminMileagePage.module.css";

const AdminPaymentsPanel = lazy(
  () => import("../components/AdminPaymentsPanel.jsx"),
);

// 마일리지 · 결제: 지급과 회수, 전체 내역, 부스 QR 결제를 한 화면에서 다룬다
// 넓은 화면에서는 왼쪽에 지급 · 회수 폼을 붙여 두고 오른쪽 내역만 길게 내려간다
// GET /admin/mileage_history(README 8절)로 팀 구분 없이 전체 내역을 보고, 지급/회수는 팀 상세와 같은 adjustMileage를 쓴다
function GrantForm({ onDone, teams, teamsLoading, teamsCapped, disabled }) {
  return <AdminMileageAdjustForm teams={teams} teamsLoading={teamsLoading} teamsCapped={teamsCapped} disabled={disabled}
    submit={async ({ teamId, amount, reason, idempotencyKey }) => {
      const res = await adjustMileage(teamId, { amount, reason, idempotencyKey });
      if (!isSuccess(res.data)) throw new Error(res.data?.message || "처리에 실패했습니다");
      await onDone();
      return true;
    }} />;
}

export default function AdminMileagePage() {
  // 부스 스태프는 폰 즐겨찾기(?tab=payment)로 결제 탭을 바로 연다
  const [params, setParams] = useSearchParams();
  const initialTab = params.get("tab") === "payment" ? "payment" : "mileage";
  const [tab, setTab] = useState(initialTab);
  const [paymentOpened, setPaymentOpened] = useState(initialTab === "payment");
  const selectTab = (next) => {
    setTab(next);
    if (next === "payment") setPaymentOpened(true);
    setParams(next === "payment" ? { tab: "payment" } : {}, { replace: true });
  };
  const [page, setPage] = useState(1);
  const [teamId, setTeamId] = useState("");
  const [filter, setFilter] = useState(MILEAGE_FILTERS[0].key);
  const teamOptions = useAdminTeamOptions();
  const teams = teamOptions.data?.teams ?? [];
  const history = useAdminResource(
    (config) => loadMileageHistory(getAdminMileageHistory, { teamId: teamId || undefined, filter, page, size: 50 }, config),
    [teamId, filter, page],
    "마일리지 내역을 불러오지 못했습니다",
  );
  const rows = history.data?.history ?? [];
  const summary = useAdminResource(getAdminDashboard, [], "집계를 불러오지 못했습니다");
  const count = (value) => (value == null ? "-" : formatAdminNumber(value));

  return (
    <AdminLayout
      title="마일리지 · 결제"
    >
      <div className={paymentStyles.tabs} aria-label="관리 항목">
        <button
          type="button"
          aria-pressed={tab === "mileage"}
          onClick={() => selectTab("mileage")}
        >
          지급 / 회수
        </button>
        <button
          type="button"
          aria-pressed={tab === "payment"}
          onClick={() => selectTab("payment")}
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
              teamsLoading={teamOptions.status === "loading"}
              teamsCapped={teamOptions.data?.capped}
              onChanged={history.reload}
              active={tab === "payment"}
            />
          </Suspense>
        )}
      </div>
      <div hidden={tab !== "mileage"}>
        <div className={ui.stack}>
        <StatStrip label="마일리지 집계">
          <StatTile glyph="mileage" tone="yellow" label="팀 보유 합계" value={count(summary.data?.teams?.total_mileage)} unit="MI" />
          <StatTile glyph="payment" tone="orange" label="부스 결제" value={count(summary.data?.payment?.purchase_count)} unit="건" />
          <StatTile glyph="rollback" tone="green" label="환불" value={count(summary.data?.payment?.refund_count)} unit="건" />
          <StatTile glyph="rank" tone="indigo" label="순지출" value={count(summary.data?.payment?.net_spent)} unit="MI" />
        </StatStrip>
        <div className={columns.columns}>
        <section className={`${ui.card} ${columns.grant}`} aria-labelledby="mileage-grant">
          <header className={ui.cardHeader}>
            <h2 id="mileage-grant" className={ui.cardTitle}>마일리지 지급 · 회수</h2>
          </header>
          <div className={ui.cardBody}>
            <GrantForm
              onDone={() => Promise.all([history.reload(), teamOptions.reload(), summary.reload()])}
              teams={teams}
              teamsLoading={teamOptions.status === "loading"}
              teamsCapped={teamOptions.data?.capped}
              disabled={teamOptions.status !== "success"}
            />
          </div>
        </section>

        <section className={ui.card} aria-labelledby="mileage-history">
          <header className={ui.cardHeader}>
            <h2 id="mileage-history" className={ui.cardTitle}>마일리지 내역</h2>
            <div className={ui.cardActions}>
              <div className={ui.historyTeam}>
                <AdminTeamPicker teams={teams} value={teamId} onChange={(next) => { setTeamId(next); setPage(1); }}
                  label="내역을 볼 팀" allowAll allLabel="모든 팀" compact loading={teamOptions.status === "loading"} capped={teamOptions.data?.capped} />
              </div>
              <IconButton icon="refresh" label="새로고침" onClick={history.retry} disabled={history.status === "loading"} />
            </div>
          </header>
          <div className={ui.filterChips}>
            <div className={pickerStyles.chips} role="group" aria-label="내역 종류">
              {MILEAGE_FILTERS.map((item) => <button key={item.key} type="button" className={pickerStyles.chip}
                aria-pressed={filter === item.key} onClick={() => { setFilter(item.key); setPage(1); }}>{item.label}</button>)}
            </div>
            {history.data?.filtered_locally && <p className={ui.quietNote}>유형 묶음 필터는 백엔드 반영 전이라 50건씩 받아 이 화면에서 거릅니다</p>}
          </div>
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
                      <td title={entry.type}><AdminBadge tone={MILEAGE_TYPE_TONES[entry.type] ?? "neutral"}>{getMileageTypeLabel(entry.type)}</AdminBadge></td>
                      <td className={`${ui.num} ${entry.amount > 0 ? ui.amountPlus : ui.amountMinus}`}>
                        {formatMileageAmount(entry.amount)}
                      </td>
                      <td className={ui.wrap}>{entry.reason || "-"}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr className={ui.emptyRow}>
                      <td colSpan={5} className={ui.empty}>
                        이 조건의 내역이 없습니다
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
      </div>
    </AdminLayout>
  );
}
