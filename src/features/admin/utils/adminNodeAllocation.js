// resource_allocation is an optional, atomic broker snapshot (see docs/admin-node-allocation.md).
// Node usage percentages and challenge counts cannot establish per-challenge reservations.
export const ALLOCATION_DIMENSIONS = [
  { key: "cpu_millicores", label: "CPU" },
  { key: "memory_mib", label: "메모리" },
];

const INK_COLORS = ["#61713c", "#94671e", "#934d36", "#486966", "#765569", "#6d693d"];
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
const quantity = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const identifier = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

export function formatResourceAmount(value, key) {
  if (quantity(value) === null) return "미수집";
  if (key === "cpu_millicores" && value > 0 && value < 10) return `${number.format(value)} mCPU`;
  if (key === "cpu_millicores") return `${number.format(value / 1000)} 코어`;
  return value >= 1024 ? `${number.format(value / 1024)} GiB` : `${number.format(value)} MiB`;
}

export function formatResourcePercent(value) {
  if (quantity(value) !== null && value > 0 && value < .05) return "0.1% 미만";
  return quantity(value) === null ? "미수집" : `${percent.format(value)}%`;
}

export function resourceCount(resource) {
  // A reported null in the current contract must not fall back to a legacy count.
  const containers = Object.hasOwn(resource, "container_count");
  const value = quantity(resource[containers ? "container_count" : "running_instances"]);
  return { label: containers ? "컨테이너" : "실행 인스턴스", value: Number.isInteger(value) ? value : null };
}

export function resourceStatus(status) {
  if (status === "HEALTHY") return { label: "정상", tone: "good" };
  if (status === "DEGRADED") return { label: "확인 필요", tone: "warn" };
  return { label: status || "상태 미수집", tone: "quiet" };
}

export function allocationColor(key) {
  let hash = 0;
  for (const letter of key) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
  return INK_COLORS[hash % INK_COLORS.length];
}

export function allocationStatus(record) {
  if (record.reservation_status === "HELD") return "실행 준비 · 예약 중";
  if (record.reservation_status === "COMMITTED") {
    if (["STOPPING", "CLEANUP_PENDING"].includes(record.status)) return "정리 중 · 예약 유지";
    if (["STOPPED", "CLEANED", "FAILED", "EXPIRED"].includes(record.status)) return "예약 반납 대기";
    return record.status === "RUNNING" ? "실행 중 · 예약 확정" : "실행 예약 확정";
  }
  return record.status || "상태 미수집";
}

export function buildNodeAllocation(node) {
  const snapshot = node?.resource_allocation;
  const available = Array.isArray(snapshot?.allocations);
  const groups = new Map();
  const seen = new Set();
  let valid = available;

  for (const record of available ? snapshot.allocations : []) {
    const instanceId = identifier(record?.reservation_id) ?? identifier(record?.instance_id);
    if (!instanceId || seen.has(instanceId)) {
      valid = false;
      continue;
    }
    seen.add(instanceId);
    const challengeId = identifier(record.challenge_id);
    if (!challengeId) valid = false;
    const key = challengeId ?? `unknown:${instanceId}`;
    if (!groups.has(key)) groups.set(key, {
      key, challengeId, title: identifier(record.challenge_title) ?? "문제명 미수집",
      color: allocationColor(key), instances: [], resources: {},
    });
    groups.get(key).instances.push(record);
  }

  const challenges = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, "ko") || a.key.localeCompare(b.key));
  challenges.forEach((challenge, index) => {
    challenge.number = String(index + 1).padStart(2, "0");
    for (const { key } of ALLOCATION_DIMENSIONS) {
      const values = challenge.instances.map((record) => quantity(record.resources?.[key]));
      challenge.resources[key] = {
        known: values.reduce((total, value) => total + (value ?? 0), 0),
        complete: values.every((value) => value !== null),
      };
    }
  });

  const dimensions = ALLOCATION_DIMENSIONS.map(({ key, label }) => {
    const capacityValue = quantity(snapshot?.allocatable?.[key]);
    const capacity = capacityValue > 0 ? capacityValue : null;
    const other = quantity(snapshot?.other_reserved?.[key]);
    const known = challenges.reduce((total, challenge) => total + challenge.resources[key].known, other ?? 0);
    const complete = valid && snapshot?.complete === true && other !== null
      && challenges.every((challenge) => challenge.resources[key].complete);
    const denominator = capacity === null ? null : Math.max(capacity, known);
    const overflow = capacity === null ? null : Math.max(0, known - capacity);
    return {
      key, label, capacity, known, other, complete, denominator, overflow,
      remaining: complete && capacity !== null ? Math.max(0, capacity - known) : null,
      percent: capacity === null ? null : known / capacity * 100,
      segments: challenges.filter((challenge) => challenge.resources[key].known > 0).map((challenge) => ({
        key: challenge.key, number: challenge.number, title: challenge.title, color: challenge.color,
        value: challenge.resources[key].known,
        width: denominator === null ? 0 : challenge.resources[key].known / denominator * 100,
      })),
    };
  });

  return { available, challenges, dimensions, collectedAt: snapshot?.collected_at };
}
