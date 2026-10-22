import { formatResourceAccountName } from "./adminBoard.js";

const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ko");
const nameOrder = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
const highUsage = (value) => Number.isFinite(value) && value >= 85;
const token = (value) => (typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "");

// 운영체제·아키텍처·플랫폼은 계약 값으로만 판단한다 이름이나 계정으로 추측하지 않는다
// 값의 표기가 클라우드마다 달라서(amd64, x86_64, aarch64 …) 별칭을 한 이름으로 모은다
export const NODE_OS = ["LINUX", "WINDOWS", "MACOS"];
export const OS_LABELS = { LINUX: "Linux", WINDOWS: "Windows", MACOS: "macOS" };
const OS_ALIASES = { LINUX: "LINUX", WINDOWS: "WINDOWS", WIN: "WINDOWS", MACOS: "MACOS", MAC: "MACOS", OSX: "MACOS", DARWIN: "MACOS" };

export function nodeOs(node) {
  return OS_ALIASES[token(node?.os)] ?? null;
}

export const NODE_ARCH = ["X64", "ARM64", "X86", "ARM"];
// 운영자가 uname이나 이미지 태그에서 보던 이름 그대로 보인다
export const ARCH_LABELS = { X64: "x86_64", ARM64: "arm64", X86: "x86", ARM: "armv7" };
const ARCH_SEARCH = { X64: "x86_64 x64 amd64", ARM64: "arm64 aarch64", X86: "x86 i386 i686", ARM: "armv7 arm32 armhf" };
const ARCH_ALIASES = {
  X64: "X64", X8664: "X64", AMD64: "X64", INTEL64: "X64",
  ARM64: "ARM64", AARCH64: "ARM64", ARM64V8: "ARM64",
  X86: "X86", I386: "X86", I686: "X86", "386": "X86", IA32: "X86", X8632: "X86",
  ARM: "ARM", ARMV7: "ARM", ARMV7L: "ARM", ARMHF: "ARM", ARM32: "ARM",
};

// "linux/amd64"처럼 플랫폼이 붙어 와도 뒤쪽 아키텍처만 읽는다
export function nodeArch(node) {
  const raw = node?.arch ?? node?.architecture;
  if (typeof raw !== "string") return null;
  return ARCH_ALIASES[token(raw.split("/").pop())] ?? null;
}

// 운영체제와 아키텍처는 한 묶음으로 본다 "Linux x86_64", "macOS arm64"
// 둘 중 하나만 오면 아는 쪽만 보인다
export function platformKey(os, arch) {
  return os || arch ? `${os ?? ""}:${arch ?? ""}` : null;
}

export function platformLabel(key) {
  if (!key) return "";
  const [os, arch] = key.split(":");
  return [OS_LABELS[os], ARCH_LABELS[arch]].filter(Boolean).join(" ");
}

export function platformOrder(key) {
  const [os, arch] = String(key).split(":");
  const osIndex = os ? NODE_OS.indexOf(os) : NODE_OS.length;
  const archIndex = arch ? NODE_ARCH.indexOf(arch) : NODE_ARCH.length;
  return osIndex * 10 + archIndex;
}

export const PROVIDER_ORDER = ["AWS", "GCP", "AZURE", "OCI", "NCP", "KT", "NHN", "ONPREM", "OTHER"];

export const PROVIDER_LABELS = {
  AWS: "AWS", GCP: "Google Cloud", AZURE: "Azure", OCI: "Oracle Cloud", NCP: "NAVER Cloud",
  KT: "KT Cloud", NHN: "NHN Cloud", ONPREM: "자체 서버", OTHER: "기타",
};
const PROVIDER_ALIASES = {
  AWS: "AWS", AMAZON: "AWS", AMAZONWEBSERVICES: "AWS", EC2: "AWS", EKS: "AWS",
  GCP: "GCP", GOOGLE: "GCP", GOOGLECLOUD: "GCP", GCE: "GCP", GKE: "GCP",
  AZURE: "AZURE", MICROSOFTAZURE: "AZURE", AKS: "AZURE",
  OCI: "OCI", ORACLE: "OCI", ORACLECLOUD: "OCI",
  NCP: "NCP", NAVER: "NCP", NAVERCLOUD: "NCP", NCLOUD: "NCP",
  KT: "KT", KTCLOUD: "KT", NHN: "NHN", NHNCLOUD: "NHN", TOAST: "NHN",
  ONPREM: "ONPREM", ONPREMISE: "ONPREM", ONPREMISES: "ONPREM", BAREMETAL: "ONPREM", LOCAL: "ONPREM", SELFHOSTED: "ONPREM",
};

export function accountProvider(account) {
  const value = token(account?.provider);
  if (!value) return null;
  return PROVIDER_ALIASES[value] ?? "OTHER";
}

export function providerLabel(account) {
  const provider = accountProvider(account);
  return provider === "OTHER" ? String(account.provider).trim() : PROVIDER_LABELS[provider] ?? "";
}

// Index once per resource snapshot; opening a node does not rebuild every reservation model.
export function buildNodeOverview(accounts = []) {
  return accounts.flatMap((account) => {
    const accountName = formatResourceAccountName(account);
    // 묶음 머리에 이미 클라우드 이름이 있으니 계정은 범위 이름만 짧게 쓴다
    const accountScope = account.scope_id || account.account_id || accountName;
    const provider = accountProvider(account);
    return (account.nodes ?? []).map((node) => {
      const allocations = node.resource_allocation?.allocations;
      const challengeIds = new Set();
      const challengeNames = new Set();
      for (const item of Array.isArray(allocations) ? allocations : []) {
        if (item?.challenge_id) challengeIds.add(item.challenge_id);
        if (item?.challenge_title) challengeNames.add(item.challenge_title);
      }
      const os = nodeOs(node);
      const arch = nodeArch(node);
      const platform = platformKey(os, arch);
      return {
        key: JSON.stringify([account.account_id, node.node_id]), account, accountName, accountScope, node,
        name: node.node_name || node.node_id || "이름 미수집",
        challenges: Array.isArray(allocations) ? challengeIds.size : null,
        partial: Array.isArray(allocations) && node.resource_allocation.complete !== true,
        healthy: node.status === "HEALTHY", attention: node.status === "DEGRADED",
        unknown: !["HEALTHY", "DEGRADED"].includes(node.status),
        busy: highUsage(node.cpu_usage_percent) || highUsage(node.memory_usage_percent) || highUsage(node.disk_usage_percent),
        os, arch, platform, provider,
        search: normalize([accountName, account.account_id, node.node_name, node.node_id, os && OS_LABELS[os], arch && ARCH_SEARCH[arch],
          provider && PROVIDER_LABELS[provider], ...challengeNames].join(" ")),
      };
    }).sort((a, b) => nameOrder.compare(a.name, b.name) || a.key.localeCompare(b.key));
  });
}

export const NODE_STATUS_FILTERS = ["all", "healthy", "attention", "busy", "unknown"];

// 상태(하나)와 플랫폼·운영체제(각각 하나)를 함께 걸 수 있다
// 개수는 검색과 계정 범위 안에서 센다 그래야 필터 칩의 숫자가 지금 볼 수 있는 노드와 맞는다
// 묶음은 클라우드 단위다 같은 GCP 계정 두 개는 GCP 한 묶음 안에 계정 이름을 달고 들어간다
// 클라우드 값이 없는 예전 응답은 계정마다 따로 묶는다
export function filterNodeOverview(entries, { query = "", accountId = "", status = "all", provider = "", platform = "", os = "", arch = "", groupBy = "provider" } = {}) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const scoped = entries.filter((entry) => (!accountId || entry.account.account_id === accountId)
    && terms.every((term) => entry.search.includes(term)));
  const counts = { all: scoped.length, healthy: 0, attention: 0, busy: 0, unknown: 0 };
  const facets = { provider: {}, platform: {}, os: {}, arch: {} };
  const groups = new Map();
  let total = 0;
  for (const entry of scoped) {
    for (const key of ["healthy", "attention", "busy", "unknown"]) if (entry[key]) counts[key]++;
    for (const facet of ["provider", "platform", "os", "arch"]) if (entry[facet]) facets[facet][entry[facet]] = (facets[facet][entry[facet]] ?? 0) + 1;
    if (status !== "all" && !entry[status]) continue;
    if ((provider && entry.provider !== provider) || (platform && entry.platform !== platform)
      || (os && entry.os !== os) || (arch && entry.arch !== arch)) continue;
    const byAccount = groupBy === "account" || !entry.provider;
    const id = byAccount ? `account:${entry.account.account_id}`
      : entry.provider === "OTHER" ? `provider:OTHER:${providerLabel(entry.account)}` : `provider:${entry.provider}`;
    if (!groups.has(id)) groups.set(id, {
      id, provider: entry.provider, account: byAccount ? entry.account : null,
      name: byAccount ? entry.accountScope : providerLabel(entry.account), accounts: [], entries: [],
    });
    const group = groups.get(id);
    if (!group.accounts.includes(entry.accountScope)) group.accounts.push(entry.accountScope);
    group.entries.push(entry);
    total++;
  }
  const order = (group) => group.provider ? PROVIDER_ORDER.indexOf(group.provider) : PROVIDER_ORDER.length;
  const sorted = [...groups.values()].sort((a, b) => order(a) - order(b) || nameOrder.compare(a.name, b.name));
  return { groups: sorted, counts, facets, total };
}

// 노드 용량: 백엔드가 capacity 를 주면 그 값을(프론트 요청), 없으면 배치 계약의 allocatable 을 쓴다 디스크는 capacity 에만 있다
export function nodeCapacity(node) {
  const positive = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null);
  const capacity = node?.capacity ?? {};
  const allocatable = node?.resource_allocation?.allocatable ?? {};
  return {
    cpu: positive(capacity.cpu_millicores) ?? positive(allocatable.cpu_millicores),
    memory: positive(capacity.memory_mib) ?? positive(allocatable.memory_mib),
    disk: positive(capacity.disk_gib),
    instanceType: typeof node?.instance_type === "string" && node.instance_type.trim() ? node.instance_type.trim() : null,
  };
}

const capacityNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });
export function formatCapacity({ cpu, memory, disk } = {}) {
  return [
    cpu !== null && cpu !== undefined && `${capacityNumber.format(cpu / 1000)} 코어`,
    memory !== null && memory !== undefined && `${capacityNumber.format(memory / 1024)} GiB`,
    disk !== null && disk !== undefined && `디스크 ${capacityNumber.format(disk)} GiB`,
  ].filter(Boolean).join(" · ");
}

export function sumCapacity(entries = []) {
  return entries.reduce((total, entry) => {
    const capacity = nodeCapacity(entry.node);
    for (const key of ["cpu", "memory", "disk"]) if (capacity[key] !== null) total[key] = (total[key] ?? 0) + capacity[key];
    return total;
  }, { cpu: null, memory: null, disk: null });
}

// 위급한 노드부터: 확인 필요와 미수집, 사용률 높음, 그다음 가장 찬 자원 순
export function nodeSeverity(entry) {
  const usage = Math.max(...["cpu_usage_percent", "memory_usage_percent", "disk_usage_percent"]
    .map((key) => entry.node[key]).filter((value) => Number.isFinite(value)), 0);
  return (entry.attention ? 3000 : entry.unknown ? 2000 : 0) + (entry.busy ? 1000 : 0) + usage;
}

export function rankNodes(entries) {
  return [...entries].sort((a, b) => nodeSeverity(b) - nodeSeverity(a) || nameOrder.compare(a.name, b.name));
}

// 배치 계약(resource_allocation)은 선택 필드라 어느 노드도 보내지 않는 배포에서는 미수집을 경고로 세지 않는다
export function allocationSupported(entries) {
  return entries.some((entry) => Array.isArray(entry.node?.resource_allocation?.allocations));
}

// 계약 값을 보내는 노드가 하나라도 있을 때만 그 필터를 보인다
export function osSupported(entries) {
  return entries.some((entry) => entry.os);
}

export function diskSupported(entries) {
  return entries.some((entry) => Object.hasOwn(entry.node, "disk_usage_percent"));
}

// 노드 이름은 앞부분이 같고 끝이 다른 경우가 많다(gke-msgctf-pool-b-3, -b-4)
// 좁을 때는 앞쪽을 줄이고 끝 조각은 남기도록 이름을 머리와 꼬리로 나눈다
export function splitNodeName(name) {
  const text = String(name ?? "");
  const separators = [...text.matchAll(/[-_.]/g)].map((match) => match.index);
  for (const cut of [separators.at(-2), separators.at(-1)]) {
    if (cut !== undefined && cut > 0 && text.length - cut <= 8) return [text.slice(0, cut), text.slice(cut)];
  }
  if (text.length <= 8) return [text, ""];
  return [text.slice(0, -6), text.slice(-6)];
}

// 도메인까지 붙은 긴 호스트명은 첫 라벨만 보이고 전체 이름은 title로 남긴다
// ip-10-20-3-17.ap-northeast-2.compute.internal -> ip-10-20-3-17
export function displayNodeName(name) {
  const text = String(name ?? "");
  const labels = text.split(".");
  return labels.length >= 3 && labels[0] ? labels[0] : text;
}
