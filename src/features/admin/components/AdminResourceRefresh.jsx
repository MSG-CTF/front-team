import { formatAdminTime } from "../utils/adminTime.js";
import ui from "./AdminWorkspace.module.css";

export default function AdminResourceRefresh({ resources }) {
  const collected = resources.data?.collected_at;
  const stale = collected && Date.now() - Date.parse(collected) > 30000;
  const failed = ["error", "unavailable"].includes(resources.status);
  return <span className={ui.cardMeta}>
    {failed || stale ? "갱신 지연 · 마지막 수집" : "5초마다 자동 갱신 · 수집"} {formatAdminTime(collected)} KST
    {failed && resources.data && " · 이전 데이터 표시 중"}
  </span>;
}
