import { useState } from "react";
import { StatStrip, StatTile } from "../components/AdminWidgets.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { getLeaderboard } from "../../../api/leaderboard.js";
import { getAdminDashboard } from "../../../api/admin.js";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminTeams from "../hooks/useAdminTeams.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { AdminBanDialog } from "../components/AdminFormParts.jsx";
import ui from "../components/AdminWorkspace.module.css";

// 팀원 한 줄: 팀장을 앞에 두고 넷까지 이름을 보인다 관리자 계정은 파란 꼬리표를 붙인다
function MemberLine({ members = [], limit = 4 }) {
  if (!members?.length) return null;
  const sorted = [...members].sort((a, b) => Number(Boolean(b.is_leader)) - Number(Boolean(a.is_leader)));
  return <span className={ui.memberLine}>
    {sorted.slice(0, limit).map((member) => <span key={member.user_id}>
      {member.nickname}
      {member.is_leader && <small>팀장</small>}
      {member.role === "ADMIN" && <small data-tone="admin">관리자</small>}
    </span>)}
    {sorted.length > limit && <span>외 {sorted.length - limit}명</span>}
  </span>;
}

function BanControl({ team, isMutating, onBan, onUnban }) {
  const [open, setOpen] = useState(false);

  if (team.is_banned) {
    return (
      <button
        type="button"
        disabled={isMutating}
        onClick={() => onUnban(team.team_id)}
        className={`${ui.button} ${ui.small}`}
      >밴 해제</button>
    );
  }

  return <>
    <button
      type="button"
      disabled={isMutating}
      onClick={() => setOpen(true)}
      className={`${ui.button} ${ui.small} ${ui.danger}`}
    >밴 처리</button>
    {open && <AdminBanDialog team={team} busy={isMutating} onClose={() => setOpen(false)}
      onConfirm={(reason) => onBan(team.team_id, reason).then((ok) => { if (ok) setOpen(false); })} />}
  </>;
}

// 팀별 목록 - README.md "8. 관리자 페이지 > 팀". 검색/정렬은 백엔드가 실제로
// query를 반영하는지 아직 확인 전이라(README에 필드만 정의) 우선 요청만
// 보내고 결과를 그대로 표시한다.
export default function AdminTeamsPage() {
  const teams = useAdminTeams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const lastPage = teams.params.page * teams.params.size >= teams.totalCount;
  const summary = useAdminResource(getAdminDashboard, [], "집계를 불러오지 못했습니다");
  const leaderboard = useAdminResource((config) => getLeaderboard(config), [], "순위를 불러오지 못했습니다");
  const leader = [...(leaderboard.data?.teams ?? [])].sort((a, b) => (b.team_score ?? 0) - (a.team_score ?? 0))[0];
  const count = (value) => (value == null ? "-" : formatAdminNumber(value));

  return (
    <AdminLayout title="팀별 목록">
      <StatStrip label="팀 집계" className={ui.pageStrip}>
        <StatTile glyph="teams" label="전체 팀" value={count(summary.data?.teams?.total_count ?? teams.totalCount)} />
        <StatTile glyph="ban" label="밴 팀" value={count(summary.data?.teams?.banned_count)} tone={summary.data?.teams?.banned_count ? "bad" : undefined} />
        <StatTile glyph="mileage" label="팀 보유 마일리지" value={<>{count(summary.data?.teams?.total_mileage)}<small>MI</small></>} />
        <StatTile glyph="rank" label="선두" value={leader?.team_name ?? "-"} text sub={leader ? `${count(leader.team_score)}점` : ""} tone="gold" to={leader ? ROUTES.adminTeamDetail(leader.team_id) : undefined} />
      </StatStrip>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          teams.setParams({ search: searchInput, page: 1 });
        }}
        className={ui.filterBar}
        role="search"
      >
        <label className={`${ui.field} ${ui.grow}`}>
          <span className={ui.fieldLabel}>팀 이름</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="팀 이름 검색"
            className={ui.input}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>정렬</span>
          <select
            value={teams.params.sort}
            onChange={(event) => teams.setParams({ sort: event.target.value, page: 1 })}
            className={ui.select}
          >
            <option value="score">점수순</option>
            <option value="name">이름순</option>
          </select>
        </label>
        <button type="submit" className={ui.primary}>
          검색
        </button>
      </form>

      <AdminStatusMessage status={teams.status} error={teams.error} onRetry={teams.retry} />
      {teams.status === "success" && teams.error && <p role="alert" className={ui.callout} data-tone="bad">{teams.error}</p>}

      {teams.status === "success" && (
        <div className={`${ui.tableWrap} ${ui.teamStack}`}>
          <table className={ui.table} aria-label="팀 목록">
            <thead>
              <tr>
                <th>팀</th>
                <th className={ui.num}>점수</th>
                <th className={ui.num}>마일리지</th>
                <th className={ui.num}>인원</th>
                <th>상태</th>
                <th>조치</th>
              </tr>
            </thead>
            <tbody>
              {teams.teams.map((team) => (
                <tr key={team.team_id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.adminTeamDetail(team.team_id))}
                      className={ui.linkButton}
                    >
                      {team.team_name}
                    </button>
                    <MemberLine members={team.members} />
                  </td>
                  <td className={ui.num}>{formatAdminNumber(team.team_score)}</td>
                  <td className={ui.num}>{formatAdminNumber(team.mileage)}</td>
                  <td className={ui.num}>{team.member_count ?? team.members?.length ?? "-"}</td>
                  <td>
                    {team.is_banned ? (
                      <AdminBadge tone="bad">밴됨</AdminBadge>
                    ) : (
                      <AdminBadge tone="good">정상</AdminBadge>
                    )}
                  </td>
                  <td>
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
                <tr className={ui.emptyRow}>
                  <td colSpan={6} className={ui.empty}>
                    표시할 팀이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {teams.status === "success" && (
        <nav aria-label="팀 목록 페이지" className={ui.pagination}>
          <span>총 <strong>{teams.totalCount}</strong>팀</span>
          <button
            type="button"
            disabled={teams.params.page <= 1}
            onClick={() => teams.setParams({ page: teams.params.page - 1 })}
            className={`${ui.button} ${ui.small}`}
          >
            이전
          </button>
          <span><strong>{teams.params.page}</strong> 페이지</span>
          <button
            type="button"
            disabled={lastPage}
            onClick={() => teams.setParams({ page: teams.params.page + 1 })}
            className={`${ui.button} ${ui.small}`}
          >
            다음
          </button>
        </nav>
      )}
    </AdminLayout>
  );
}
