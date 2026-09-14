import { useEffect, useRef, useState } from "react";
import { adjustMileage, createAdminIdempotencyKey, getAdminMileageHistory, getAdminTeams } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminResource from "../hooks/useAdminResource.js";

// 마일리지 관리 - Figma 사이드바 항목("마일리지 관리", node 384:417). 전용 화면
// 시안은 없어서, 팀별 목록/팀 상세와 같은 톤의 표+폼으로 구성했다.
// GET /admin/mileage_history(README 8절, 백엔드: PR 대기)로 팀 구분 없이 전체
// 내역을 보여주고, 지급/회수는 기존 adjustMileage(팀 상세와 동일 엔드포인트)를 쓴다.
function GrantForm({ onDone }) {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // 같은 지급/회수 시도를 재시도할 때 동일 키를 재사용해야 서버가 중복 지급을
  // 막아준다. 성공하면 비우고, 다음 제출에서 새로 발급한다.
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    getAdminTeams({ size: 100, sort: "name" })
      .then((res) => setTeams(isSuccess(res.data) ? res.data.data.teams ?? [] : []))
      .catch(() => setTeams([]));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!teamId || !parsed || !reason.trim()) return;
    setIsSubmitting(true);
    setError("");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = createAdminIdempotencyKey("admin-mileage");
    try {
      const res = await adjustMileage(teamId, { amount: parsed, reason: reason.trim(), idempotencyKey: idempotencyKeyRef.current });
      if (!isSuccess(res.data)) throw new Error(res.data?.message || "처리에 실패했습니다.");
      idempotencyKeyRef.current = null;
      setAmount("");
      setReason("");
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2 font-song-myung text-sm">
      <label className="flex flex-col gap-1">
        팀
        <select
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
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="+지급 / -회수"
          className="w-32 rounded border border-admin-divider bg-white/60 px-3 py-1.5 font-kode-mono"
        />
      </label>
      <label className="flex flex-col gap-1">
        사유
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-52 rounded border border-admin-divider bg-white/60 px-3 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting || !teamId || !amount || !reason.trim()}
        className="rounded border border-admin-ink px-4 py-1.5 disabled:opacity-50"
      >
        지급/회수
      </button>
      {error && <p role="alert" className="w-full text-admin-failed">{error}</p>}
    </form>
  );
}

export default function AdminMileagePage() {
  const history = useAdminResource(
    () => getAdminMileageHistory({ size: 50 }),
    [],
    "마일리지 내역을 불러오지 못했습니다.",
  );

  return (
    <AdminLayout title="마일리지 관리">
      <GrantForm onDone={history.reload} />

      <AdminStatusMessage status={history.status} error={history.error} onRetry={history.retry} />
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
                <tr key={entry.history_id} className="border-b border-admin-divider/40 last:border-0">
                  <td className="px-2 py-2">{entry.team_name}</td>
                  <td className="px-2 py-2 text-admin-muted">{entry.type}</td>
                  <td className={`px-2 py-2 font-kode-mono ${entry.amount > 0 ? "text-admin-running" : "text-admin-failed"}`}>
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </td>
                  <td className="px-2 py-2">{entry.reason || "-"}</td>
                  <td className="px-2 py-2 font-kode-mono text-xs">{toKst(entry.created_at)}</td>
                </tr>
              ))}
              {(history.data?.history ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-admin-muted">내역 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
