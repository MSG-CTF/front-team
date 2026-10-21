import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { forceResetInstance, forceStopInstance, getAdminChallenges, getAdminInstances, setChallengeVisibility } from "../../../api/admin.js";
import { INSTANCE_STATUS } from "../../../constants/enums.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import AdminPagination from "../components/AdminPagination.jsx";
import AdminDialog from "../components/AdminDialog.jsx";
import AdminChallengeCreateDialog from "../components/AdminChallengeCreateDialog.jsx";
import AdminChallengeManageDialog from "../components/AdminChallengeManageDialog.jsx";
import AdminPublicationImportDialog from "../components/AdminPublicationImportDialog.jsx";
import AdminTabs from "../components/AdminTabs.jsx";
import AdminBoardReadiness from "../components/AdminBoardReadiness.jsx";
import styles from "../components/AdminWorkspace.module.css";
import { ADMIN_CHALLENGE_CATEGORIES } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";

const BUTTON = styles.button;
const SELECT = styles.select;

function DeploymentSummary({ deployment }) {
  if (!deployment) return <span className={styles.secondary}>실행 설정 없음</span>;
  const runtime = { KUBERNETES: "Kubernetes", DOCKER: "Docker", VM: "VM" }[deployment.runtime_type] ?? deployment.runtime_type;
  return <div className={styles.deploymentSummary}>
    <span>{deployment.is_current ? `v${deployment.version} 적용 중` : `v${deployment.version} 미적용`} · {runtime} · {deployment.architecture}</span>
    <span>컨테이너 {deployment.containers.length}개 · CPU {deployment.resource_profile.cpu_millicores}m · {deployment.resource_profile.memory_mib}MiB</span>
  </div>;
}

function InstancesSection() {
  const [filter, setFilter] = useState("");
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
      setNotice(refreshed ? "요청이 접수되었습니다. 상태가 자동으로 갱신됩니다" : "요청은 접수됐지만 최신 상태를 조회하지 못했습니다");
    } catch (error) { setNotice(error?.response?.data?.message || error.message || "요청이 처리되지 않았습니다"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section>
    <p className={styles.panelIntro}>실행 중인 팀과 문제를 확인합니다 상태는 10초마다 갱신됩니다</p>
    <div className={styles.toolbar}>
      <label>상태 <select value={filter} disabled={busy} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className={SELECT}>
        <option value="">전체</option>{Object.values(INSTANCE_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}
      </select></label>
      <button type="button" onClick={instances.retry} disabled={busy || instances.status === "loading"} className={BUTTON}>인스턴스 새로고침</button>
    </div>
    <AdminStatusMessage status={instances.status} error={instances.error} onRetry={instances.retry}/>
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {instances.status === "success" && <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="인스턴스 목록"><thead><tr>{["팀", "문제", "상태", "만료 (KST)", "조치"].map((text) => <th key={text}>{text}</th>)}</tr></thead>
        <tbody>{(instances.data?.instances ?? []).map((instance) => <tr key={instance.instance_id} className="border-t border-admin-divider/40">
          <td><span className={styles.title}>{instance.team_name}</span><details className={styles.secondary}><summary className="cursor-pointer">인스턴스 ID</summary><span className="block select-all font-kode-mono text-xs">{instance.instance_id}</span></details></td>
          <td className="p-3">{instance.challenge_title}</td><td className="p-3"><AdminBadge tone={instance.status === "FAILED" ? "bad" : instance.status === "RUNNING" ? "good" : "neutral"}>{instance.status}</AdminBadge></td>
          <td className="p-3">{instance.expires_at ? toKst(instance.expires_at) : "-"}</td>
          <td className="p-3"><div className="flex gap-2">
            <button type="button" className={BUTTON} disabled={busy || instance.status !== "RUNNING"} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "reset" }); }}>강제 재시작</button>
            <button type="button" className={BUTTON + " " + styles.danger} disabled={busy || instance.status !== "RUNNING"} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "stop" }); }}>강제 종료</button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {instances.data?.instances?.length === 0 && <p className="p-4 text-center">표시할 인스턴스가 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={instances.data?.total_count} onChange={setPage} disabled={busy || instances.status !== "success"}/>
    {confirmation && <AdminDialog title={confirmation.kind === "reset" ? "인스턴스 강제 재시작" : "인스턴스 강제 종료"} onClose={() => setConfirmation(null)} busy={busy}>
      <p className="mb-2">{confirmation.instance.team_name} / {confirmation.instance.challenge_title}</p>
      <p className="mb-4 break-all font-kode-mono text-xs">{confirmation.instance.instance_id}</p>
      <p className="mb-4 text-sm">선택한 인스턴스의 현재 접속이 종료됩니다</p>
      {notice && <p role="alert">{notice}</p>}
      <button type="button" onClick={runAction} disabled={busy} className={BUTTON}>실행 확인</button>
    </AdminDialog>}
  </section>;
}

export default function AdminChallengesPage() {
  const [tab, setTab] = useState("challenges");
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
  return <AdminLayout title="문제 관리" className={styles.workspace}>
    <AdminTabs idPrefix="challenge-management" label="문제 관리 메뉴" value={tab} onChange={setTab} disabled={busy}
      items={[{ id: "challenges", label: "문제 목록" }, { id: "instances", label: "인스턴스" }]}/>
    <section role="tabpanel" id="challenge-management-panel-challenges" aria-labelledby="challenge-management-tab-challenges" hidden={tab !== "challenges"} className={styles.panel}>
    <AdminBoardReadiness revision={challenges.data}/>
    <p className={styles.panelIntro}>출제자가 GitHub에 반영하면 CI 발행본을 백엔드가 수집합니다 문제의 배포 설정에서 새 버전을 확인하고 적용할 수 있습니다</p>
    <div className={styles.toolbar}>
      <label>분야 <select value={category} className={SELECT} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
        <option value="">전체</option>{ADMIN_CHALLENGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>정렬 <select value={sort} className={SELECT} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
        <option value="running">실행 수</option><option value="title">이름</option><option value="score">배점</option>
      </select></label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={challenges.retry} disabled={busy || challenges.status === "loading"} className={BUTTON}>새로고침</button>
        <button type="button" onClick={() => setCreating(true)} disabled={busy} className={BUTTON}>직접 등록</button>
        <button type="button" onClick={() => setImporting(true)} disabled={busy} className={styles.primary}>GitHub에서 가져오기</button>
      </div>
    </div>
    <AdminStatusMessage status={challenges.status} error={challenges.error} onRetry={challenges.retry}/>
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {challenges.status === "success" && <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="문제 목록"><thead><tr>{["문제", "배점 · 풀이", "인스턴스", "공개 상태", "배포 상태", "관리"].map((text) => <th key={text}>{text}</th>)}</tr></thead>
        <tbody>{(challenges.data?.challenges ?? []).map((challenge) => <tr key={challenge.challenge_id} className="border-t border-admin-divider/40">
          <td><span className={styles.title}>{challenge.title}</span><span className={styles.secondary}>{challenge.category} · {challenge.difficulty === "UNASSIGNED" ? "난이도 미정" : challenge.difficulty}</span></td>
          <td>{challenge.score}점<button type="button" className={styles.solveCountLink} disabled={busy}
            aria-label={`${challenge.title} 풀이 기록 ${challenge.solved_team_count}팀`}
            onClick={() => setEditing({ challenge, section: "solves" })}>{challenge.solved_team_count}팀 해결</button></td>
          <td>{challenge.running_instance_count} {challenge.failed_instance_count > 0 && <span className="text-admin-failed">(실패 {challenge.failed_instance_count})</span>}</td>
          <td><button type="button" disabled={busy} aria-label={challenge.title + " 공개 상태 변경"} onClick={() => { setSelected(challenge); setReason(""); setNotice(""); }}><AdminBadge tone={challenge.is_published ? "good" : "neutral"}>{challenge.is_published ? "공개" : "비공개"}</AdminBadge></button></td>
          <td className={styles.deploymentCell}><DeploymentSummary deployment={challenge.deployment}/></td>
          <td><div className={styles.rowActions}><button type="button" className={BUTTON} disabled={busy} aria-label={challenge.title + " 설정"} onClick={() => setEditing({ challenge, section: "problem" })}>설정 열기</button><Link className={styles.fileLink} to={`/admin/challenges/${challenge.challenge_id}/preview`} target="_blank" rel="noreferrer" aria-label={`${challenge.title} 미리보기`}>미리보기 ↗</Link></div></td>
        </tr>)}</tbody>
      </table>
      {challenges.data?.challenges?.length === 0 && <p className="p-4 text-center">표시할 문제가 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={challenges.data?.total_count} onChange={setPage} disabled={busy || challenges.status !== "success"}/>
    </section>
    <section role="tabpanel" id="challenge-management-panel-instances" aria-labelledby="challenge-management-tab-instances" hidden={tab !== "instances"} className={styles.panel}>
      {tab === "instances" && <InstancesSection/>}
    </section>
    {selected && <AdminDialog title="문제 공개 상태 변경" onClose={() => setSelected(null)} busy={busy}>
      <p className="mb-4">{selected.title}: {selected.is_published ? "공개에서 비공개로" : "비공개에서 공개로"}</p>
      <form onSubmit={saveVisibility} className="flex flex-col gap-3">
        <label>변경 사유 (1~500자)<textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} className="mt-1 block w-full rounded border border-admin-divider bg-white/60 p-2"/></label>
        {notice && <p role="alert">{notice}</p>}
        <button type="submit" disabled={busy || !reason.trim()} className={BUTTON}>변경 확인</button>
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
