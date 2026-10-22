import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusSymbol } from "../components/AdminGlyph.jsx";
import { Link } from "react-router-dom";
import {
  adjustMileage,
  forceStopInstance,
  getAdminDashboard,
  getAdminEvents,
  getAdminInstances,
  getTeamSnapshots,
  rollbackTeam,
} from "../../../api/admin.js";
import { getLeaderboard } from "../../../api/leaderboard.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import Modal from "../components/AdminDialog.jsx";
import AdminNodeBoard from "../components/AdminNodeBoard.jsx";
import { ActionGrid, ActionTile, ContestWidget, IconButton, StatStrip, StatTile, Widget } from "../components/AdminWidgets.jsx";
import AdminTeamPicker from "../components/AdminTeamPicker.jsx";
import { AdminReasonField } from "../components/AdminFormParts.jsx";
import { REASON_PRESETS } from "../utils/adminReasons.js";
import useAdminNodeResources from "../hooks/useAdminNodeResources.js";
import intro from "./AdminDashboardPage.module.css";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import { getAdminEventSeverity, getAdminEventTypeLabel } from "../utils/adminBoard.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { ATTENTION_QUERIES, canForceStop, describeAttention, summarizeAttention } from "../utils/adminAttention.js";
import { RECENT_LIMIT, latestFirst } from "../utils/adminLists.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import AdminMileageAdjustForm from "../components/AdminMileageAdjustForm.jsx";
import ui from "../components/AdminWorkspace.module.css";

// 운영 대시보드: 당일 운영자가 노트북에서 보는 첫 화면
// 대회 시간과 지표 6칸, 노드 현황, 실패·지연 인스턴스, 최근 기록, 빠른 작업이 노트북 한 화면에 들어간다
// 위젯은 안쪽에서 스크롤하지 않고 정해진 줄 수만 보인다 나머지는 "모두 보기"로 넘긴다
// 재시작과 종료는 인스턴스 ID를 적는 모달 대신 실패·지연 인스턴스 줄과 인스턴스 목록에서 바로 누른다
// 마일리지 지급과 롤백은 대상을 고르는 작은 모달로 남긴다

const count = (value) => (value == null ? "-" : formatAdminNumber(value));

// 실패했거나 준비 단계에 5분 넘게 머문 인스턴스를 팀·문제·원인·경과로 늘어놓고 줄 안에서 바로 종료한다
const ATTENTION_ROWS = 4;

// 전체 목록 첫 쪽만 읽으면 실패가 뒤로 밀려 덜 센다 상태마다 따로 묻고 건수는 total_count로 맞춘다
async function loadAttentionInstances(config) {
  const responses = await Promise.all(ATTENTION_QUERIES.map(({ status, size }) => getAdminInstances({ status, size }, config)));
  const pages = responses.map((response, index) => {
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "인스턴스 현황을 불러오지 못했습니다");
    return { status: ATTENTION_QUERIES[index].status, instances: response.data.data?.instances, total_count: response.data.data?.total_count };
  });
  return { data: { code: "SUCCESS", data: { pages } } };
}

function AttentionInstances({ instances, onChanged, className = "" }) {
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");
  const summary = useMemo(() => summarizeAttention(instances.data?.pages), [instances.data]);
  const rows = summary.rows.slice(0, ATTENTION_ROWS);
  const hidden = summary.count - rows.length;
  const now = Date.now();

  async function stop(instance) {
    setBusyId(instance.instance_id);
    setNotice("");
    try {
      const response = await forceStopInstance(instance.instance_id);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "종료 요청이 처리되지 않았습니다");
      setConfirm(null);
      await onChanged();
    } catch (error) {
      setNotice(getAdminRequestError(error, "종료 요청이 처리되지 않았습니다").error);
    } finally {
      setBusyId(null);
    }
  }

  return <Widget id="dashboard-attention" title="실패·지연 인스턴스" className={className} flush
    count={instances.data ? summary.count : undefined} meta={summary.partial ? "일부만 집계" : undefined}
    more={{ to: `${ROUTES.adminChallenges}?tab=instances`, label: hidden > 0 ? `${hidden}건 더 보기` : "모두 보기" }}>
    <div className={intro.inset}><AdminStatusMessage status={instances.status} error={instances.error} onRetry={instances.retry} hasData={Boolean(instances.data)} /></div>
    {notice && <p role="alert" className={`${ui.callout} ${ui.calloutInset}`} data-tone="bad">{notice}</p>}
    {instances.data && rows.length === 0 && (summary.partial
      ? <p className={intro.allClear}>목록이 길어 일부만 확인했습니다 인스턴스 목록에서 확인해주세요</p>
      : <p className={intro.allClear}><StatusSymbol tone="good" />실패하거나 멈춘 인스턴스가 없습니다</p>)}
    {rows.length > 0 && <ul className={intro.attention} aria-label="실패·지연 인스턴스">{rows.map((instance) => {
      const why = describeAttention(instance, now);
      const busy = busyId === instance.instance_id;
      return <li key={instance.instance_id}>
        <span className={intro.who}><strong>{instance.team_name || "-"}</strong><span>{instance.challenge_title || "-"}</span></span>
        <span className={intro.why}><AdminBadge tone={why.kind === "failed" ? "bad" : "warn"}>{why.label}</AdminBadge><span>{why.age}</span></span>
        {canForceStop(instance)
          ? <button type="button" className={`${ui.button} ${ui.small} ${ui.danger}`} disabled={busy || Boolean(busyId)} onClick={() => setConfirm(instance)}>종료</button>
          : <Link to={`${ROUTES.adminChallenges}?tab=instances&status=FAILED`} className={`${ui.button} ${ui.small}`}>보기</Link>}
      </li>;
    })}</ul>}
    {confirm && <Modal title="인스턴스 강제 종료" onClose={() => setConfirm(null)} busy={Boolean(busyId)}>
      <p className={ui.dialogLead}><strong>{confirm.team_name}</strong> · {confirm.challenge_title}</p>
      <p className={ui.callout} data-tone="bad">참가자의 현재 접속이 끊기고 인스턴스가 정리됩니다</p>
      <div className={ui.formActions}>
        <button type="button" onClick={() => setConfirm(null)} disabled={Boolean(busyId)} className={ui.button}>취소</button>
        <button type="button" onClick={() => stop(confirm)} disabled={Boolean(busyId)} className={ui.dangerSolid}>종료 실행</button>
      </div>
    </Modal>}
  </Widget>;
}

function MileageGrantModal({ onClose, onDone }) {
  const teamOptions = useAdminTeamOptions();
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal title="마일리지 지급 · 회수" onClose={onClose} busy={submitting}>
      <AdminStatusMessage status={teamOptions.status} error={teamOptions.error} onRetry={teamOptions.retry}/>
      <AdminMileageAdjustForm teams={teamOptions.data?.teams ?? []} teamsLoading={teamOptions.status === "loading"} teamsCapped={teamOptions.data?.capped}
        disabled={teamOptions.status !== "success"}
        actions={<button type="button" onClick={onClose} disabled={submitting} className={ui.button}>취소</button>}
        submit={async ({ teamId, amount, reason, idempotencyKey }) => {
          setSubmitting(true);
          try {
            const res = await adjustMileage(teamId, { amount, reason, idempotencyKey });
            if (!isSuccess(res.data)) throw new Error(res.data?.message || "마일리지 조정에 실패했습니다");
            onDone();
            onClose();
            return true;
          } finally {
            setSubmitting(false);
          }
        }} />
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
        setSnapshotState({ status: "success", teamId, total: response.data.data.total_count });
      }
    }).catch((requestError) => {
      if (active) { setSnapshotState({ status: "error", teamId }); setError(getAdminRequestError(requestError, "롤백 지점을 조회하지 못했습니다").error); }
    });
    return () => { active = false; controller.abort(); };
  }, [teamId, snapshotRevision]);

  // 롤백 지점 API는 쪽 나눔이 없어 최근 것부터 20개만 보인다
  const recentSnapshots = latestFirst(snapshots, RECENT_LIMIT).items;
  const snapshotTotal = Math.max(snapshotState.total ?? 0, snapshots.length);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !teamId || snapshotState.teamId !== teamId || !snapshots.some((item) => item.snapshot_id === snapshotId && !item.is_rolled_back) || !reason.trim() || reason.trim().length > 500) return;
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await rollbackTeam(teamId, { snapshotId, reason: reason.trim() });
      if (!isSuccess(res.data)) throw new Error(res.data?.message || "롤백에 실패했습니다");
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
        <div className={ui.field}>
          <span className={ui.fieldLabel}>대상 팀</span>
          <AdminTeamPicker teams={teams} value={teamId} label="롤백할 팀" disabled={isSubmitting} loading={teamOptions.status === "loading"} capped={teamOptions.data?.capped}
            onChange={(next) => { setTeamId(next); setSnapshotId(""); setSnapshots([]); }} />
        </div>
        {teamId && (
          <div className={ui.field}>
            <span className={ui.fieldLabel}>롤백 지점</span>
            {snapshotState.status === "loading" && <p role="status" className={ui.fieldHint}>롤백 지점 조회 중</p>}
            {snapshotState.status === "error" && <button type="button" className={`${ui.button} ${ui.small}`} onClick={() => setSnapshotRevision((value) => value + 1)}>다시 조회</button>}
            {snapshotState.status === "success" && snapshots.length === 0 && <p className={ui.fieldHint}>롤백 지점이 없습니다</p>}
            {snapshots.length > 0 && (
              <div className={ui.choiceList}>
                {recentSnapshots.map((snapshot) => (
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
            {snapshotTotal > RECENT_LIMIT && <p className={ui.fieldHint}>최근 {RECENT_LIMIT}개만 표시합니다 · 전체 {formatAdminNumber(snapshotTotal)}개</p>}
          </div>
        )}
        <AdminReasonField label="사유" value={reason} onChange={setReason} presets={REASON_PRESETS.rollback} disabled={isSubmitting} required />
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
  const dashboard = useAdminResource(getAdminDashboard, [], "대시보드 정보를 불러오지 못했습니다");
  const events = useAdminResource((config) => getAdminEvents({ size: 5 }, config), [], "이벤트 로그를 불러오지 못했습니다");
  const instances = useAdminResource(loadAttentionInstances, [], "인스턴스 현황을 불러오지 못했습니다");
  const resources = useAdminNodeResources();
  const leaderboard = useAdminResource((config) => getLeaderboard(config), [], "순위를 불러오지 못했습니다");
  const [openModal, setOpenModal] = useState(null);

  const data = dashboard.data;
  const eventRows = events.data?.events ?? [];

  const reloadAll = useCallback(() => Promise.all([
    dashboard.reload(), events.reload(), instances.reload(), resources.reload(), leaderboard.reload(),
  ]), [dashboard.reload, events.reload, instances.reload, resources.reload, leaderboard.reload]);
  useEffect(() => {
    if (openModal) return undefined;
    // Resource hooks perform the initial reads. Only schedule subsequent reads.
    return startVisiblePolling(() => Promise.all([dashboard.reload(), events.reload(), instances.reload(), leaderboard.reload()]), { immediate: false });
  }, [dashboard.reload, events.reload, instances.reload, leaderboard.reload, openModal]);

  const refreshing = [dashboard, events, instances, leaderboard].some((item) => item.status === "loading");
  const leader = [...(leaderboard.data?.teams ?? [])].sort((a, b) => (b.team_score ?? 0) - (a.team_score ?? 0))[0];
  const failed = data?.instances?.failed ?? 0;
  const payment = data?.payment;

  return (
    <AdminLayout title="운영 대시보드" actions={<>
      <span className={ui.cardMeta}>30초마다 갱신 · 수집 {formatAdminTime(data?.collected_at)}</span>
      <IconButton icon="refresh" label="새로고침" onClick={reloadAll} disabled={refreshing} />
    </>}>
      <AdminStatusMessage status={dashboard.status} error={dashboard.error} onRetry={dashboard.retry} hasData={Boolean(data)} />

      <div className={intro.board}>
        <ContestWidget contest={data?.contest} className={intro.contestArea} to={ROUTES.adminSettings} />
        <StatStrip label="운영 지표" className={intro.metricsArea}>
          <StatTile glyph="instance" tone="green" label="실행 인스턴스" value={count(data?.instances?.running)} to={`${ROUTES.adminChallenges}?tab=instances&status=RUNNING`} />
          <StatTile glyph="warning" tone="red" label="실패 인스턴스" value={count(data?.instances?.failed)} alert={failed > 0} to={`${ROUTES.adminChallenges}?tab=instances&status=FAILED`} />
          <StatTile glyph="teams" tone="indigo" label="참가 팀" value={count(data?.teams?.total_count)} sub={data?.teams?.banned_count ? `밴 ${count(data.teams.banned_count)}팀` : ""} to={ROUTES.adminTeams} />
          <StatTile glyph="rank" tone="yellow" label="선두" value={leader?.team_name ?? "-"} text sub={leader ? `${count(leader.team_score)}점` : ""} to={leader ? ROUTES.adminTeamDetail(leader.team_id) : ROUTES.adminTeams} />
          <StatTile glyph="payment" tone="orange" label="부스 결제" value={count(payment?.net_spent)} unit={payment ? "MI" : undefined} sub={payment ? `${count(payment.purchase_count)}건 · 환불 ${count(payment.refund_count)}건` : ""} to={`${ROUTES.adminMileage}?tab=payment`} />
        </StatStrip>
        <AdminNodeBoard resources={resources} className={intro.nodesArea} />
        <AttentionInstances instances={instances} onChanged={reloadAll} className={intro.attentionArea} />
        <Widget id="dashboard-events" title="최근 운영 기록" className={intro.eventsArea} more={{ to: ROUTES.adminLogs }}>
          <AdminStatusMessage status={events.status} error={events.error} onRetry={events.retry} hasData={Boolean(events.data)} />
          <ul className={intro.events}>{eventRows.slice(0, 4).map((event) => <li key={event.event_id}>
            <time dateTime={event.created_at}>{formatAdminTime(event.created_at)}</time>
            <AdminBadge tone={getAdminEventSeverity(event.severity).tone}>{getAdminEventTypeLabel(event.type)}</AdminBadge>
            <p title={event.message}>{event.message}</p>
          </li>)}</ul>
          {events.data && eventRows.length === 0 && <p className={ui.quietNote}>아직 운영 기록이 없습니다</p>}
        </Widget>
        <Widget id="dashboard-actions" title="빠른 작업" className={intro.actionsArea}>
          <ActionGrid label="빠른 작업">
            <ActionTile glyph="mileage" tone="yellow" label="마일리지 지급" onClick={() => setOpenModal("mileage")} />
            <ActionTile glyph="rollback" tone="indigo" label="롤백 실행" onClick={() => setOpenModal("rollback")} />
            <ActionTile glyph="payment" tone="orange" label="QR 결제" to={`${ROUTES.adminMileage}?tab=payment`} />
            <ActionTile glyph="account" tone="blue" label="계정 등록" to={ROUTES.adminAccounts} />
            <ActionTile glyph="stop" tone="red" label="인스턴스 종료" to={`${ROUTES.adminChallenges}?tab=instances&status=RUNNING`} />
            <ActionTile glyph="ban" tone="graphite" label="팀 밴 처리" to={ROUTES.adminTeams} />
            <ActionTile glyph="publish" tone="green" label="문제 공개" to={ROUTES.adminChallenges} />
            <ActionTile glyph="settings" tone="gray" label="대회 설정" to={ROUTES.adminSettings} />
          </ActionGrid>
        </Widget>
      </div>

      {openModal === "mileage" && <MileageGrantModal onClose={() => setOpenModal(null)} onDone={reloadAll} />}
      {openModal === "rollback" && <RollbackModal onClose={() => setOpenModal(null)} onDone={reloadAll} />}
    </AdminLayout>
  );
}
