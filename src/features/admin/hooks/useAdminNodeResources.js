import { useEffect } from "react";
import { getAdminResources } from "../../../api/admin.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import useAdminResource from "./useAdminResource.js";

export default function useAdminNodeResources() {
  const resources = useAdminResource(getAdminResources, [], "노드 현황을 갱신하지 못했습니다");
  useEffect(() => startVisiblePolling(resources.reload, { intervalMs: 5000, immediate: false }), [resources.reload]);
  return resources;
}
