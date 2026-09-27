import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminTeams from "../hooks/useAdminTeams.js";

function BanControl({ team, isMutating, onBan, onUnban }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (team.is_banned) {
    return (
      <button
        type="button"
        disabled={isMutating}
        onClick={() => onUnban(team.team_id)}
        className="rounded border border-admin-running px-2 py-1 text-xs text-admin-running disabled:opacity-50"
      >
        밴 해제
      </button>
    );
  }

  if (isOpen) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim()) return;
          onBan(team.team_id, reason.trim()).then((ok) => {
            if (ok) {
              setIsOpen(false);
              setReason("");
            }
          });
        }}
        className="flex items-center gap-1"
      >
        <input
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="밴 사유"
          className="w-32 rounded border border-admin-divider bg-white/30 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={isMutating || !reason.trim()}
          className="rounded border border-admin-failed px-2 py-1 text-xs text-admin-failed disabled:opacity-50"
        >
          확인
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-admin-muted"
        >
          취소
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      disabled={isMutating}
      onClick={() => setIsOpen(true)}
      className="rounded border border-admin-failed px-2 py-1 text-xs text-admin-failed disabled:opacity-50"
    >
      밴 처리
    </button>
  );
}

// 팀별 목록 - README.md "8. 관리자 페이지 > 팀". 검색/정렬은 백엔드가 실제로
// query를 반영하는지 아직 확인 전이라(README에 필드만 정의) 우선 요청만
// 보내고 결과를 그대로 표시한다.
export default function AdminTeamsPage() {
  const teams = useAdminTeams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  return (
    <AdminLayout title="팀별 목록">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          teams.setParams({ search: searchInput, page: 1 });
        }}
        className="mb-4 flex items-center gap-2"
      >
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="팀 이름 검색"
          className="rounded border border-admin-divider bg-white/30 px-3 py-1.5 text-sm"
        />
        <select
          value={teams.params.sort}
          onChange={(event) => teams.setParams({ sort: event.target.value, page: 1 })}
          className="rounded border border-admin-divider bg-white/30 px-3 py-1.5 text-sm"
        >
          <option value="score">점수순</option>
          <option value="name">이름순</option>
        </select>
        <button type="submit" className="rounded border border-admin-divider px-3 py-1.5 text-sm">
          검색
        </button>
      </form>

      <AdminStatusMessage status={teams.status} error={teams.error} onRetry={teams.retry} />

      {teams.status === "success" && (
        <div className="overflow-x-auto rounded-lg border border-admin-divider">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-admin-divider text-left text-admin-muted">
                <th className="px-3 py-2 font-normal">팀</th>
                <th className="px-3 py-2 font-normal">점수</th>
                <th className="px-3 py-2 font-normal">마일리지</th>
                <th className="px-3 py-2 font-normal">인원</th>
                <th className="px-3 py-2 font-normal">상태</th>
                <th className="px-3 py-2 font-normal">조치</th>
              </tr>
            </thead>
            <tbody>
              {teams.teams.map((team) => (
                <tr key={team.team_id} className="border-b border-admin-divider/40 last:border-0">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.adminTeamDetail(team.team_id))}
                      className="text-left underline decoration-dotted underline-offset-2 hover:text-admin-gold"
                    >
                      {team.team_name}
                    </button>
                  </td>
                  <td className="px-3 py-2">{team.team_score}</td>
                  <td className="px-3 py-2">{team.mileage}</td>
                  <td className="px-3 py-2">{team.member_count ?? team.members?.length ?? "-"}</td>
                  <td className="px-3 py-2">
                    {team.is_banned ? (
                      <AdminBadge tone="bad">밴됨</AdminBadge>
                    ) : (
                      <AdminBadge tone="good">정상</AdminBadge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <BanControl
                      team={team}
                      isMutating={teams.mutatingTeamId === team.team_id}
                      onBan={teams.ban}
                      onUnban={teams.unban}
                    />
                  </td>
                </tr>
              ))}
              {teams.teams.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-admin-muted">
                    표시할 팀이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {teams.status === "success" && (
        <div className="mt-3 flex items-center justify-between text-xs text-admin-muted">
          <span>총 {teams.totalCount}팀</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={teams.params.page <= 1}
              onClick={() => teams.setParams({ page: teams.params.page - 1 })}
              className="rounded border border-admin-divider px-2 py-1 disabled:opacity-40"
            >
              이전
            </button>
            <span>{teams.params.page} 페이지</span>
            <button
              type="button"
              disabled={teams.params.page * teams.params.size >= teams.totalCount}
              onClick={() => teams.setParams({ page: teams.params.page + 1 })}
              className="rounded border border-admin-divider px-2 py-1 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
