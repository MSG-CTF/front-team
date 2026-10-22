import { useEffect, useRef } from "react";
import { getAdminResources } from "../../../api/admin.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import useAdminResource from "./useAdminResource.js";

export default function useAdminNodeResources() {
  const resources = useAdminResource(getAdminResources, [], "노드 현황을 갱신하지 못했습니다");
  // 응답 객체가 바뀔 때마다 받은 시각을 기억해 두고 녹화 점의 기준으로 쓴다
  const received = useRef(null);
  if (resources.status === "success" && received.current?.data !== resources.data) received.current = { data: resources.data, at: Date.now() };
  useEffect(() => startVisiblePolling(resources.reload, { intervalMs: 5000, immediate: false }), [resources.reload]);
  return { ...resources, fetchedAt: received.current?.data === resources.data ? received.current.at : null };
}

// 갱신이 살아 있는지는 수집 시각이 아니라 조회가 이어지는지로 본다
// 수집기는 몇십 초 늦게 쓸 수 있으므로 수집 시각 기준으로는 정상인 벽도 꺼진 것처럼 보인다
export const LIVE_WINDOW_MS = 20000;
export function isResourceLive(resources, now = Date.now()) {
  if (["error", "unavailable"].includes(resources.status)) return false;
  return Number.isFinite(resources.fetchedAt) && now - resources.fetchedAt <= LIVE_WINDOW_MS;
}
