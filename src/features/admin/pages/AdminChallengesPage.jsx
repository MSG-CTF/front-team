import { useEffect, useRef, useState } from "react";
import { forceResetInstance, forceStopInstance, getAdminChallenges, getAdminInstances, setChallengeVisibility } from "../../../api/admin.js";
import { INSTANCE_STATUS } from "../../../constants/enums.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import AdminPagination from "../components/AdminPagination.jsx";
import AdminDialog from "../components/AdminDialog.jsx";
import AdminChallengeCreateDialog from "../components/AdminChallengeCreateDialog.jsx";
import { ADMIN_CHALLENGE_CATEGORIES } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";

const BUTTON = "rounded border border-admin-divider px-3 py-1 text-sm disabled:opacity-50";
const SELECT = "rounded border border-admin-divider bg-white/60 px-3 py-1.5 text-sm";

function InstancesSection() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const instances = useAdminResource((config) => getAdminInstances({ status: filter || undefined, page, size: 50 }, config), [filter, page], "인스턴스 목록을 불러오지 못했습니다");
  useEffect(() => {
    let active = true;
    let timer;
    const poll = async () => {
      if (!pending.current) await instances.reload();
      if (active) timer = setTimeout(poll, 10000);
    };
    timer = setTimeout(poll, 10000);
    return () => { active = false; clearTimeout(timer); };
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
  return <section className="mt-8 font-song-myung">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-im-fell text-lg">인스턴스</h2>
      <label>상태 <select value={filter} disabled={busy} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className={SELECT}>
        <option value="">전체</option>{Object.values(INSTANCE_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}
      </select></label>
      <button type="button" onClick={instances.retry} disabled={busy || instances.status === "loading"} className={BUTTON}>인스턴스 새로고침</button>
    </div>
    <AdminStatusMessage status={instances.status} error={instances.error} onRetry={instances.retry}/>
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {instances.status === "success" && <div className="overflow-x-auto rounded-lg border border-admin-divider">
      <table className="w-full border-collapse text-left font-song-myung text-sm"><thead><tr>{["팀 / 인스턴스 ID", "문제", "상태", "만료 (KST)", "조치"].map((text) => <th key={text} className="p-3 font-normal">{text}</th>)}</tr></thead>
        <tbody>{(instances.data?.instances ?? []).map((instance) => <tr key={instance.instance_id} className="border-t border-admin-divider/40">
          <td className="p-3">{instance.team_name}<span className="block select-all font-kode-mono text-xs">{instance.instance_id}</span></td>
          <td className="p-3">{instance.challenge_title}</td><td className="p-3"><AdminBadge tone={instance.status === "FAILED" ? "bad" : instance.status === "RUNNING" ? "good" : "neutral"}>{instance.status}</AdminBadge></td>
          <td className="p-3">{instance.expires_at ? toKst(instance.expires_at) : "-"}</td>
          <td className="p-3"><div className="flex gap-2">
            <button type="button" className={BUTTON} disabled={busy || instance.status !== "RUNNING"} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "reset" }); }}>강제 재시작</button>
            <button type="button" className={BUTTON + " border-admin-failed text-admin-failed"} disabled={busy || instance.status !== "RUNNING"} onClick={() => { setNotice(""); setConfirmation({ instance, kind: "stop" }); }}>강제 종료</button>
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
  const [creating, setCreating] = useState(false);
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
  return <AdminLayout title="문제 목록 / 인스턴스" actions={<button type="button" onClick={() => setCreating(true)} disabled={busy} className={BUTTON}>문제 등록</button>}>
    <div className="mb-3 flex flex-wrap gap-3">
      <label>분야 <select value={category} className={SELECT} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
        <option value="">전체</option>{ADMIN_CHALLENGE_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>정렬 <select value={sort} className={SELECT} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
        <option value="running">실행 수</option><option value="title">이름</option><option value="score">배점</option>
      </select></label>
      <button type="button" onClick={challenges.retry} disabled={busy || challenges.status === "loading"} className={BUTTON}>문제 새로고침</button>
    </div>
    <AdminStatusMessage status={challenges.status} error={challenges.error} onRetry={challenges.retry}/>
    {notice && <p role="status" className="my-3 text-sm">{notice}</p>}
    {challenges.status === "success" && <div className="overflow-x-auto rounded-lg border border-admin-divider">
      <table className="w-full border-collapse text-left font-song-myung text-sm"><thead><tr>{["제목", "분야", "난이도", "점수", "해결 팀", "인스턴스", "공개 상태"].map((text) => <th key={text} className="p-3 font-normal">{text}</th>)}</tr></thead>
        <tbody>{(challenges.data?.challenges ?? []).map((challenge) => <tr key={challenge.challenge_id} className="border-t border-admin-divider/40">
          <td className="p-3">{challenge.title}</td><td className="p-3">{challenge.category}</td><td className="p-3">{challenge.difficulty}</td><td className="p-3">{challenge.score}</td><td className="p-3">{challenge.solved_team_count}</td>
          <td className="p-3">{challenge.running_instance_count} {challenge.failed_instance_count > 0 && <span className="text-admin-failed">(실패 {challenge.failed_instance_count})</span>}</td>
          <td className="p-3"><button type="button" disabled={busy} onClick={() => { setSelected(challenge); setReason(""); setNotice(""); }}><AdminBadge tone={challenge.is_published ? "good" : "bad"}>{challenge.is_published ? "공개 중 / 변경" : "비공개 / 변경"}</AdminBadge></button></td>
        </tr>)}</tbody>
      </table>
      {challenges.data?.challenges?.length === 0 && <p className="p-4 text-center">표시할 문제가 없습니다</p>}
    </div>}
    <AdminPagination page={page} totalCount={challenges.data?.total_count} onChange={setPage} disabled={busy || challenges.status !== "success"}/>
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
      onCreated={async () => {
        setNotice("문제를 비공개로 등록했습니다");
        const refreshed = await challenges.reload();
        if (!refreshed) setNotice("등록은 처리됐지만 최신 목록을 조회하지 못했습니다");
      }}
    />}
    <InstancesSection/>
  </AdminLayout>;
}
