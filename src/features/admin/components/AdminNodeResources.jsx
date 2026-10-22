import { memo, useCallback, useId, useMemo, useState } from "react";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import AdminDialog from "./AdminDialog.jsx";
import { formatResourceAccountName } from "../utils/adminBoard.js";
import { formatAdminTime } from "../utils/adminTime.js";
import {
  allocationStatus, buildNodeAllocation, formatResourceAmount, formatResourcePercent, resourceCount, resourceStatus,
} from "../utils/adminNodeAllocation.js";
import { buildNodeOverview, filterNodeOverview } from "../utils/adminNodeOverview.js";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminNodeResources.module.css";

function Usage({ label, value }) {
  const valid = Number.isFinite(value) && value >= 0;
  return <span className={styles.usage} data-level={valid && value >= 85 ? "hot" : valid && value >= 70 ? "warm" : "normal"}>
    <span>{label}</span>
    <span className={styles.usageTrack} aria-hidden="true"><span style={{ width: `${valid ? Math.min(100, value) : 0}%` }} /></span>
    <strong>{formatResourcePercent(value)}</strong>
  </span>;
}

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

function AllocationDetail({ entry }) {
  const [selected, setSelected] = useState(null);
  const model = buildNodeAllocation(entry.node);
  const active = model.challenges.find((challenge) => challenge.key === selected);
  const detailsId = useId();

  return <div className={styles.detail}>
    <div className={styles.detailHeading}>
      <div><p className={styles.kicker}>선택한 노드</p><h3>{entry.node.node_name}</h3><p>{formatResourceAccountName(entry.account)}</p></div>
      <div className={styles.detailMeta}>
        <strong>문제별 예약 자원</strong>
        <span>{model.available ? `${model.challenges.length}개 문제 · ${model.challenges.reduce((sum, item) => sum + item.instances.length, 0)}개 인스턴스` : "배치 정보 미수집"}</span>
        {model.collectedAt && <span>수집 {formatAdminTime(model.collectedAt)} KST</span>}
      </div>
    </div>

    {!model.available ? <div className={styles.emptyAllocation}>
      <strong>어떤 문제가 배치됐는지 아직 확인할 수 없습니다</strong>
      <p>이 노드의 문제 목록과 예약 용량이 수집되면 여기에 표시됩니다</p>
      <p>위 사용률은 노드 전체 값이며, 문제별 점유율을 뜻하지 않습니다</p>
    </div> : <>
      <div className={styles.meters}>{model.dimensions.map((dimension) => <AllocationBar key={dimension.key} dimension={dimension} selected={active?.key} />)}</div>
      <div className={styles.legend}>
        <span><i className={styles.freeSwatch} />남은 용량</span>
        <span><i className={styles.unknownSwatch} />미확인</span>
        {model.dimensions.some((dimension) => dimension.other > 0) && <span><i className={styles.otherSwatch} />기타 예약</span>}
        <span className={styles.legendNote}>인스턴스 예약 기준 · 실사용률과 다를 수 있습니다</span>
      </div>

      {model.challenges.length > 0 && <>
        <div className={styles.listHeading}><strong>배치된 문제</strong><span>문제를 선택하면 팀별 인스턴스를 볼 수 있습니다</span></div>
        <ul className={styles.challengeList} aria-label={`${entry.node.node_name} 배치된 문제`}>
          {model.challenges.map((challenge) => <li key={challenge.key}>
            <button type="button" className={styles.challenge} aria-pressed={active?.key === challenge.key} aria-controls={detailsId}
              onClick={() => setSelected(active?.key === challenge.key ? null : challenge.key)} style={{ "--allocation-ink": challenge.color }}>
              <span className={styles.challengeNumber}>{challenge.number}</span>
              <span className={styles.challengeName}><strong>{challenge.title}</strong><span>인스턴스 {challenge.instances.length}개</span></span>
              <span className={styles.challengeAmounts}>
                {model.dimensions.map((dimension) => <span key={dimension.key}>
                  <span>{dimension.label}</span>
                  <strong>{challenge.resources[dimension.key].complete ? formatResourceAmount(challenge.resources[dimension.key].known, dimension.key) : "일부 미수집"}</strong>
                  <small>{dimension.capacity !== null && challenge.resources[dimension.key].complete
                    ? formatResourcePercent(challenge.resources[dimension.key].known / dimension.capacity * 100) : "비율 미확인"}</small>
                </span>)}
              </span>
              <span className={styles.expandMark} aria-hidden="true">{active?.key === challenge.key ? "−" : "+"}</span>
            </button>
          </li>)}
        </ul>
      </>}
      <div id={detailsId}>
        {active && <section className={styles.instances} aria-label={`${active.title} 인스턴스`}>
          <h4>{active.title}</h4>
          <ul>{active.instances.map((instance) => <li key={instance.reservation_id ?? instance.instance_id}>
            <div><strong>{instance.team_name || "팀 정보 미수집"}</strong><span>{allocationStatus(instance)}</span></div>
            <p>CPU {formatResourceAmount(instance.resources?.cpu_millicores, "cpu_millicores")} · 메모리 {formatResourceAmount(instance.resources?.memory_mib, "memory_mib")}</p>
            <details><summary>{instance.instance_id ? "인스턴스 ID" : "예약 ID · 인스턴스 식별자 미확인"}</summary><code>{instance.instance_id || instance.reservation_id}</code></details>
          </li>)}</ul>
        </section>}
      </div>
      {model.challenges.length === 0 && <p className={styles.emptyMessage}>{model.dimensions.every((dimension) => dimension.complete) ? "이 노드에 예약된 문제 인스턴스가 없습니다" : "문제별 배치 정보를 수집 중입니다"}</p>}
      {model.dimensions.some((dimension) => !dimension.complete) && <p className={styles.partialNotice}>일부 예약 정보가 빠져 있습니다 · 빗금 영역은 여유 용량으로 계산하지 않습니다</p>}
    </>}
  </div>;
}

const countFormat = new Intl.NumberFormat("ko-KR");
const FILTERS = [
  { key: "all", label: "전체" }, { key: "healthy", label: "정상" },
  { key: "attention", label: "확인 필요" }, { key: "busy", label: "사용률 높음" },
  { key: "unknown", label: "상태 미수집" },
];

function sameNodeTile(previous, next) {
  const a = previous.entry, b = next.entry;
  return previous.onSelect === next.onSelect
    && ["key", "name", "challenges", "partial", "attention", "busy"].every((key) => a[key] === b[key])
    && ["status", "cpu_usage_percent", "memory_usage_percent", "container_count", "running_instances"]
      .every((key) => a.node[key] === b.node[key] && Object.hasOwn(a.node, key) === Object.hasOwn(b.node, key));
}

const NodeTile = memo(function NodeTile({ entry, onSelect }) {
  const status = resourceStatus(entry.node.status);
  const count = resourceCount(entry.node);
  return <li className={styles.nodeCell}>
    <button type="button" className={styles.node} data-attention={entry.attention || entry.busy}
      aria-label={`${entry.name} 배치 보기`} aria-haspopup="dialog" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onSelect(entry.key); }}>
      <span className={styles.nodeStatus} data-tone={status.tone}>{status.label}</span>
      <strong className={styles.nodeName}>{entry.name}</strong>
      <span className={styles.usages}><Usage label="CPU" value={entry.node.cpu_usage_percent} /><Usage label="메모리" value={entry.node.memory_usage_percent} /></span>
      <span className={styles.nodeFooter}>
        <span>{entry.challenges === null ? "배치 미수집" : `문제 ${entry.challenges}개${entry.partial ? " · 일부 수집" : ""}`}</span>
        <span>{count.label} {count.value ?? "미수집"}</span>
      </span>
    </button>
  </li>;
}, sameNodeTile);

export default function AdminNodeResources({ resources, challengeSummary = [], initialNodeId = null }) {
  const sectionId = useId();
  const [selectedKey, setSelectedKey] = useState(initialNodeId);
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // 처음에는 노드 이름이 한 줄에 다 보이는 넓은 간격으로 열고 노드가 많을 때 촘촘히를 고른다
  const [density, setDensity] = useState("comfortable");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const accounts = resources.data?.accounts ?? [];
  const entries = useMemo(() => buildNodeOverview(resources.data?.accounts ?? []), [resources.data]);
  const view = useMemo(() => filterNodeOverview(entries, { query, accountId, status: statusFilter }), [entries, query, accountId, statusFilter]);
  const selected = entries.find((entry) => entry.key === selectedKey || entry.node.node_id === selectedKey);
  const activeAccount = accounts.find((account) => account.account_id === accountId);
  const selectNode = useCallback((key) => setSelectedKey(key), []);
  const filtered = Boolean(query || accountId || statusFilter !== "all");
  function resetFilters() { setQuery(""); setAccountId(""); setStatusFilter("all"); }
  return <section className={`${ui.card} ${styles.overview}`} aria-labelledby={sectionId}>
    <header className={ui.cardHeader}>
      <h2 id={sectionId} className={ui.cardTitle}><span className={ui.eyebrow}>NODES</span>노드 · 문제 배치</h2>
      <span className={ui.cardMeta}>{entries.length > 0 && `전체 ${countFormat.format(entries.length)}개 노드 · `}수집 {formatAdminTime(resources.data?.collected_at)} KST</span>
    </header>
    <div className={ui.cardBody}>
      <AdminStatusMessage status={resources.status} error={resources.error} onRetry={resources.retry} hasData={Boolean(resources.data)} />
      {resources.status === "success" && entries.length === 0 && <p className={styles.emptyMessage}>수집된 노드가 없습니다</p>}
      {entries.length > 0 && <>
        <p className={styles.intro}>전체 노드의 상태를 둘러보고, 노드를 눌러 문제별 배치를 확인하세요</p>
        <div className={styles.overviewToolbar}>
          <label className={styles.searchField}>노드 찾기
            <input type="search" className={ui.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="노드 이름 · 계정 · 문제명" />
          </label>
          <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen} aria-controls={`${sectionId}-filters`} onClick={() => setFiltersOpen((open) => !open)}>필터 · 보기</button>
        </div>
        <div id={`${sectionId}-filters`} hidden={!filtersOpen} className={styles.filterPanel}>
          <div className={styles.filterOptions}>
          <label className={styles.accountField}>계정
            <select className={ui.select} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">전체 계정 ({accounts.length})</option>
              {accounts.map((account) => <option key={account.account_id} value={account.account_id}>{formatResourceAccountName(account)} · {(account.nodes ?? []).length}개</option>)}
            </select>
          </label>
          <fieldset className={styles.density}><legend>노드 간격</legend>
            <button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>촘촘히</button>
            <button type="button" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>넓게</button>
          </fieldset>
          </div>
        <div className={styles.filterRow}>
          <div className={styles.statusFilters} role="group" aria-label="노드 상태 필터">
            {FILTERS.map(({ key, label }) => <button type="button" key={key} aria-label={`${label} ${countFormat.format(view.counts[key])}개`} aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>
              {label} <strong>{countFormat.format(view.counts[key])}</strong>
            </button>)}
          </div>
        </div>
        <p className={styles.filterHelp}>사용률 높음: CPU 또는 메모리 85% 이상 · 문제명은 수집된 배치 목록에서 검색합니다</p>
        </div>
        <div className={styles.overviewCaption}>
          <p role="status">{countFormat.format(entries.length)}개 중 <strong>{countFormat.format(view.total)}개 표시</strong></p>
          <p>정상 {countFormat.format(view.counts.healthy)} · 확인 필요 {countFormat.format(view.counts.attention)} · 상태 미수집 {countFormat.format(view.counts.unknown)}</p>
          {(accountId || statusFilter !== "all") && <p className={styles.activeFilters}>{[activeAccount && formatResourceAccountName(activeAccount), statusFilter !== "all" && FILTERS.find((filter) => filter.key === statusFilter)?.label].filter(Boolean).join(" · ") || "계정 확인 필요"}</p>}
          {filtered && <button type="button" className={styles.resetFilters} onClick={resetFilters}>필터 초기화</button>}
        </div>
        <div className={styles.nodeGroups} data-density={density}>
          {view.groups.map((group) => <section key={group.account.account_id} className={styles.account} aria-label={`${group.name} 노드 그룹`}>
            <div className={styles.accountHeading}><h3>{group.name}</h3><AdminBadge tone={resourceStatus(group.account.status).tone}>{resourceStatus(group.account.status).label}</AdminBadge><span>{countFormat.format(group.entries.length)}개 노드</span></div>
            <ul className={styles.nodes} aria-label={`${group.name} 노드`}>
              {group.entries.map((entry) => <NodeTile key={entry.key} entry={entry} onSelect={selectNode} />)}
            </ul>
          </section>)}
        </div>
        <p className={styles.mapLegend}>CPU·메모리 막대는 노드 실사용률입니다 · 노드를 누르면 문제별 예약 자원을 볼 수 있습니다</p>
        {view.total === 0 && <div className={styles.noResults}><strong>조건에 맞는 노드가 없습니다</strong><p>검색어나 계정, 상태 필터를 확인해주세요</p><button type="button" className={ui.button} onClick={resetFilters}>전체 노드 보기</button></div>}
      </>}
      {selectedKey && !selected && <p role="status" className={styles.emptyMessage}>선택한 노드가 최신 수집 목록에 없습니다</p>}
      {selected && <AdminDialog title="노드별 문제 배치" wide onClose={() => setSelectedKey(null)}>
        <div className={styles.resourceContent}>
        <AllocationDetail key={selected.key} entry={selected} />
        {!Array.isArray(selected?.node.resource_allocation?.allocations) && challengeSummary.length > 0 && <details className={styles.allChallenges} open>
          <summary>전체 실행 문제 · {challengeSummary.length}개</summary>
          <p>노드별 배치가 확인되기 전 전체 실행 현황입니다</p>
          <ul>{challengeSummary.map((challenge) => <li key={challenge.challenge_id}><span>{challenge.challenge_title}</span><strong>{challenge.running_count}개 실행</strong></li>)}</ul>
        </details>}
        </div>
      </AdminDialog>}
    </div>
  </section>;
}
