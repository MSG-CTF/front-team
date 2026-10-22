import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminNodeResources from "../components/AdminNodeResources.jsx";
import AdminResourceRefresh from "../components/AdminResourceRefresh.jsx";
import useAdminNodeResources from "../hooks/useAdminNodeResources.js";
import ui from "../components/AdminWorkspace.module.css";

export default function AdminResourcesPage() {
  const resources = useAdminNodeResources();
  const [params] = useSearchParams();
  return <AdminLayout title="노드 · 문제 배치" actions={<>
    <button type="button" className={ui.button} disabled={resources.status === "loading"} onClick={resources.reload}>새로고침</button>
    <AdminResourceRefresh resources={resources} />
  </>}><AdminNodeResources resources={resources} initialNodeId={params.get("node")} /></AdminLayout>;
}
