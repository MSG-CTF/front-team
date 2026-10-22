import { formatResourceAccountName } from "./adminBoard.js";

const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ko");
const nameOrder = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
const highUsage = (value) => Number.isFinite(value) && value >= 85;

// Index once per resource snapshot; opening a node does not rebuild every reservation model.
export function buildNodeOverview(accounts = []) {
  return accounts.flatMap((account) => {
    const accountName = formatResourceAccountName(account);
    return (account.nodes ?? []).map((node) => {
      const allocations = node.resource_allocation?.allocations;
      const challengeIds = new Set();
      const challengeNames = new Set();
      for (const item of Array.isArray(allocations) ? allocations : []) {
        if (item?.challenge_id) challengeIds.add(item.challenge_id);
        if (item?.challenge_title) challengeNames.add(item.challenge_title);
      }
      return {
        key: JSON.stringify([account.account_id, node.node_id]), account, accountName, node,
        name: node.node_name || node.node_id || "이름 미수집",
        challenges: Array.isArray(allocations) ? challengeIds.size : null,
        partial: Array.isArray(allocations) && node.resource_allocation.complete !== true,
        healthy: node.status === "HEALTHY", attention: node.status === "DEGRADED",
        unknown: !["HEALTHY", "DEGRADED"].includes(node.status),
        busy: highUsage(node.cpu_usage_percent) || highUsage(node.memory_usage_percent),
        search: normalize([accountName, account.account_id, node.node_name, node.node_id, ...challengeNames].join(" ")),
      };
    }).sort((a, b) => nameOrder.compare(a.name, b.name) || a.key.localeCompare(b.key));
  });
}

export function filterNodeOverview(entries, { query = "", accountId = "", status = "all" } = {}) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const scoped = entries.filter((entry) => (!accountId || entry.account.account_id === accountId)
    && terms.every((term) => entry.search.includes(term)));
  const counts = { all: scoped.length, healthy: 0, attention: 0, busy: 0, unknown: 0 };
  const groups = new Map();
  let total = 0;
  for (const entry of scoped) {
    for (const key of ["healthy", "attention", "busy", "unknown"]) if (entry[key]) counts[key]++;
    if (status !== "all" && !entry[status]) continue;
    const id = entry.account.account_id;
    if (!groups.has(id)) groups.set(id, { account: entry.account, name: entry.accountName, entries: [] });
    groups.get(id).entries.push(entry);
    total++;
  }
  return { groups: [...groups.values()], counts, total };
}
