import { useCallback, useEffect, useRef, useState } from "react";
import {
  adjustMileage,
  createAdminIdempotencyKey,
  forceResetInstance,
  forceStopInstance,
  getAdminDashboard,
  getAdminEvents,
  getAdminInstances,
  getAdminResources,
  getTeamSnapshots,
  rollbackTeam,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import Modal from "../components/AdminDialog.jsx";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { getAdminRequestError, summarizeAdminResources } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { mileageAttempt, validateMileageAdjustment } from "../utils/adminMileage.js";

// 운영 대시보드 - Figma node 384:396 "AdminDashboard_OpsOverview_v2".
// 시안의 "빠른 작업" 4개 버튼(강제 재시작/강제 종료/마일리지 지급/롤백 실행)은
// 시안엔 입력 폼이 없어(대상 인스턴스/팀을 어떻게 고르는지 디자인이 없음) 각
// 버튼을 누르면 뜨는 작은 모달로 구현했다. 실제 admin.js 함수를 그대로 호출한다.

const BADGE_SRC = {
  RUNNING: `${import.meta.env.BASE_URL}assets/admin/status-running.png`,
  STOPPED: `${import.meta.env.BASE_URL}assets/admin/status-stopped.png`,
  FAILED: `${import.meta.env.BASE_URL}assets/admin/status-failed.png`,
};

const BUTTON_SRC = {
  restart: `${import.meta.env.BASE_URL}assets/admin/btn-restart.png`,
  stop: `${import.meta.env.BASE_URL}assets/admin/btn-stop.png`,
  create: `${import.meta.env.BASE_URL}assets/admin/btn-create.png`,
  extend: `${import.meta.env.BASE_URL}assets/admin/btn-extend.png`,
};

function StatCard({ value, label, tone }) {
  const toneClass = { running: "text-admin-running", failed: "text-admin-failed", gold: "text-admin-gold" }[tone];
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-4 py-2 text-center">
      <span className={`font-kode-mono text-4xl ${toneClass}`}>{value}</span>
      <span className="font-song-myung text-sm text-admin-muted">{label}</span>
    </div>
  );
}

function QuickActionButton({ variant, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 transition-transform hover:scale-[1.03]"
    >
      <img src={BUTTON_SRC[variant]} alt={label} className="h-[62px] w-[154px] object-contain" />
      <span className="font-song-myung text-xs text-admin-ink">{label}</span>
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          대상 인스턴스 ID
          <input
            autoFocus
            disabled={isSubmitting}
            value={instanceId}
            onChange={(event) => setInstanceId(event.target.value)}
            placeholder="문제 목록 · 인스턴스 페이지에서 복사"
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 font-kode-mono text-sm"
          />
        </label>
        {error && <p role="alert" className="font-song-myung text-sm text-admin-failed">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !instanceId.trim()}
          className="self-end rounded border border-admin-ink px-4 py-1.5 font-song-myung text-sm disabled:opacity-50"
        >
          실행
        </button>
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          대상 팀
          <select
            disabled={isSubmitting}
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {teams.map((team) => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          변동량(+지급 / -회수)
          <input
            type="number"
            required
            step={1}
            disabled={isSubmitting}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 font-kode-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          사유
          <input
            required
            maxLength={500}
            disabled={isSubmitting}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 text-sm"
          />
        </label>
        {error && <p role="alert" className="font-song-myung text-sm text-admin-failed">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || teamOptions.status !== "success" || Boolean(validateMileageAdjustment({ teamId, amount, reason }))}
          className="self-end rounded border border-admin-ink px-4 py-1.5 font-song-myung text-sm disabled:opacity-50"
        >
          지급
        </button>
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          대상 팀
          <select
            disabled={isSubmitting}
            value={teamId}
            onChange={(event) => {
              setTeamId(event.target.value);
              setSnapshotId("");
              setSnapshots([]);
            }}
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {teams.map((team) => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </label>
        {teamId && (
          <div className="flex flex-col gap-1 font-song-myung text-sm">
            롤백 지점
            {snapshotState.status === "loading" && <p role="status">롤백 지점 조회 중</p>}
            {snapshotState.status === "error" && <button type="button" onClick={() => setSnapshotRevision((value) => value + 1)}>다시 조회</button>}
            {snapshotState.status === "success" && snapshots.length === 0 && <p className="text-xs text-admin-muted">롤백 지점이 없습니다.</p>}
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <label key={snapshot.snapshot_id} className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="snapshot"
                    disabled={isSubmitting || snapshot.is_rolled_back}
                    checked={snapshotId === snapshot.snapshot_id}
                    onChange={() => setSnapshotId(snapshot.snapshot_id)}
                  />
                  {snapshot.reason || "스냅샷"} / {toKst(snapshot.created_at)} {snapshot.is_rolled_back ? "(복원 완료)" : ""}
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1 font-song-myung text-sm">
          사유
          <input
            required
            maxLength={500}
            disabled={isSubmitting}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="rounded border border-admin-divider bg-white/60 px-3 py-2 text-sm"
          />
        </label>
        {error && <p role="alert" className="font-song-myung text-sm text-admin-failed">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !teamId || !snapshotId || !reason.trim()}
          className="self-end rounded border border-admin-ink px-4 py-1.5 font-song-myung text-sm disabled:opacity-50"
        >
          롤백
        </button>
      </form>
    </Modal>
  );
}

export default function AdminDashboardPage() {
  const dashboard = useAdminResource(getAdminDashboard, [], "대시보드 정보를 불러오지 못했습니다.");
  const events = useAdminResource((config) => getAdminEvents({ size: 5 }, config), [], "이벤트 로그를 불러오지 못했습니다.");
  const instances = useAdminResource((config) => getAdminInstances({ size: 1 }, config), [], "인스턴스 현황을 불러오지 못했습니다.");
  const resources = useAdminResource(getAdminResources, [], "리소스 상태를 불러오지 못했습니다.");
  const [openModal, setOpenModal] = useState(null);

  const data = dashboard.data;
  const byStatus = instances.data?.summary?.by_status ?? {};
  const resourceSummary = summarizeAdminResources(resources.data);

  const reloadAll = useCallback(() => Promise.all([
    dashboard.reload(), events.reload(), instances.reload(), resources.reload(),
  ]), [dashboard.reload, events.reload, instances.reload, resources.reload]);
  useEffect(() => {
    let active = true;
    let timer;
    const poll = async () => {
      if (!openModal) await reloadAll();
      if (active) timer = setTimeout(poll, 30000);
    };
    timer = setTimeout(poll, 30000);
    return () => { active = false; clearTimeout(timer); };
  }, [reloadAll, openModal]);

  return (
    <AdminLayout title="MSG CTF 운영 대시보드" actions={<div className="flex flex-wrap items-center gap-3 text-sm"><span>수집 시각 {data?.collected_at ? toKst(data.collected_at) : "-"} (KST)</span><button type="button" onClick={reloadAll} disabled={[dashboard, events, instances, resources].some((item) => item.status === "loading")} className="rounded border border-admin-divider px-3 py-1 disabled:opacity-50">새로고침</button></div>}>
      <AdminStatusMessage status={dashboard.status} error={dashboard.error} onRetry={dashboard.retry} />

      {dashboard.status === "success" && data && (
        <>
          <div className="mb-6 flex divide-x divide-admin-divider rounded-lg border border-admin-divider">
            <StatCard value={data.instances?.running ?? "-"} label="실행중 인스턴스" tone="running" />
            <StatCard value={data.instances?.failed ?? "-"} label="실패 인스턴스" tone="failed" />
            <StatCard value={data.teams?.total_count ?? "-"} label="참가 팀 수" tone="gold" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 border-t border-admin-divider pt-5 lg:grid-cols-[1fr_320px]">
            <section>
              <h2 className="mb-3 font-im-fell text-lg text-admin-ink">최근 이벤트 로그</h2>
              <AdminStatusMessage status={events.status} error={events.error} onRetry={events.retry} />
              {events.status === "success" && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-song-myung text-sm">
                    <thead>
                      <tr className="border-b border-admin-divider text-left text-xs text-admin-muted">
                        <th className="py-1 pr-2 font-normal">시간</th>
                        <th className="py-1 pr-2 font-normal">이벤트</th>
                        <th className="py-1 pr-2 font-normal">대상</th>
                        <th className="py-1 pr-2 font-normal">처리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(events.data?.events ?? []).map((event) => (
                        <tr key={event.event_id} className="border-b border-admin-divider/40 last:border-0">
                          <td className="py-2 pr-2 font-kode-mono text-xs">{toKst(event.created_at)}</td>
                          <td className="py-2 pr-2">{event.message}</td>
                          <td className="py-2 pr-2 text-admin-muted">
                            {[event.team_name, event.challenge_title].filter(Boolean).join(" · ") || "-"}
                          </td>
                          <td className="py-2 pr-2">{event.actor || "-"}</td>
                        </tr>
                      ))}
                      {(events.data?.events ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-admin-muted">이벤트 없음</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-im-fell text-lg text-admin-ink">인스턴스 상태 분포</h2>
              <AdminStatusMessage status={instances.status} error={instances.error} onRetry={instances.retry}/>
              <div className="flex flex-col gap-2">
                {["RUNNING", "STOPPED", "FAILED"].map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <img src={BADGE_SRC[key]} alt={key} className="h-10 w-[168px] object-contain" />
                    <span className="font-kode-mono text-2xl text-admin-ink">{instances.status === "success" ? byStatus[key] ?? "-" : "-"}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mb-6 border-t border-admin-divider pt-5">
            <h2 className="mb-3 font-im-fell text-lg text-admin-ink">빠른 작업</h2>
            <div className="flex flex-wrap gap-6">
              <QuickActionButton variant="restart" label="강제 재시작" onClick={() => setOpenModal("restart")} />
              <QuickActionButton variant="stop" label="강제 종료" onClick={() => setOpenModal("stop")} />
              <QuickActionButton variant="create" label="마일리지 지급" onClick={() => setOpenModal("mileage")} />
              <QuickActionButton variant="extend" label="롤백 실행" onClick={() => setOpenModal("rollback")} />
            </div>
          </section>

          <section className="border-t border-admin-divider pt-5">
            <h2 className="mb-3 font-im-fell text-lg text-admin-ink">계정 · 노드 리소스 상태</h2>
            <AdminStatusMessage status={resources.status} error={resources.error} onRetry={resources.retry} />
            {resources.status === "success" && resourceSummary && (
              <div className="flex flex-wrap gap-10 font-song-myung text-sm">
                <div>
                  <p className="m-0 text-xs text-admin-muted">K8s 노드</p>
                  <p className="m-0 font-kode-mono text-xl text-admin-ink">
                    {resourceSummary.nodesHealthy} / {resourceSummary.nodesTotal} 정상
                  </p>
                </div>
                <div>
                  <p className="m-0 text-xs text-admin-muted">노드 평균 CPU</p>
                  <p className="m-0 font-kode-mono text-xl text-admin-ink">{resourceSummary.averageCpuUsagePercent == null ? "-" : `${resourceSummary.averageCpuUsagePercent}%`}</p>
                </div>
                <div>
                  <p className="m-0 text-xs text-admin-muted">노드 평균 메모리</p>
                  <p className="m-0 font-kode-mono text-xl text-admin-ink">{resourceSummary.averageMemoryUsagePercent == null ? "-" : `${resourceSummary.averageMemoryUsagePercent}%`}</p>
                </div>

              </div>
            )}
            {resources.status === "success" && !resourceSummary && (
              <p className="font-song-myung text-sm text-admin-muted">수집된 리소스 정보가 없습니다.</p>
            )}
          </section>
        </>
      )}

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
