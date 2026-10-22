import { useCallback, useState } from "react";
import { banTeam, getAdminTeams, unbanTeam } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "./useAdminResource.js";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

// README 8절 GET /admin/teams(백엔드: 완료) + 밴 처리/해제(완료).
// 검색어, 정렬, 페이지가 바뀌면 그 조건으로 다시 조회하고 늦게 도착한 이전 조건의 응답은 버린다
// 밴 처리 뒤 다시 조회할 때도 지금 보고 있는 조건을 그대로 쓴다
export default function useAdminTeams() {
  const [params, setParams] = useState({ search: "", sort: "score", page: 1, size: 20 });
  const [actionError, setActionError] = useState("");
  const [mutatingTeamId, setMutatingTeamId] = useState(null);
  const list = useAdminResource((config) => getAdminTeams(params, config), [params], "팀 목록을 불러오지 못했습니다");
  const { reload, retry } = list;

  const applyParams = useCallback((patch) => {
    setActionError("");
    setParams((current) => ({ ...current, ...patch }));
  }, []);

  const mutate = useCallback(async (teamId, request, fallbackMessage) => {
    setMutatingTeamId(teamId);
    setActionError("");
    try {
      const response = await request();
      if (!isSuccess(response.data)) {
        throw new Error(response.data?.message || fallbackMessage);
      }
      await reload();
      return true;
    } catch (error) {
      setActionError(getErrorMessage(error, fallbackMessage));
      return false;
    } finally {
      setMutatingTeamId(null);
    }
  }, [reload]);

  const ban = useCallback(
    (teamId, banReason) => mutate(teamId, () => banTeam(teamId, { banReason }), "밴 처리에 실패했습니다"),
    [mutate],
  );

  const unban = useCallback(
    (teamId) => mutate(teamId, () => unbanTeam(teamId), "밴 해제에 실패했습니다"),
    [mutate],
  );

  const retryList = useCallback(() => {
    setActionError("");
    retry();
  }, [retry]);

  return {
    status: list.status,
    teams: list.data?.teams ?? [],
    totalCount: list.data?.total_count ?? 0,
    error: list.error || actionError,
    params,
    setParams: applyParams,
    mutatingTeamId,
    ban,
    unban,
    retry: retryList,
  };
}
