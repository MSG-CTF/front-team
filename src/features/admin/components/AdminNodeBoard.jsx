import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { resourceCount, resourceStatus } from "../utils/adminNodeAllocation.js";
import { buildNodeOverview, displayNodeName, formatCapacity, nodeCapacity, platformLabel, rankNodes, splitNodeName } from "../utils/adminNodeOverview.js";
import { StatusSymbol } from "./AdminGlyph.jsx";
import { AdminStatusMessage } from "./AdminLayout.jsx";
import { Widget } from "./AdminWidgets.jsx";
import NodeOsIcon from "./NodeOsIcon.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminNodeBoard.module.css";

// 노드 사용률은 막대 하나와 숫자 하나로 보인다
// 70% 아래는 회색, 70%부터 노랑, 85%부터 빨강이라 찬 자원만 색이 들어온다
export const USAGE_METRICS = [
  { key: "cpu_usage_percent", label: "CPU" },
  { key: "memory_usage_percent", label: "메모리" },
  { key: "disk_usage_percent", label: "디스크" },
];

function usageLevel(value) {
  if (!Number.isFinite(value) || value < 0) return "none";
  return value >= 85 ? "hot" : value >= 70 ? "warm" : "normal";
}

// caption 은 화면에 보이는 짧은 이름, label 은 읽어 주는 전체 이름
export function UsageMeter({ label, caption, value, showLabel = true }) {
  const level = usageLevel(value);
  const percent = level === "none" ? 0 : Math.min(100, value);
  return <span className={styles.meter} data-level={level} data-bare={!showLabel || undefined} role="img" aria-label={`${label} ${level === "none" ? "미수집" : `${Math.round(value)}%`}`}>
    {showLabel && <span className={styles.meterLabel} aria-hidden="true">{caption ?? label}</span>}
    <span className={styles.bar} aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
    <span className={styles.meterValue} aria-hidden="true">{level === "none" ? "-" : Math.round(value)}</span>
  </span>;
}

// 이름이 넘치면 앞을 줄이고 끝 조각은 그대로 둔다
export function NodeName({ name, full, className = "" }) {
  const [head, tail] = splitNodeName(name);
  return <span className={`${styles.nodeName} ${className}`} title={full}>
    <span className={styles.nameHead}>{head}</span>{tail && <span className={styles.nameTail}>{tail}</span>}
  </span>;
}

function sameTile(before, after) {
  const pick = (node) => ["status", "cpu_usage_percent", "memory_usage_percent", "disk_usage_percent", "container_count", "running_instances", "os", "arch", "capacity", "instance_type"].map((key) => node[key]);
  return before.entry === after.entry || (
    before.href === after.href && before.showAccount === after.showAccount && before.showAllocation === after.showAllocation
    && before.entry.key === after.entry.key && before.entry.name === after.entry.name && before.entry.challenges === after.entry.challenges
    && before.entry.partial === after.entry.partial && JSON.stringify(pick(before.entry.node)) === JSON.stringify(pick(after.entry.node))
  );
}

// 노드 타일: 운영체제 로고와 이름, 이상이 있을 때만 상태 표시
// 한 줄 설명(운영체제 · 배치 수)과 용량 줄 아래에 CPU · 메모리 · 디스크 막대가 같은 선에 선다
export const NodeTile = memo(function NodeTile({ entry, href, onSelect, showAccount = false, showAllocation = true }) {
  const status = resourceStatus(entry.node.status);
  const count = resourceCount(entry.node);
  const short = displayNodeName(entry.name);
  const facts = [
    platformLabel(entry.platform),
    showAllocation && (entry.challenges === null ? "배치 미수집" : `문제 ${entry.challenges}${entry.partial ? "+" : ""}`),
    `${count.label === "컨테이너" ? "컨테이너" : "인스턴스"} ${count.value ?? "-"}`,
  ].filter(Boolean).join(" · ");
  const capacity = formatCapacity(nodeCapacity(entry.node));
  const body = <>
    <span className={styles.head}>
      {entry.os && <NodeOsIcon node={entry.node} className={styles.os} />}
      <strong className={styles.name}><NodeName name={short} full={entry.name} /></strong>
      {status.tone !== "good" && <StatusSymbol tone={status.tone === "warn" ? "warn" : "unknown"} label={status.label} />}
    </span>
    {showAccount && <span className={styles.account} title={entry.accountName}>{entry.accountScope}</span>}
    <span className={styles.facts} title={facts}>{facts}</span>
    <span className={styles.capacity} title={capacity ? `용량 ${capacity}` : undefined}>{capacity ? `용량 ${capacity}` : "용량 미수집"}</span>
    <span className={styles.meters}>
      {USAGE_METRICS.map((metric) => <UsageMeter key={metric.key} label={metric.label} value={entry.node[metric.key]} />)}
    </span>
  </>;
  const shared = { className: styles.tile, "data-tone": status.tone, "aria-label": `${entry.name} ${status.label} 배치 보기` };
  return <li className={styles.item}>
    {href
      ? <Link to={href} {...shared}>{body}</Link>
      : <button type="button" aria-haspopup="dialog" {...shared}
        onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onSelect(entry.key); }}>{body}</button>}
  </li>;
}, sameTile);

export function NodeGrid({ entries, label, hrefFor, onSelect, showAccount = false, showAllocation = true, className = "" }) {
  return <ul className={`${styles.grid} ${className}`} aria-label={label}>
    {entries.map((entry) => <NodeTile key={entry.key} entry={entry} href={hrefFor ? hrefFor(entry) : undefined} onSelect={onSelect}
      showAccount={showAccount} showAllocation={showAllocation} />)}
  </ul>;
}

const DASHBOARD_ROWS = 6;

// 대시보드 노드 현황: 이름과 CPU · 메모리 · 디스크 세 칸만 있는 목록
// 위급한 노드부터 여섯 줄을 보이고 나머지는 노드 화면으로 넘긴다 위젯 안에서 스크롤하지 않는다
export default function AdminNodeBoard({ resources, className = "" }) {
  const entries = useMemo(() => buildNodeOverview(resources.data?.accounts ?? []), [resources.data]);
  const ranked = useMemo(() => rankNodes(entries), [entries]);
  const attention = entries.filter((entry) => entry.attention || entry.unknown || entry.busy).length;
  const healthy = entries.filter((entry) => entry.healthy).length;
  const shown = ranked.slice(0, DASHBOARD_ROWS);
  const hidden = entries.length - shown.length;

  return <Widget id="dashboard-nodes" title="노드 현황" className={className} flush
    count={resources.data ? attention : undefined} countTone="warn"
    meta={resources.data && entries.length > 0 && `${entries.length}대 중 ${healthy}대 정상`}
    more={{ to: ROUTES.adminResources, label: hidden > 0 ? `${hidden}대 더 보기` : "모두 보기" }}>
    <div className={styles.inset}><AdminStatusMessage status={resources.status} error={resources.error} onRetry={resources.retry} hasData={Boolean(resources.data)} /></div>
    {resources.data && entries.length === 0 && <p className={`${ui.quietNote} ${styles.inset}`}>수집된 노드가 없습니다</p>}
    {shown.length > 0 && <div className={styles.list}>
      <div className={styles.listHead} aria-hidden="true"><span>노드</span>{USAGE_METRICS.map((metric) => <span key={metric.key}>{metric.label}</span>)}</div>
      <ul aria-label="노드 사용률">
        {shown.map((entry) => {
          const status = resourceStatus(entry.node.status);
          const short = displayNodeName(entry.name);
          return <li key={entry.key}>
            <Link to={`${ROUTES.adminResources}?node=${encodeURIComponent(entry.node.node_id)}`} className={styles.row} data-tone={status.tone}
              aria-label={`${entry.name} ${status.label}`}>
              <span className={styles.rowName}>
                <span className={styles.dot} data-tone={entry.attention ? "warn" : entry.unknown ? "unknown" : entry.busy ? "bad" : "good"} aria-hidden="true" />
                <NodeName name={short} full={entry.name} />
              </span>
              {USAGE_METRICS.map((metric) => <UsageMeter key={metric.key} label={metric.label} value={entry.node[metric.key]} showLabel={false} />)}
            </Link>
          </li>;
        })}
      </ul>
    </div>}
  </Widget>;
}
