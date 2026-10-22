import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { buildNodeOverview } from "../utils/adminNodeOverview.js";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import AdminResourceRefresh from "./AdminResourceRefresh.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminResourceSummary.module.css";

export default function AdminResourceSummary({ resources }) {
  const nodes = useMemo(() => buildNodeOverview(resources.data?.accounts ?? []), [resources.data]);
  const priority = (node) => node.attention ? 0 : node.unknown ? 1 : node.busy ? 2 : 3;
  const attention = nodes.filter((node) => node.attention || node.unknown || node.busy || node.partial || node.challenges === null)
    .sort((a, b) => priority(a) - priority(b));
  const ready = Boolean(resources.data);
  return <section className={`${ui.card} ${styles.summary}`} aria-labelledby="node-summary">
    <header className={ui.cardHeader}>
      <h2 id="node-summary" className={ui.cardTitle}><span className={ui.eyebrow}>RESOURCES</span>노드 현황</h2>
      <Link to={ROUTES.adminResources} className={`${ui.button} ${ui.small}`}>전체 배치 보기</Link>
    </header>
    <div className={ui.cardBody}>
      <AdminStatusMessage {...resources} onRetry={resources.retry} hasData={ready} />
      <dl className={styles.counts}>
        <div><dt>전체 노드</dt><dd>{ready ? nodes.length.toLocaleString("ko") : "—"}</dd></div>
        <div><dt>상태 정상</dt><dd>{ready ? nodes.filter((node) => node.healthy).length.toLocaleString("ko") : "—"}</dd></div>
        <div data-attention={attention.length > 0}><dt>확인 필요</dt><dd>{ready ? attention.length.toLocaleString("ko") : "—"}</dd></div>
      </dl>
      {ready && <p className={styles.note}>{attention.length ? "상태·사용률·배치 정보를 확인할 노드가 있습니다" : nodes.length ? "수집된 노드에 확인이 필요한 항목이 없습니다" : "아직 수집된 노드가 없습니다"}</p>}
      {attention.length > 0 && <ul className={styles.attention} aria-label="확인이 필요한 노드">
        {attention.slice(0, 3).map((entry) => <li key={entry.key}>
          <Link to={`${ROUTES.adminResources}?node=${encodeURIComponent(entry.node.node_id)}`}><strong>{entry.name}</strong><span>{entry.attention ? "노드 상태 확인" : entry.unknown ? "상태 미수집" : entry.busy ? "사용률 85% 이상" : "배치 정보 확인"}</span></Link>
        </li>)}
      </ul>}
      {attention.length > 3 && <p className={styles.note}>그 외 {attention.length - 3}개는 전체 배치에서 확인할 수 있습니다</p>}
      <AdminResourceRefresh resources={resources} />
    </div>
  </section>;
}
