import { useCallback, useEffect, useState } from "react";
import { banTeam, getAdminTeams, unbanTeam } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

// README 8절 GET /admin/teams(백엔드: 완료) + 밴 처리/해제(완료).
export default function useAdminTeams() {
  const [params, setParams] = useState({ search: "", sort: "score", page: 1, size: 20 });
  const [state, setState] = useState({ status: "loading", teams: [], totalCount: 0, error: "" });
  const [mutatingTeamId, setMutatingTeamId] = useState(null);

  const load = useCallback(async (nextParams = params) => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const response = await getAdminTeams(nextParams);
      const envelope = response.data;
      if (!isSuccess(envelope)) {
        throw new Error(envelope?.message || "팀 목록을 불러오지 못했습니다.");
      }
      setState({
        status: "success",
        teams: envelope.data?.teams ?? [],
        totalCount: envelope.data?.total_count ?? 0,
        error: "",
      });
    } catch (error) {
      setState({
        status: "error",
        teams: [],
        totalCount: 0,
        error: getErrorMessage(error, "팀 목록을 불러오지 못했습니다."),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyParams = useCallback(
    (patch) => {
      const nextParams = { ...params, ...patch };
      setParams(nextParams);
      load(nextParams);
    },
    [params, load],
  );

  const ban = useCallback(
    async (teamId, banReason) => {
      setMutatingTeamId(teamId);
      try {
        const response = await banTeam(teamId, { banReason });
        if (!isSuccess(response.data)) {
          throw new Error(response.data?.message || "밴 처리에 실패했습니다.");
        }
        await load();
        return true;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getErrorMessage(error, "밴 처리에 실패했습니다."),
        }));
        return false;
      } finally {
        setMutatingTeamId(null);
      }
    },
    [load],
  );

  const unban = useCallback(
    async (teamId) => {
      setMutatingTeamId(teamId);
      try {
        const response = await unbanTeam(teamId);
        if (!isSuccess(response.data)) {
          throw new Error(response.data?.message || "밴 해제에 실패했습니다.");
        }
        await load();
        return true;
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getErrorMessage(error, "밴 해제에 실패했습니다."),
        }));
        return false;
      } finally {
        setMutatingTeamId(null);
      }
    },
    [load],
  );

  return {
    ...state,
    params,
    setParams: applyParams,
    mutatingTeamId,
    ban,
    unban,
    retry: () => load(),
  };
}
