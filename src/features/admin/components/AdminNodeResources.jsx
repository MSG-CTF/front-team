import { Fragment, useCallback, useId, useMemo, useState } from "react";
import { getTimer } from "../../../api/timer.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import AdminDialog from "./AdminDialog.jsx";
import { formatResourceAccountName } from "../utils/adminBoard.js";
import { formatAdminTime } from "../utils/adminTime.js";
import {
  allocationStatus, buildNodeAllocation, formatResourceAmount, formatResourcePercent, resourceStatus,
} from "../utils/adminNodeAllocation.js";
import {
  PROVIDER_LABELS, PROVIDER_ORDER, allocationSupported, buildNodeOverview, displayNodeName, filterNodeOverview, formatCapacity, nodeCapacity,
  platformLabel, platformOrder,
} from "../utils/adminNodeOverview.js";
import useAdminResource from "../hooks/useAdminResource.js";
import AdminNodeAccounts from "./AdminNodeAccounts.jsx";
import { AdminSegmented } from "./AdminFormParts.jsx";
import NodeOsIcon, { OsGlyph } from "./NodeOsIcon.jsx";
import { ProviderMark } from "./AdminPlatform.jsx";
import { NodeGrid, USAGE_METRICS, UsageMeter } from "./AdminNodeBoard.jsx";
import { SmartGrid, SmartTile } from "./AdminWidgets.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminNodeResources.module.css";

function AllocationBar({ dimension, selected }) {
  const { key, label, capacity, known, other, complete, remaining, overflow, denominator, segments } = dimension;
  const caption = capacity === null ? "총용량 미수집"
    : overflow > 0 ? `${formatResourceAmount(overflow, key)} 초과`
      : remaining !== null ? `${formatResourceAmount(remaining, key)} 남음` : "남은 용량 확인 중";
  return <div className={styles.meter} data-overflow={overflow > 0}>
    <div className={styles.meterHeading}>
      <strong>{label}</strong>
      <span>{complete ? "예약" : "확인된 예약"} <b>{formatResourceAmount(known, key)}</b> / {formatResourceAmount(capacity, key)}</span>
      <span className={styles.remaining}>{caption}</span>
    </div>
    <div className={styles.capacityTrack} aria-hidden="true" data-complete={complete && capacity !== null}>
      {capacity !== null && <>
        {segments.map((segment) => <span key={segment.key} className={styles.segment}
          data-muted={Boolean(selected && selected !== segment.key)}
          style={{ width: `${segment.width}%`, "--allocation-ink": segment.color }}
          title={`${segment.title} · ${formatResourceAmount(segment.value, key)}`}>
          {segment.width >= 8 && <span>{segment.number}</span>}
        </span>)}
        {other > 0 && <span className={styles.otherSegment} style={{ width: `${other / denominator * 100}%` }} title={`기타 예약 ${formatResourceAmount(other, key)}`} />}
        {overflow > 0 && <span className={styles.capacityLimit} style={{ left: `${capacity / denominator * 100}%` }} />}
      </>}
    </div>
    {overflow > 0 && <p className={styles.meterNote}>예약 합계가 총용량을 넘었습니다 · 세로선은 총용량 위치</p>}
  </div>;
}

// 노드 상세: 왼쪽에 용량과 실사용, 예약 막대, 오른쪽에 배치된 문제 표
// 문제가 많아도 한 화면에서 위쪽 줄부터 바로 보이도록 줄 높이를 낮추고, 문제를 누르면 그 줄 아래에 팀별 인스턴스가 열린다
const INSTANCE_ROWS = 12;

function AllocationDetail({ entry }) {
  const [selected, setSelected] = useState(null);
  const [allInstances, setAllInstances] = useState(false);
  const model = useMemo(() => buildNodeAllocation(entry.node), [entry.node]);
  const capacity = nodeCapacity(entry.node);
  const capacityText = formatCapacity(capacity);
  const dimensionBy = Object.fromEntries(model.dimensions.map((dimension) => [dimension.key, dimension]));
  const rows = useMemo(() => [...model.challenges].sort((a, b) => (b.resources.cpu_millicores?.known ?? 0) - (a.resources.cpu_millicores?.known ?? 0)), [model.challenges]);
  const instances = model.challenges.reduce((sum, item) => sum + item.instances.length, 0);
  const usageRows = [
    { metric: USAGE_METRICS[0], total: capacity.cpu === null ? "미수집" : formatResourceAmount(capacity.cpu, "cpu_millicores"), dimension: dimensionBy.cpu_millicores },
    { metric: USAGE_METRICS[1], total: capacity.memory === null ? "미수집" : formatResourceAmount(capacity.memory, "memory_mib"), dimension: dimensionBy.memory_mib },
    { metric: USAGE_METRICS[2], total: capacity.disk === null ? "미수집" : `${capacity.disk} GiB`, dimension: null },
  ];

  return <div className={styles.detailSplit}>
    <aside className={styles.detailSide} aria-label="노드 용량">
      <p className={styles.detailFacts}>
        {entry.os && <NodeOsIcon node={entry.node} className={styles.detailOs} labelled />}
        <span>{[!entry.os && platformLabel(entry.platform), capacity.instanceType, entry.accountScope].filter(Boolean).join(" · ")}</span>
      </p>
      <div className={styles.capacitySummary}>
        <span>용량</span>
        <strong>{capacityText || "미수집"}</strong>
      </div>
      <ul className={styles.capacityRows}>
        {usageRows.map(({ metric, total, dimension }) => <li key={metric.key}>
          <div className={styles.capacityHead}>
            <strong>{metric.label}</strong>
            <span>{total}</span>
          </div>
          <UsageMeter label={`${metric.label} 실사용`} caption="실사용" value={entry.node[metric.key]} />
          {dimension && model.available && <AllocationBar dimension={dimension} selected={selected} />}
        </li>)}
      </ul>
      {model.available && <div className={styles.legend}>
        <span><i className={styles.freeSwatch} />남은 예약 용량</span>
        <span><i className={styles.unknownSwatch} />미확인</span>
        {model.dimensions.some((dimension) => dimension.other > 0) && <span><i className={styles.otherSwatch} />기타 예약</span>}
      </div>}
      {model.collectedAt && <p className={styles.collected}>수집 {formatAdminTime(model.collectedAt)} KST · 실사용은 노드 전체 기준, 예약은 시스템 몫을 뺀 예약 가능 용량 기준</p>}
    </aside>

    <section className={styles.detailMain} aria-label="배치된 문제">
      <div className={styles.listHeading}>
        <strong>배치된 문제</strong>
        <span>{model.available ? `${model.challenges.length}개 문제 · 인스턴스 ${instances}개 · CPU 예약 순` : "배치 정보 미수집"}</span>
      </div>
      {!model.available ? <div className={styles.emptyAllocation}>
        <strong>어떤 문제가 배치됐는지 아직 확인할 수 없습니다</strong>
        <p>이 노드의 문제 목록과 예약 용량이 수집되면 여기에 표시됩니다 왼쪽 실사용률은 노드 전체 값입니다</p>
      </div> : rows.length === 0 ? <p className={styles.emptyMessage}>{model.dimensions.every((dimension) => dimension.complete) ? "이 노드에 예약된 문제 인스턴스가 없습니다" : "문제별 배치 정보를 수집 중입니다"}</p>
        : <table className={styles.placementTable} aria-label={`${entry.node.node_name} 배치된 문제`}>
          <thead><tr><th>문제</th><th className={styles.num}>인스턴스</th><th className={styles.num}>CPU</th><th className={styles.num}>메모리</th></tr></thead>
          <tbody>{rows.map((challenge) => {
            const open = selected === challenge.key;
            const share = (key) => {
              const dimension = dimensionBy[key];
              const value = challenge.resources[key];
              if (!value.complete) return "일부 미수집";
              return dimension?.capacity ? `${formatResourceAmount(value.known, key)} · ${formatResourcePercent(value.known / dimension.capacity * 100)}` : formatResourceAmount(value.known, key);
            };
            return <Fragment key={challenge.key}>
              <tr className={styles.placementRow} data-open={open || undefined} style={{ "--allocation-ink": challenge.color }}>
                <td>
                  <button type="button" className={styles.placementName} aria-expanded={open} onClick={() => { setSelected(open ? null : challenge.key); setAllInstances(false); }}>
                    <span className={styles.challengeNumber}>{challenge.number}</span>
                    <span>{challenge.title}</span>
                  </button>
                </td>
                <td className={styles.num}>{challenge.instances.length}</td>
                <td className={styles.num}>{share("cpu_millicores")}</td>
                <td className={styles.num}>{share("memory_mib")}</td>
              </tr>
              {open && <tr className={styles.placementInstances}><td colSpan={4}>
                {/* 팀이 많으면 인스턴스도 팀 수만큼 늘어나므로 열두 줄까지 보이고 나머지는 눌러서 연다 */}
                <ul>{(allInstances ? challenge.instances : challenge.instances.slice(0, INSTANCE_ROWS)).map((instance) => <li key={instance.reservation_id ?? instance.instance_id}>
                  <strong>{instance.team_name || "팀 정보 미수집"}</strong>
                  <span>{allocationStatus(instance)}</span>
                  <span>CPU {formatResourceAmount(instance.resources?.cpu_millicores, "cpu_millicores")} · 메모리 {formatResourceAmount(instance.resources?.memory_mib, "memory_mib")}</span>
                  <code title={instance.instance_id ? "인스턴스 ID" : "예약 ID"}>{(instance.instance_id || instance.reservation_id || "").slice(0, 8)}</code>
                </li>)}</ul>
                {challenge.instances.length > INSTANCE_ROWS && <button type="button" className={styles.instanceMore} onClick={() => setAllInstances((value) => !value)}>
                  {allInstances ? `처음 ${INSTANCE_ROWS}개만 보기` : `${challenge.instances.length - INSTANCE_ROWS}개 더 보기`}</button>}
              </td></tr>}
            </Fragment>;
          })}</tbody>
        </table>}
      {model.dimensions.some((dimension) => !dimension.complete) && model.available && <p className={styles.partialNotice}>일부 예약 정보가 빠져 있습니다 · 빗금 영역은 여유 용량으로 계산하지 않습니다</p>}
    </section>
  </div>;
}

const countFormat = new Intl.NumberFormat("ko-KR");
// 상태 타일: 미리알림의 스마트 목록처럼 색 원·개수·이름 누르면 그 상태만 남긴다
const STATUS_TILES = [
  { key: "all", label: "전체", glyph: "nodes", tone: "graphite" },
  { key: "healthy", label: "정상", glyph: "solve", tone: "green" },
  { key: "attention", label: "확인 필요", glyph: "warning", tone: "orange" },
  { key: "busy", label: "사용률 높음", glyph: "gauge", tone: "red", title: "CPU, 메모리, 디스크 중 하나라도 85% 이상" },
  { key: "unknown", label: "상태 미수집", glyph: "question", tone: "gray" },
];
// 플랫폼·운영체제 칩: 지금 노드에 있는 값만 보이고, 누르면 걸리고 한 번 더 누르면 풀린다
// 검색으로 고른 값이 0개가 되어도 칩을 남겨 바로 끌 수 있게 한다
function FacetChips({ label, values, active, onChange, render }) {
  const list = active && !values.some(([value]) => value === active) ? [...values, [active, 0]] : values;
  if (list.length === 0) return null;
  return <div className={styles.facet} role="group" aria-label={label}>
    <span className={styles.facetLabel}>{label}</span>
    {list.map(([value, count]) => <button key={value} type="button" className={styles.chip} aria-pressed={active === value}
      onClick={() => onChange(active === value ? "" : value)}>
      {render(value)}<span className={styles.chipCount}>{countFormat.format(count)}</span>
    </button>)}
  </div>;
}

const sortedFacet = (facet, order) => Object.entries(facet).sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

const byPlatform = (facet) => Object.entries(facet).sort(([a], [b]) => platformOrder(a) - platformOrder(b));

// 클라우드 묶음은 노드 수만큼 칸을 차지하고 한 격자 위에 나란히 선다
// 그래서 노드가 적은 클라우드도 줄 하나를 혼자 쓰지 않고, 모든 타일이 같은 세로선에 맞는다
const MAX_SPAN = 6;
const groupWeight = (group) => -group.entries.length * 100 + (group.provider ? PROVIDER_ORDER.indexOf(group.provider) : 99);

// 배치 정보를 아직 어떤 노드도 보내지 않으면(showAllocation=false) "배치 미수집"을 카드마다 반복하지 않는다
export default function AdminNodeResources({ resources, challengeSummary = [], initialNodeId = null }) {
  const sectionId = useId();
  const [selectedKey, setSelectedKey] = useState(initialNodeId);
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [provider, setProvider] = useState("");
  const [platform, setPlatform] = useState("");
  const [groupBy, setGroupBy] = useState("provider");
  const timer = useAdminResource(getTimer, [], "대회 시각을 불러오지 못했습니다");
  const accounts = resources.data?.accounts ?? [];
  const entries = useMemo(() => buildNodeOverview(resources.data?.accounts ?? []), [resources.data]);
  const supported = allocationSupported(entries);
  const view = useMemo(() => filterNodeOverview(entries, { query, accountId, status: statusFilter, provider, platform, groupBy }),
    [entries, query, accountId, statusFilter, provider, platform, groupBy]);
  const groups = useMemo(() => [...view.groups].sort((a, b) => groupWeight(a) - groupWeight(b)), [view.groups]);
  const selected = entries.find((entry) => entry.key === selectedKey || entry.node.node_id === selectedKey);
  const selectNode = useCallback((key) => setSelectedKey(key), []);
  const filtered = Boolean(query || accountId || statusFilter !== "all" || provider || platform);
  function resetFilters() { setQuery(""); setAccountId(""); setStatusFilter("all"); setProvider(""); setPlatform(""); }
  return <section className={styles.overview} aria-labelledby={sectionId}>
    <h2 id={sectionId} className={ui.srOnly}>노드 현황</h2>
    <AdminStatusMessage status={resources.status} error={resources.error} onRetry={resources.retry} hasData={Boolean(resources.data)} />
    {resources.status === "success" && entries.length === 0 && <p className={styles.emptyMessage}>수집된 노드가 없습니다</p>}
    {entries.length > 0 && <>
      <SmartGrid label="노드 상태 필터" className={styles.statusStrip}>
        {STATUS_TILES.map(({ key, label, glyph, tone, title }) => <SmartTile key={key} label={label} count={countFormat.format(view.counts[key])}
          glyph={glyph} tone={tone} pressed={statusFilter === key} onClick={() => setStatusFilter(key)} title={title} />)}
      </SmartGrid>
      <div className={styles.filters}>
        <div className={styles.toolbar}>
          <input type="search" aria-label="노드 찾기" className={`${ui.input} ${styles.search}`} value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="노드 이름, 계정, 운영체제, 문제명으로 찾기" />
          {accounts.length > 1 && <select aria-label="계정" className={ui.select} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">모든 계정 ({accounts.length})</option>
            {accounts.map((account) => <option key={account.account_id} value={account.account_id}>{formatResourceAccountName(account)} · {(account.nodes ?? []).length}대</option>)}
          </select>}
        </div>
        <FacetChips label="플랫폼" values={sortedFacet(view.facets.provider, PROVIDER_ORDER)} active={provider} onChange={setProvider}
          render={(value) => <><ProviderMark provider={value} size={16} />{PROVIDER_LABELS[value] ?? value}</>} />
        <FacetChips label="운영체제" values={byPlatform(view.facets.platform)} active={platform} onChange={setPlatform}
          render={(value) => <>{value.split(":")[0] && <OsGlyph os={value.split(":")[0]} className={styles.chipOs} />}{platformLabel(value)}</>} />
      </div>
      <div className={styles.overviewCaption}>
        <p role="status">{countFormat.format(entries.length)}대 중 <strong>{countFormat.format(view.total)}대</strong> 표시</p>
        {filtered && <button type="button" className={styles.resetFilters} onClick={resetFilters}>필터 지우기</button>}
        <AdminSegmented items={[{ key: "provider", label: "클라우드별" }, { key: "account", label: "계정별 · 요금" }]} value={groupBy} onChange={setGroupBy} label="노드 묶는 방식" />
      </div>
      {groupBy === "account" ? <AdminNodeAccounts groups={view.groups} endTime={timer.data?.end_time} onSelect={selectNode} onChanged={resources.reload} />
      : <div className={styles.flow}>
        {groups.map((group) => {
          const issues = new Set(group.entries.filter((entry) => entry.account.status && entry.account.status !== "HEALTHY").map((entry) => entry.accountName));
          return <section key={group.id} className={styles.cloud} data-span={Math.min(group.entries.length, MAX_SPAN)} aria-label={`${group.name} 노드`}>
            <header className={styles.cloudHead}>
              {group.provider && <ProviderMark provider={group.provider} account={group.entries[0].account} size={20} />}
              <h3>{group.name}</h3>
              <span className={styles.cloudSub} title={group.accounts.join(", ")}>{group.accounts.length === 1 ? group.accounts[0] : `계정 ${group.accounts.length}곳`}</span>
              {issues.size > 0 && <AdminBadge tone="warn">계정 확인 필요</AdminBadge>}
              <span className={styles.cloudCount}>{countFormat.format(group.entries.length)}대</span>
            </header>
            <NodeGrid entries={group.entries} label={`${group.name} 노드`} onSelect={selectNode} showAccount={group.accounts.length > 1}
              showAllocation={supported} className={styles.cloudGrid} />
          </section>;
        })}
      </div>}
      {view.total === 0 && <div className={styles.noResults}><strong>조건에 맞는 노드가 없습니다</strong><p>검색어나 필터를 바꿔보세요</p><button type="button" className={ui.button} onClick={resetFilters}>전체 노드 보기</button></div>}
      <p className={styles.mapLegend}>{supported ? "막대는 노드 실사용률 · 70%부터 노랑, 85%부터 빨강 · 노드를 누르면 문제별 예약 자원을 볼 수 있습니다" : "막대는 노드 실사용률 · 70%부터 노랑, 85%부터 빨강 · 문제별 배치 정보는 백엔드에서 아직 제공하지 않습니다"}</p>
    </>}
    {selectedKey && !selected && <p role="status" className={styles.emptyMessage}>선택한 노드가 최신 수집 목록에 없습니다</p>}
    {selected && <AdminDialog title={displayNodeName(selected.name)} subtitle={`노드별 문제 배치 · ${selected.accountName}`} variant="workspace" onClose={() => setSelectedKey(null)}
      headerMeta={<AdminBadge tone={resourceStatus(selected.node.status).tone}>{resourceStatus(selected.node.status).label}</AdminBadge>}>
      <div className={styles.resourceContent}>
      <AllocationDetail key={selected.key} entry={selected} />
      {!Array.isArray(selected?.node.resource_allocation?.allocations) && challengeSummary.length > 0 && <details className={styles.allChallenges} open>
        <summary>전체 실행 문제 · {challengeSummary.length}개</summary>
        <p>노드별 배치가 확인되기 전 전체 실행 현황입니다</p>
        <ul>{challengeSummary.map((challenge) => <li key={challenge.challenge_id}><span>{challenge.challenge_title}</span><strong>{challenge.running_count}개 실행</strong></li>)}</ul>
      </details>}
      </div>
    </AdminDialog>}
  </section>;
}
