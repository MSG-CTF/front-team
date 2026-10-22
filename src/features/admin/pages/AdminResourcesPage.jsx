import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";
import { IconButton } from "../components/AdminWidgets.jsx";
import AdminNodeResources from "../components/AdminNodeResources.jsx";
import AdminResourceRefresh from "../components/AdminResourceRefresh.jsx";
import useAdminNodeResources from "../hooks/useAdminNodeResources.js";
import ui from "../components/AdminWorkspace.module.css";

export default function AdminResourcesPage() {
  const resources = useAdminNodeResources();
  const [params] = useSearchParams();
  return <AdminLayout title="노드 · 문제 배치" actions={<>
    <IconButton icon="refresh" label="새로고침" onClick={resources.reload} disabled={resources.status === "loading"} />
    <AdminResourceRefresh resources={resources} />
  </>}><AdminNodeResources resources={resources} initialNodeId={params.get("node")} /></AdminLayout>;
}
