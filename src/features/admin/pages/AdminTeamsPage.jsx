import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminTeams from "../hooks/useAdminTeams.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import ui from "../components/AdminWorkspace.module.css";

function BanControl({ team, isMutating, onBan, onUnban }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (team.is_banned) {
    return (
      <button
        type="button"
        disabled={isMutating}
        onClick={() => onUnban(team.team_id)}
        className={`${ui.button} ${ui.small}`}
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
        className={ui.rowActions}
      >
        <input
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="밴 사유"
          aria-label={`${team.team_name} 밴 사유`}
          className={`${ui.input} ${ui.small} ${ui.reasonInput}`}
        />
        <button
          type="submit"
          disabled={isMutating || !reason.trim()}
          className={`${ui.dangerSolid} ${ui.small}`}
        >
          확인
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={`${ui.button} ${ui.small}`}
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
      className={`${ui.button} ${ui.small} ${ui.danger}`}
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
  const lastPage = teams.params.page * teams.params.size >= teams.totalCount;

  return (
    <AdminLayout title="팀별 목록">
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
        <div className={ui.tableWrap}>
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
                    표시할 팀이 없습니다.
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
