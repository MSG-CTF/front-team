import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  adjustMileage,
  createAdminIdempotencyKey,
  forceResetInstance,
  forceStopInstance,
  getAdminDashboard,
  getAdminEvents,
  getTeamSnapshots,
  rollbackTeam,
} from "../../../api/admin.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import Modal from "../components/AdminDialog.jsx";
import AdminResourceSummary from "../components/AdminResourceSummary.jsx";
import useAdminNodeResources from "../hooks/useAdminNodeResources.js";
import intro from "./AdminDashboardPage.module.css";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import { getAdminEventSeverity, getAdminEventTypeLabel } from "../utils/adminBoard.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { mileageAttempt, validateMileageAdjustment } from "../utils/adminMileage.js";
import ui from "../components/AdminWorkspace.module.css";

// 운영 대시보드 - Figma node 384:396 "AdminDashboard_OpsOverview_v2".
// 첫 화면은 운영 요약만 표시하고 전체 노드 배치는 전용 화면에서 조회한다
// 시안의 "빠른 작업" 4개 버튼(강제 재시작/강제 종료/마일리지 지급/롤백 실행)은
// 시안엔 입력 폼이 없어(대상 인스턴스/팀을 어떻게 고르는지 디자인이 없음) 각
// 버튼을 누르면 뜨는 작은 모달로 구현했다. 실제 admin.js 함수를 그대로 호출한다.


function StatCard({ value, label, tone }) {
  return (
    <div className={ui.stat} data-tone={tone}>
      <span className={ui.statValue}>{value}</span>
      <span className={ui.statLabel}>{label}</span>
    </div>
  );
}

export function QuickActionButton({ variant, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={ui.quickAction}
      data-action={variant}
    >
      {label}
    </button>
  );
}

function InstanceActionModal({ label, onClose, onSubmit }) {
  const [instanceId, setInstanceId] = useState("");
  const pending = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !instanceId.trim()) return;
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(instanceId.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "처리에 실패했습니다.");
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={label} onClose={onClose} busy={isSubmitting}>
      <form onSubmit={handleSubmit} className={ui.formStack}>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>대상 인스턴스 ID</span>
          <input
            autoFocus
            disabled={isSubmitting}
            value={instanceId}
            onChange={(event) => setInstanceId(event.target.value)}
            placeholder="문제 · 인스턴스 화면에서 복사"
            className={`${ui.input} ${ui.mono}`}
          />
        </label>
        {error && <p role="alert" className={ui.errorText}>{error}</p>}
        <div className={ui.formActions}>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={ui.button}>취소</button>
          <button type="submit" disabled={isSubmitting || !instanceId.trim()} className={ui.dangerSolid}>실행</button>
        </div>
      </form>
    </Modal>
  );
}

function MileageGrantModal({ onClose, onDone }) {
  const teamOptions = useAdminTeamOptions();
  const teams = teamOptions.data?.teams ?? [];
  const [teamId, setTeamId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const pending = useRef(false);
  const attempt = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (pending.current || teamOptions.status !== "success") return;
    const validation = validateMileageAdjustment({ teamId, amount, reason });
    if (validation) { setError(validation); return; }
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      attempt.current = mileageAttempt(attempt.current, { teamId, amount, reason }, () => createAdminIdempotencyKey("admin-mileage"));
      const res = await adjustMileage(teamId, { amount: parsed, reason: reason.trim(), idempotencyKey: attempt.current.key });
      if (!isSuccess(res.data)) throw new Error(res.data?.message || "마일리지 지급에 실패했습니다.");
      attempt.current = null;
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "마일리지 지급에 실패했습니다.");
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="마일리지 지급" onClose={onClose} busy={isSubmitting}>
      <AdminStatusMessage status={teamOptions.status} error={teamOptions.error} onRetry={teamOptions.retry}/>
      <form onSubmit={handleSubmit} className={ui.formStack}>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>대상 팀</span>
          <select disabled={isSubmitting} value={teamId} onChange={(event) => setTeamId(event.target.value)} className={ui.select}>
            <option value="">선택</option>
            {teams.map((team) => (
              <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>변동량 <small>+지급 / -회수</small></span>
          <input type="number" required step={1} disabled={isSubmitting} value={amount} onChange={(event) => setAmount(event.target.value)} className={ui.input} />
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>사유</span>
          <input required maxLength={500} disabled={isSubmitting} value={reason} onChange={(event) => setReason(event.target.value)} className={ui.input} />
        </label>
        {error && <p role="alert" className={ui.errorText}>{error}</p>}
        <div className={ui.formActions}>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={ui.button}>취소</button>
          <button
            type="submit"
            disabled={isSubmitting || teamOptions.status !== "success" || Boolean(validateMileageAdjustment({ teamId, amount, reason }))}
            className={ui.primary}
          >
            지급
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RollbackModal({ onClose, onDone }) {
  const teamOptions = useAdminTeamOptions();
  const teams = teamOptions.data?.teams ?? [];
  const [teamId, setTeamId] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotId, setSnapshotId] = useState("");
  const [reason, setReason] = useState("");
  const pending = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [snapshotState, setSnapshotState] = useState({ status: "idle", teamId: null });
  const [snapshotRevision, setSnapshotRevision] = useState(0);
  useEffect(() => {
    setSnapshots([]);
    setSnapshotId("");
    if (!teamId) { setSnapshotState({ status: "idle", teamId: null }); return; }
    const controller = new AbortController();
    let active = true;
    setSnapshotState({ status: "loading", teamId });
    setError("");
    getTeamSnapshots(teamId, { signal: controller.signal, timeout: 10000 }).then((response) => {
      if (!isSuccess(response.data) || !Array.isArray(response.data.data?.snapshots)) throw new Error("롤백 지점을 조회하지 못했습니다");
      if (active) {
        setSnapshots(response.data.data.snapshots);
        setSnapshotState({ status: "success", teamId });
      }
    }).catch((requestError) => {
      if (active) { setSnapshotState({ status: "error", teamId }); setError(getAdminRequestError(requestError, "롤백 지점을 조회하지 못했습니다").error); }
    });
    return () => { active = false; controller.abort(); };
  }, [teamId, snapshotRevision]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !teamId || snapshotState.teamId !== teamId || !snapshots.some((item) => item.snapshot_id === snapshotId && !item.is_rolled_back) || !reason.trim() || reason.trim().length > 500) return;
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await rollbackTeam(teamId, { snapshotId, reason: reason.trim() });
      if (!isSuccess(res.data)) throw new Error(res.data?.message || "롤백에 실패했습니다.");
      onDone();
      onClose();
    } catch (err) {
      setError(getAdminRequestError(err, "롤백에 실패했습니다").error);
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="롤백 실행" onClose={onClose} busy={isSubmitting}>
      <AdminStatusMessage status={teamOptions.status} error={teamOptions.error} onRetry={teamOptions.retry}/>
      <form onSubmit={handleSubmit} className={ui.formStack}>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>대상 팀</span>
          <select
            disabled={isSubmitting}
            value={teamId}
            onChange={(event) => {
              setTeamId(event.target.value);
              setSnapshotId("");
              setSnapshots([]);
            }}
            className={ui.select}
          >
            <option value="">선택</option>
            {teams.map((team) => (
              <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
            ))}
          </select>
        </label>
        {teamId && (
          <div className={ui.field}>
            <span className={ui.fieldLabel}>롤백 지점</span>
            {snapshotState.status === "loading" && <p role="status" className={ui.fieldHint}>롤백 지점 조회 중</p>}
            {snapshotState.status === "error" && <button type="button" className={`${ui.button} ${ui.small}`} onClick={() => setSnapshotRevision((value) => value + 1)}>다시 조회</button>}
            {snapshotState.status === "success" && snapshots.length === 0 && <p className={ui.fieldHint}>롤백 지점이 없습니다.</p>}
            {snapshots.length > 0 && (
              <div className={ui.choiceList}>
                {snapshots.map((snapshot) => (
                  <label key={snapshot.snapshot_id} className={ui.check} data-disabled={isSubmitting || snapshot.is_rolled_back}>
                    <input
                      type="radio"
                      name="snapshot"
                      disabled={isSubmitting || snapshot.is_rolled_back}
                      checked={snapshotId === snapshot.snapshot_id}
                      onChange={() => setSnapshotId(snapshot.snapshot_id)}
                    />
                    <span>{snapshot.reason || "스냅샷"} · {formatAdminTime(snapshot.created_at)}{snapshot.is_rolled_back ? " (복원 완료)" : ""}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <label className={ui.field}>
          <span className={ui.fieldLabel}>사유</span>
          <input required maxLength={500} disabled={isSubmitting} value={reason} onChange={(event) => setReason(event.target.value)} className={ui.input} />
        </label>
        {error && <p role="alert" className={ui.errorText}>{error}</p>}
        <div className={ui.formActions}>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={ui.button}>취소</button>
          <button type="submit" disabled={isSubmitting || !teamId || !snapshotId || !reason.trim()} className={ui.dangerSolid}>롤백</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDashboardPage() {
  const dashboard = useAdminResource(getAdminDashboard, [], "대시보드 정보를 불러오지 못했습니다.");
  const events = useAdminResource((config) => getAdminEvents({ size: 5 }, config), [], "이벤트 로그를 불러오지 못했습니다.");
  const resources = useAdminNodeResources();
  const [openModal, setOpenModal] = useState(null);

  const data = dashboard.data;
  const eventRows = events.data?.events ?? [];

  const reloadAll = useCallback(() => Promise.all([
    dashboard.reload(), events.reload(), resources.reload(),
  ]), [dashboard.reload, events.reload, resources.reload]);
  useEffect(() => {
    if (openModal) return undefined;
    // Resource hooks perform the initial reads. Only schedule subsequent reads.
    return startVisiblePolling(() => Promise.all([dashboard.reload(), events.reload()]), { immediate: false });
  }, [dashboard.reload, events.reload, openModal]);

  const refreshing = [dashboard, events, resources].some((item) => item.status === "loading");

  return (
    <AdminLayout
      title="MSG CTF 운영 대시보드"
      actions={<>
        <button type="button" onClick={reloadAll} disabled={refreshing} className={ui.button}>새로고침</button>
        <span className={ui.cardMeta}>운영 현황 30초마다 갱신 · 수집 {formatAdminTime(data?.collected_at)} KST</span>
      </>}
    >
      <AdminStatusMessage status={dashboard.status} error={dashboard.error} onRetry={dashboard.retry} hasData={Boolean(data)} />

      <div className={ui.stack}>
        <div className={ui.stats}>
          <StatCard value={data?.instances?.running ?? "-"} label="실행 중 인스턴스" tone="good" />
          <StatCard value={data?.instances?.failed ?? "-"} label="실패 인스턴스" tone="bad" />
          <StatCard value={data?.teams?.total_count ?? "-"} label="참가 팀 수" tone="gold" />
        </div>
        <div className={`${ui.halves} ${ui.halvesEqual}`}>
          <AdminResourceSummary resources={resources} />
          <section className={ui.card} aria-labelledby="dashboard-manage">
            <header className={ui.cardHeader}><h2 id="dashboard-manage" className={ui.cardTitle}><span className={ui.eyebrow}>MANAGEMENT</span>대회 관리</h2></header>
            <nav className={`${ui.cardBody} ${intro.links}`} aria-label="관리 바로가기">
              <Link to={ROUTES.adminChallenges}><strong>문제 · 인스턴스</strong><span>문제 설정과 실행 현황 →</span></Link>
              <Link to={ROUTES.adminTeams}><strong>참가 팀</strong><span>팀별 진행 상황 →</span></Link>
              <Link to={ROUTES.adminSettings}><strong>대회 설정</strong><span>운영 시간과 규칙 →</span></Link>
            </nav>
          </section>
        </div>
        <section className={ui.card} aria-labelledby="dashboard-events">
          <header className={ui.cardHeader}>
            <h2 id="dashboard-events" className={ui.cardTitle}><span className={ui.eyebrow}>EVENTS</span>최근 운영 기록</h2>
            <Link to={ROUTES.adminLogs} className={`${ui.button} ${ui.small}`}>전체 로그</Link>
          </header>
          <div className={ui.cardBody}>
            <AdminStatusMessage status={events.status} error={events.error} onRetry={events.retry} hasData={Boolean(events.data)} />
            <ul className={intro.events}>{eventRows.slice(0, 3).map((event) => <li key={event.event_id}>
              <time dateTime={event.created_at}>{formatAdminTime(event.created_at)} KST</time>
              <p className={ui.clamp} title={event.message}><AdminBadge tone={getAdminEventSeverity(event.severity).tone}>{getAdminEventTypeLabel(event.type)}</AdminBadge> {event.message}</p>
            </li>)}</ul>
            {events.data && eventRows.length === 0 && <p className={ui.cardMeta}>아직 운영 기록이 없습니다</p>}
          </div>
        </section>
        {/* Figma 384:396의 빠른 작업 네 개는 접지 않고 나무 버튼 그대로 둔다 */}
        <section className={ui.card} aria-labelledby="dashboard-actions">
          <header className={ui.cardHeader}>
            <h2 id="dashboard-actions" className={ui.cardTitle}><span className={ui.eyebrow}>ACTIONS</span>빠른 작업</h2>
            <span className={ui.cardMeta}>실행 전 대상과 사유를 한 번 더 확인합니다</span>
          </header>
          <div className={`${ui.cardBody} ${ui.quickActions}`}>
            <QuickActionButton variant="restart" label="강제 재시작" onClick={() => setOpenModal("restart")} />
            <QuickActionButton variant="stop" label="강제 종료" onClick={() => setOpenModal("stop")} />
            <QuickActionButton variant="mileage" label="마일리지 지급" onClick={() => setOpenModal("mileage")} />
            <QuickActionButton variant="rollback" label="롤백 실행" onClick={() => setOpenModal("rollback")} />
          </div>
        </section>
      </div>

      {openModal === "restart" && (
        <InstanceActionModal
          label="인스턴스 강제 재시작"
          onClose={() => setOpenModal(null)}
          onSubmit={async (id) => {
            const res = await forceResetInstance(id);
            if (!isSuccess(res.data)) throw new Error(res.data?.message || "재시작에 실패했습니다.");
            reloadAll();
          }}
        />
      )}
      {openModal === "stop" && (
        <InstanceActionModal
          label="인스턴스 강제 종료"
          onClose={() => setOpenModal(null)}
          onSubmit={async (id) => {
            const res = await forceStopInstance(id);
            if (!isSuccess(res.data)) throw new Error(res.data?.message || "종료에 실패했습니다.");
            reloadAll();
          }}
        />
      )}
      {openModal === "mileage" && <MileageGrantModal onClose={() => setOpenModal(null)} onDone={reloadAll} />}
      {openModal === "rollback" && <RollbackModal onClose={() => setOpenModal(null)} onDone={reloadAll} />}
    </AdminLayout>
  );
}
