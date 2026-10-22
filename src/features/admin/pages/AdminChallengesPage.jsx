import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forceResetInstance, forceStopInstance, getAdminChallenges, getAdminInstances, setChallengeVisibility } from "../../../api/admin.js";
import { INSTANCE_STATUS } from "../../../constants/enums.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { formatResourceAmount } from "../utils/adminNodeAllocation.js";
import { canForceStop } from "../utils/adminAttention.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { IconButton } from "../components/AdminWidgets.jsx";
import AdminPagination from "../components/AdminPagination.jsx";
import AdminDialog from "../components/AdminDialog.jsx";
import AdminChallengeCreateDialog from "../components/AdminChallengeCreateDialog.jsx";
import AdminChallengeManageDialog from "../components/AdminChallengeManageDialog.jsx";
import AdminPublicationImportDialog from "../components/AdminPublicationImportDialog.jsx";
import AdminTabs from "../components/AdminTabs.jsx";
import AdminBoardReadiness from "../components/AdminBoardReadiness.jsx";
import { AdminReasonField, AdminSwitch } from "../components/AdminFormParts.jsx";
import { REASON_PRESETS } from "../utils/adminReasons.js";
import styles from "../components/AdminWorkspace.module.css";
import { ADMIN_CHALLENGE_CATEGORIES } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";

const BUTTON = styles.button;
const SELECT = styles.select;

// 배포 상태 칸: 버전 알약(초록 점이면 참가자에게 나가는 중), 새 발행본 대기 꼬리표, 실행 환경 한 줄
function DeploymentSummary({ deployment }) {
  if (!deployment) return <span className={styles.deployCell}>
    <span className={styles.deployTop}><span className={styles.deployPill} data-state="none">파일만</span></span>
    <span className={styles.deployMeta}>실행 환경 없이 파일만 제공</span>
  </span>;
  const runtime = { KUBERNETES: "Kubernetes", DOCKER: "Docker", VM: "VM" }[deployment.runtime_type] ?? deployment.runtime_type;
  const profile = deployment.resource_profile ?? {};
  const latest = deployment.latest_release;
  const newer = latest && latest.version > deployment.version ? latest : null;
  return <span className={styles.deployCell}>
    <span className={styles.deployTop}>
      <span className={styles.deployPill} data-state={deployment.is_current ? "live" : "idle"} title={deployment.is_current ? "새 인스턴스에 적용 중" : "아직 적용 전"}>
        <i aria-hidden="true" />v{deployment.version}</span>
      <span className={styles.deployState}>{deployment.is_current ? "사용 중" : "적용 전"}</span>
      {newer && <span className={styles.deployNew} title={`발행 #${newer.registry_revision ?? "-"}`}>새 버전 v{newer.version}</span>}
    </span>
    <span className={styles.deployMeta}>{[runtime, deployment.architecture, `컨테이너 ${deployment.containers?.length ?? 0}`].filter(Boolean).join(" · ")}</span>
    <span className={styles.deployMeta}>{[profile.cpu_millicores != null && formatResourceAmount(profile.cpu_millicores, "cpu_millicores"), profile.memory_mib != null && formatResourceAmount(profile.memory_mib, "memory_mib")].filter(Boolean).join(" · ") || "자원 정보 없음"}</span>
  </span>;
}

function InstancesSection({ initialStatus = "" }) {
  const [filter, setFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const instances = useAdminResource((config) => getAdminInstances({ status: filter || undefined, page, size: 50 }, config), [filter, page], "인스턴스 목록을 불러오지 못했습니다");
  useEffect(() => {
    return startVisiblePolling(() => {
      if (!pending.current) return instances.reload();
    }, { intervalMs: 10000, immediate: false });
  }, [instances.reload]);

  async function runAction() {
    if (pending.current || !confirmation) return;
    pending.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await (confirmation.kind === "reset" ? forceResetInstance : forceStopInstance)(confirmation.instance.instance_id);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "요청이 처리되지 않았습니다");
      setConfirmation(null);
      const refreshed = await instances.reload();
      setNotice(refreshed ? "요청이 접수되었습니다 상태가 자동으로 갱신됩니다" : "요청은 접수됐지만 최신 상태를 조회하지 못했습니다");
    } catch (error) { setNotice(error?.response?.data?.message || error.message || "요청이 처리되지 않았습니다"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section>
    <div className={styles.toolbar}>
      <label>상태 <select value={filter} disabled={busy} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className={SELECT}>
        <option value="">전체</option>{Object.values(INSTANCE_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}
      </select></label>
      <button type="button" onClick={instances.retry} disabled={busy || instances.status === "loading"} className={BUTTON}>인스턴스 새로고침</button><span className={styles.cardMeta}>10초마다 자동 갱신</span>
    </div>
    <AdminStatusMessage status={instances.status} error={instances.error} onRetry={instances.retry} hasData={Boolean(instances.data)}/>
    {notice && <p role="status" className={styles.callout}>{notice}</p>}
    {instances.data && <div className={`${styles.tableWrap} ${styles.instanceStack}`}>
      <table className={styles.table} aria-label="인스턴스 목록"><thead><tr>{["팀", "문제", "상태", "만료 (KST)", "조치"].map((text) => <th key={text}>{text}</th>)}</tr></thead>
        <tbody>{(instances.data?.instances ?? []).map((instance) => <tr key={instance.instance_id}>
          <td><span className={styles.title}>{instance.team_name}</span><details className={styles.secondary}><summary className={styles.idSummary}>인스턴스 ID</summary><span className={`${styles.mono} ${styles.idValue}`}>{instance.instance_id}</span></details></td>
          <td className={styles.wrap}>{instance.challenge_title}</td><td><AdminBadge tone={instance.status === "FAILED" ? "bad" : instance.status === "RUNNING" ? "good" : "neutral"}>{instance.status}</AdminBadge></td>
          <td className={styles.time}>{formatAdminTime(instance.expires_at)}</td>
          <td>{canForceStop(instance) ? <div className={styles.rowActions}>
            {instance.status === "RUNNING" && <button type="button" className={`${BUTTON} ${styles.small}`} disabled={busy} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "reset" }); }}>강제 재시작</button>}
            <button type="button" className={`${BUTTON} ${styles.small} ${styles.danger}`} disabled={busy} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "stop" }); }}>강제 종료</button>
          </div> : <span className={styles.muted}>-</span>}</td>
        </tr>)}</tbody>
      </table>
      {instances.data?.instances?.length === 0 && <p className={styles.empty}>표시할 인스턴스가 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={instances.data?.total_count} onChange={setPage} disabled={busy || instances.status !== "success"}/>
    {confirmation && <AdminDialog title={confirmation.kind === "reset" ? "인스턴스 강제 재시작" : "인스턴스 강제 종료"} onClose={() => setConfirmation(null)} busy={busy}>
      <p className={styles.dialogLead}><strong>{confirmation.instance.team_name}</strong> · {confirmation.instance.challenge_title}</p>
      <p className={`${styles.mono} ${styles.dialogId}`}>{confirmation.instance.instance_id}</p>
      <p className={styles.callout} data-tone="bad">선택한 인스턴스의 현재 접속이 종료됩니다</p>
      {notice && <p role="alert" className={styles.errorText}>{notice}</p>}
      <div className={styles.formActions}>
        <button type="button" onClick={() => setConfirmation(null)} disabled={busy} className={BUTTON}>취소</button>
        <button type="button" onClick={runAction} disabled={busy} className={styles.dangerSolid}>{confirmation.kind === "reset" ? "재시작 실행" : "종료 실행"}</button>
      </div>
    </AdminDialog>}
  </section>;
}

export default function AdminChallengesPage() {
  // 대시보드 지표에서 ?tab=instances&status=FAILED 로 바로 들어온다
  const [params] = useSearchParams();
  const initialStatus = Object.values(INSTANCE_STATUS).includes(params.get("status")) ? params.get("status") : "";
  const [tab, setTab] = useState(params.get("tab") === "instances" ? "instances" : "challenges");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("running");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const challenges = useAdminResource((config) => getAdminChallenges({ category: category || undefined, sort, page, size: 50 }, config), [category, sort, page], "문제 목록을 불러오지 못했습니다");
  async function saveVisibility(event) {
    event.preventDefault();
    if (pending.current || !selected || !reason.trim() || reason.trim().length > 500) return;
    pending.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await setChallengeVisibility(selected.challenge_id, { isPublished: !selected.is_published, reason: reason.trim() });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "공개 상태 변경에 실패했습니다");
      setSelected(null);
      const refreshed = await challenges.reload();
      setNotice(refreshed ? "공개 상태를 변경했습니다" : "변경은 처리됐지만 최신 목록을 조회하지 못했습니다");
    } catch (error) { setNotice(error?.response?.data?.message || (error?.response?.status === 404 ? "현재 서버에서 공개 상태 변경을 제공하지 않습니다" : error.message)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <AdminLayout title="문제 · 인스턴스">
    <AdminTabs idPrefix="challenge-management" label="문제 관리 메뉴" value={tab} onChange={setTab} disabled={busy}
      items={[{ id: "challenges", label: "문제 목록" }, { id: "instances", label: "인스턴스" }]}/>
    <section role="tabpanel" id="challenge-management-panel-challenges" aria-labelledby="challenge-management-tab-challenges" hidden={tab !== "challenges"} className={styles.panel}>
    <AdminBoardReadiness revision={challenges.data}/>
    <div className={styles.toolbar}>
      <label>분야 <select value={category} className={SELECT} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
        <option value="">전체</option>{ADMIN_CHALLENGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>정렬 <select value={sort} className={SELECT} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
        <option value="running">실행 수</option><option value="title">이름</option><option value="score">배점</option>
      </select></label>
      <div className={styles.rowActions}>
        <IconButton icon="refresh" label="새로고침" onClick={challenges.retry} disabled={busy || challenges.status === "loading"} />
        <button type="button" onClick={() => setCreating(true)} disabled={busy} className={BUTTON}>직접 등록</button>
        <button type="button" onClick={() => setImporting(true)} disabled={busy} className={styles.primary}>GitHub에서 가져오기</button>
      </div>
    </div>
    <AdminStatusMessage status={challenges.status} error={challenges.error} onRetry={challenges.retry} hasData={Boolean(challenges.data)}/>
    {notice && <p role="status" className={styles.callout}>{notice}</p>}
    {challenges.data && <div className={`${styles.tableWrap} ${styles.challengeStack}`}>
      <table className={styles.table} aria-label="문제 목록"><thead><tr>{["문제", "배점 · 풀이", "인스턴스", "공개 상태", "배포 상태", "관리"].map((text) => <th key={text}>{text}</th>)}</tr></thead>
        <tbody>{(challenges.data?.challenges ?? []).map((challenge) => <tr key={challenge.challenge_id}>
          <td><span className={styles.title}>{challenge.title}</span><span className={styles.secondary}>{challenge.category} · {challenge.difficulty === "UNASSIGNED" ? "난이도 미정" : challenge.difficulty}</span></td>
          <td>{formatAdminNumber(challenge.score)}점<button type="button" className={styles.solveCountLink} disabled={busy}
            aria-label={`${challenge.title} 풀이 기록 ${challenge.solved_team_count}팀`}
            onClick={() => setEditing({ challenge, section: "solves" })}>{challenge.solved_team_count}팀 해결</button></td>
          <td>{challenge.running_instance_count}개 실행{challenge.failed_instance_count > 0 && <span className={styles.failedCount}>실패 {challenge.failed_instance_count}</span>}</td>
          <td><span className={styles.publishCell}>
            <AdminSwitch checked={challenge.is_published} disabled={busy} label={`${challenge.title} ${challenge.is_published ? "비공개로 전환" : "공개로 전환"}`}
              onChange={() => { setSelected(challenge); setReason(""); setNotice(""); }} />
            <span data-on={challenge.is_published || undefined}>{challenge.is_published ? "공개" : "비공개"}</span>
          </span></td>
          <td className={styles.deploymentCell}><DeploymentSummary deployment={challenge.deployment}/></td>
          <td><div className={styles.rowActions}><button type="button" className={BUTTON} disabled={busy} aria-label={challenge.title + " 설정"} onClick={() => setEditing({ challenge, section: "problem" })}>설정 열기</button><Link className={styles.fileLink} to={`/admin/challenges/${challenge.challenge_id}/preview`} target="_blank" rel="noreferrer" aria-label={`${challenge.title} 미리보기`}>미리보기 ↗</Link></div></td>
        </tr>)}</tbody>
      </table>
      {challenges.data?.challenges?.length === 0 && <p className={styles.empty}>표시할 문제가 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={challenges.data?.total_count} onChange={setPage} disabled={busy || challenges.status !== "success"}/>
    </section>
    <section role="tabpanel" id="challenge-management-panel-instances" aria-labelledby="challenge-management-tab-instances" hidden={tab !== "instances"} className={styles.panel}>
      {tab === "instances" && <InstancesSection initialStatus={initialStatus}/>}
    </section>
    {selected && <AdminDialog title={selected.is_published ? "비공개로 전환" : "공개로 전환"} onClose={() => setSelected(null)} busy={busy}>
      <p className={styles.dialogLead}><strong>{selected.title}</strong> {selected.is_published
        ? "참가자는 문제를 볼 수 없고 새 인스턴스도 만들 수 없습니다 이미 연 팀의 진행은 유지됩니다"
        : "참가자가 문제를 보고 인스턴스를 만들 수 있게 됩니다"}</p>
      <form onSubmit={saveVisibility} className={styles.formStack}>
        <AdminReasonField label="사유" note="1~500자" value={reason} onChange={setReason} disabled={busy} required autoFocus
          presets={selected.is_published ? REASON_PRESETS.unpublish : REASON_PRESETS.publish} />
        {notice && <p role="alert" className={styles.errorText}>{notice}</p>}
        <div className={styles.formActions}>
          <button type="button" onClick={() => setSelected(null)} disabled={busy} className={BUTTON}>취소</button>
          <button type="submit" disabled={busy || !reason.trim()} className={selected.is_published ? styles.dangerSolid : styles.primary}>
            {selected.is_published ? "비공개로 전환" : "공개하기"}</button>
        </div>
      </form>
    </AdminDialog>}
    {creating && <AdminChallengeCreateDialog
      onClose={() => setCreating(false)}
      onCreated={async (created) => {
        setNotice("문제를 비공개로 등록했습니다 실행 설정을 이어서 확인해주세요");
        setEditing({ challenge: created, section: "deployment" });
        const refreshed = await challenges.reload();
        if (!refreshed) setNotice("등록은 처리됐지만 최신 목록을 조회하지 못했습니다");
      }}
    />}
    {importing && <AdminPublicationImportDialog onClose={() => setImporting(false)} onImported={challenges.reload}
      onOpenSettings={(challenge) => {
        setImporting(false);
        setEditing({ challenge, section: challenge.release_id ? "deployment" : "problem", releaseId: challenge.release_id });
      }}/>}
    {editing && <AdminChallengeManageDialog key={editing.challenge.challenge_id} challenge={editing.challenge} initialSection={editing.section} initialReleaseId={editing.releaseId}
      onClose={() => setEditing(null)} onChanged={challenges.reload}/>}
  </AdminLayout>;
}
