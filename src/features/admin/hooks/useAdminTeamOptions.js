import { getAdminTeams } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "./useAdminResource.js";

export default function useAdminTeamOptions(deps = []) {
  return useAdminResource(async (config) => {
    const teams = [];
    let page = 1;
    while (true) {
      const response = await getAdminTeams({ page, size: 100, sort: "name" }, config);
      const envelope = response.data;
      if (!isSuccess(envelope) || !Array.isArray(envelope.data?.teams)) throw new Error(envelope?.message || "팀 목록을 불러오지 못했습니다");
      teams.push(...envelope.data.teams);
      if (!envelope.data.teams.length || teams.length >= (envelope.data.total_count ?? teams.length)) break;
      page += 1;
    }
    return { data: { code: "SUCCESS", data: { teams } } };
  }, deps, "팀 목록을 불러오지 못했습니다");
}
