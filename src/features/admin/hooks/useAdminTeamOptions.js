import { getAdminTeams } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { collectPages } from "../utils/adminLists.js";
import useAdminResource from "./useAdminResource.js";

const FALLBACK = "팀 목록을 불러오지 못했습니다";
// 팀 선택기는 초성 검색을 화면에서 하므로 팀 목록을 이름순으로 받아 둔다 서버 search는 초성을 모른다
// 첫 쪽으로 전체 수를 알고 나머지 쪽은 몇 개씩 함께 받아 10초 조회 제한 안에 끝낸다
// 2,000팀을 넘으면 거기서 멈추고 capped로 선택기에 알린다
export const TEAM_OPTION_LIMIT = 2000;

// enabled가 거짓이면 요청 없이 비워 둔다 기존 팀 합류처럼 고를 때만 팀 목록이 필요한 화면에서 쓴다
export default function useAdminTeamOptions(deps = [], { enabled = true } = {}) {
  return useAdminResource(async (config) => {
    if (!enabled) return { data: { code: "SUCCESS", data: null } };
    const result = await collectPages(async (page) => {
      const response = await getAdminTeams({ page, size: 100, sort: "name" }, config);
      const envelope = response.data;
      if (!isSuccess(envelope) || !Array.isArray(envelope.data?.teams)) throw new Error(envelope?.message || FALLBACK);
      return { items: envelope.data.teams, totalCount: envelope.data.total_count };
    }, { limit: TEAM_OPTION_LIMIT, keyOf: (team) => team.team_id });
    return { data: { code: "SUCCESS", data: { teams: result.items, total_count: result.totalCount, capped: result.capped } } };
  }, [...deps, enabled], FALLBACK);
}
