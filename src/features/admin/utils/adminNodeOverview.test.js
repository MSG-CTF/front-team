import test from "node:test";
import assert from "node:assert/strict";
import { accountProvider, allocationSupported, buildNodeOverview, diskSupported, displayNodeName, filterNodeOverview, nodeArch, nodeOs, osSupported, platformLabel, providerLabel, rankNodes, splitNodeName, nodeCapacity, formatCapacity, sumCapacity } from "./adminNodeOverview.js";

const accounts = [
  { account_id: "a", provider: "GCP", scope_id: "festival-prod", nodes: [
    { node_id: "n2", node_name: "pool-2", status: "HEALTHY", cpu_usage_percent: 85, memory_usage_percent: 20 },
    { node_id: "n10", node_name: "pool-10", status: "DEGRADED", cpu_usage_percent: 10, memory_usage_percent: 50 },
    { node_id: "n1", node_name: "pool-1", status: null, cpu_usage_percent: null, memory_usage_percent: "98" },
  ] },
  { account_id: "b", provider: "AWS", scope_id: "festival-test", nodes: [
    { node_id: "n2", node_name: "pool-2", status: "HEALTHY", cpu_usage_percent: 5, memory_usage_percent: 90,
      resource_allocation: { complete: false, allocations: [
        { challenge_id: "web", challenge_title: "가을 게시판" },
        { challenge_id: "web", challenge_title: "가을 게시판" },
        { challenge_id: "pwn", challenge_title: "티켓 발매기" },
      ] } },
  ] },
];

test("overview includes every node, preserves account grouping and sorts natural node numbers", () => {
  const before = structuredClone(accounts);
  const entries = buildNodeOverview(accounts);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.slice(0,3).map(entry=>entry.name), ["pool-1","pool-2","pool-10"]);
  assert.equal(new Set(entries.map(entry=>entry.key)).size, 4);
  assert.deepEqual(accounts, before);
  assert.equal(filterNodeOverview(entries).total, 4);
});

test("case-insensitive multi-term search matches the account, node ID and reported challenge titles", () => {
  const entries = buildNodeOverview(accounts);
  assert.equal(filterNodeOverview(entries,{query:"  gcp   ＰＯＯＬ-2 "}).total, 1);
  assert.equal(filterNodeOverview(entries,{query:"aws 게시판"}).total, 1);
  assert.equal(filterNodeOverview(entries,{query:"n10"}).groups[0].entries[0].node.node_id, "n10");
  assert.equal(filterNodeOverview(entries,{query:"없는 문제"}).total, 0);
});

test("status counters follow account and search scope while busy usage can overlap healthy state", () => {
  const entries = buildNodeOverview(accounts);
  assert.deepEqual(filterNodeOverview(entries).counts, {all:4,healthy:2,attention:1,busy:2,unknown:1});
  const result = filterNodeOverview(entries,{accountId:"a",status:"busy"});
  assert.equal(result.total, 1);
  assert.deepEqual(result.counts,{all:3,healthy:1,attention:1,busy:1,unknown:1});
  assert.equal(filterNodeOverview(entries,{accountId:"missing"}).total, 0);
});

test("missing and string measurements never become busy or zero; partial allocation counts are marked", () => {
  const entries = buildNodeOverview(accounts);
  assert.equal(entries[0].busy, false);
  assert.equal(entries[0].challenges, null);
  assert.equal(entries[3].challenges, 2);
  assert.equal(entries[3].partial, true);
});

test("large snapshots have no silent page limit and a removed node disappears from searches", () => {
  const large = [{account_id:"a",nodes:Array.from({length:1000},(_,index)=>({node_id:String(index),node_name:`node-${index+1}`,status:"HEALTHY"}))}];
  assert.equal(filterNodeOverview(buildNodeOverview(large)).total, 1000);
  assert.equal(filterNodeOverview(buildNodeOverview(large),{query:"node-1000"}).total, 1);
  large[0].nodes.pop();
  assert.equal(filterNodeOverview(buildNodeOverview(large),{query:"node-1000"}).total, 0);
  assert.equal(filterNodeOverview(buildNodeOverview([])).total, 0);
});

test("배치 계약 지원 여부는 노드 하나라도 allocations 배열을 보낼 때만 참이다", () => {
  const overview = (allocation) => buildNodeOverview([{ account_id: "a", provider: "GCP", scope_id: "s", status: "HEALTHY",
    nodes: [{ node_id: "n1", node_name: "pool-1", status: "HEALTHY", cpu_usage_percent: 10, memory_usage_percent: 10, ...allocation }] }]);
  assert.equal(allocationSupported(overview({})), false);
  assert.equal(allocationSupported(overview({ resource_allocation: { complete: true } })), false);
  assert.equal(allocationSupported(overview({ resource_allocation: { complete: true, allocations: [] } })), true);
  assert.equal(allocationSupported([]), false);
});

test("도메인이 붙은 호스트명은 첫 라벨만 보이고 짧은 이름은 그대로 둔다", () => {
  assert.equal(displayNodeName("ip-10-20-3-17.ap-northeast-2.compute.internal"), "ip-10-20-3-17");
  assert.equal(displayNodeName("gke-msgctf-pool-a-1"), "gke-msgctf-pool-a-1");
  assert.equal(displayNodeName("node.local"), "node.local");
  assert.equal(displayNodeName(null), "");
});

test("운영체제는 계약의 os 값으로만 읽고 이름으로 추측하지 않는다", () => {
  assert.equal(nodeOs({ os: "WINDOWS" }), "WINDOWS");
  assert.equal(nodeOs({ os: " linux " }), "LINUX");
  assert.equal(nodeOs({ os: "BSD" }), null);
  assert.equal(nodeOs({ node_name: "win-pool-1" }), null);
  assert.equal(nodeOs(null), null);
});

test("운영체제 필터와 개수는 os 를 보내는 노드가 있을 때만 의미가 있다", () => {
  const mixed = [{ account_id: "a", provider: "GCP", scope_id: "s", status: "HEALTHY", nodes: [
    { node_id: "l1", node_name: "pool-1", status: "HEALTHY", os: "LINUX" },
    { node_id: "w1", node_name: "pool-2", status: "HEALTHY", os: "WINDOWS" },
    { node_id: "u1", node_name: "pool-3", status: "HEALTHY" },
  ] }];
  const entries = buildNodeOverview(mixed);
  assert.equal(osSupported(entries), true);
  assert.equal(osSupported(buildNodeOverview(accounts)), false);
  const view = filterNodeOverview(entries, { os: "WINDOWS" });
  assert.deepEqual(view.groups[0].entries.map((entry) => entry.node.node_id), ["w1"]);
  assert.deepEqual(view.facets.os, { LINUX: 1, WINDOWS: 1 });
  assert.equal(filterNodeOverview(entries, { query: "windows" }).total, 1);
});

test("macOS와 아키텍처 표기는 클라우드마다 달라도 한 이름으로 모은다", () => {
  assert.equal(nodeOs({ os: "darwin" }), "MACOS");
  assert.equal(nodeOs({ os: "Mac OS" }), "MACOS");
  assert.equal(nodeArch({ arch: "amd64" }), "X64");
  assert.equal(nodeArch({ arch: "x86_64" }), "X64");
  assert.equal(nodeArch({ architecture: "linux/arm64" }), "ARM64");
  assert.equal(nodeArch({ arch: "aarch64" }), "ARM64");
  assert.equal(nodeArch({ arch: "i686" }), "X86");
  assert.equal(nodeArch({ arch: "mips" }), null);
  assert.equal(nodeArch({}), null);
});

test("플랫폼은 AWS, GCP, Azure, Oracle, NCP, 자체 서버를 알아보고 모르는 값은 기타로 둔다", () => {
  assert.equal(accountProvider({ provider: "aws" }), "AWS");
  assert.equal(accountProvider({ provider: "Google Cloud" }), "GCP");
  assert.equal(accountProvider({ provider: "AZURE" }), "AZURE");
  assert.equal(accountProvider({ provider: "Oracle" }), "OCI");
  assert.equal(accountProvider({ provider: "naver-cloud" }), "NCP");
  assert.equal(accountProvider({ provider: "on-prem" }), "ONPREM");
  assert.equal(accountProvider({ provider: "Linode" }), "OTHER");
  assert.equal(providerLabel({ provider: "Linode" }), "Linode");
  assert.equal(accountProvider({}), null);
});

test("플랫폼·운영체제·아키텍처 필터는 함께 걸리고 디스크가 차도 사용률 높음으로 센다", () => {
  const fleet = [
    { account_id: "aws", provider: "AWS", scope_id: "x", nodes: [
      { node_id: "a1", node_name: "a-1", status: "HEALTHY", os: "LINUX", arch: "arm64", cpu_usage_percent: 10, memory_usage_percent: 10, disk_usage_percent: 91 },
      { node_id: "a2", node_name: "a-2", status: "HEALTHY", os: "WINDOWS", arch: "amd64", cpu_usage_percent: 10, memory_usage_percent: 10, disk_usage_percent: 20 },
    ] },
    { account_id: "oci", provider: "OCI", scope_id: "y", nodes: [
      { node_id: "o1", node_name: "o-1", status: "HEALTHY", os: "LINUX", arch: "aarch64", cpu_usage_percent: 10, memory_usage_percent: 10 },
    ] },
  ];
  const entries = buildNodeOverview(fleet);
  assert.equal(diskSupported(entries), true);
  assert.equal(diskSupported(buildNodeOverview(accounts)), false);
  const all = filterNodeOverview(entries);
  assert.deepEqual(all.facets, { provider: { AWS: 2, OCI: 1 }, platform: { "LINUX:ARM64": 2, "WINDOWS:X64": 1 }, os: { LINUX: 2, WINDOWS: 1 }, arch: { ARM64: 2, X64: 1 } });
  assert.equal(filterNodeOverview(entries, { platform: "LINUX:ARM64" }).total, 2);
  assert.equal(filterNodeOverview(entries, { query: "amd64" }).total, 1);
  assert.equal(all.counts.busy, 1);
  assert.equal(filterNodeOverview(entries, { os: "LINUX", arch: "ARM64" }).total, 2);
  assert.equal(filterNodeOverview(entries, { provider: "OCI", arch: "ARM64" }).total, 1);
  assert.equal(filterNodeOverview(entries, { provider: "AWS", status: "busy" }).total, 1);
  assert.equal(filterNodeOverview(entries, { query: "oracle" }).total, 1);
  assert.equal(filterNodeOverview(entries, { query: "arm64" }).total, 2);
});

test("운영체제와 아키텍처는 한 이름으로 보인다 Linux x86_64, macOS arm64", () => {
  assert.equal(platformLabel("LINUX:X64"), "Linux x86_64");
  assert.equal(platformLabel("MACOS:ARM64"), "macOS arm64");
  assert.equal(platformLabel("WINDOWS:"), "Windows");
  assert.equal(platformLabel(":ARM"), "armv7");
  assert.equal(platformLabel(null), "");
  const [entry] = buildNodeOverview([{ account_id: "a", provider: "AWS", nodes: [{ node_id: "m", node_name: "mac-1", os: "darwin", arch: "aarch64" }] }]);
  assert.equal(entry.platform, "MACOS:ARM64");
});

test("같은 클라우드의 계정은 한 묶음이 되고 클라우드 값이 없으면 계정마다 묶는다", () => {
  const fleet = [
    { account_id: "p", provider: "GCP", scope_id: "prod", nodes: [{ node_id: "p1", node_name: "p-1", status: "HEALTHY" }] },
    { account_id: "b", provider: "gcp", scope_id: "burst", nodes: [{ node_id: "b1", node_name: "b-1", status: "HEALTHY" }] },
    { account_id: "w", provider: "AWS", scope_id: "koth", nodes: [{ node_id: "w1", node_name: "w-1", status: "HEALTHY" }] },
    { account_id: "x", scope_id: "legacy", nodes: [{ node_id: "x1", node_name: "x-1", status: "HEALTHY" }] },
    { account_id: "l", provider: "Linode", scope_id: "lab", nodes: [{ node_id: "l1", node_name: "l-1", status: "HEALTHY" }] },
  ];
  const { groups } = filterNodeOverview(buildNodeOverview(fleet));
  assert.deepEqual(groups.map((group) => group.provider), ["AWS", "GCP", "OTHER", null]);
  assert.equal(groups[1].entries.length, 2);
  assert.equal(groups[1].accounts.length, 2);
  assert.equal(groups[2].name, "Linode");
});

test("위급한 노드가 먼저 온다 확인 필요, 미수집, 사용률 높음, 그다음 가장 찬 순서", () => {
  const entries = buildNodeOverview([{ account_id: "a", provider: "GCP", nodes: [
    { node_id: "1", node_name: "calm", status: "HEALTHY", cpu_usage_percent: 30 },
    { node_id: "2", node_name: "hot", status: "HEALTHY", cpu_usage_percent: 92 },
    { node_id: "3", node_name: "warn", status: "DEGRADED", cpu_usage_percent: 10 },
    { node_id: "4", node_name: "lost", status: null },
    { node_id: "5", node_name: "warm", status: "HEALTHY", memory_usage_percent: 75 },
  ] }]);
  assert.deepEqual(rankNodes(entries).map((entry) => entry.name), ["warn", "lost", "hot", "warm", "calm"]);
});

test("이름이 길면 앞쪽을 줄이고 끝 조각은 남긴다", () => {
  assert.deepEqual(splitNodeName("gke-msgctf-pool-b-3"), ["gke-msgctf-pool", "-b-3"]);
  assert.deepEqual(splitNodeName("aks-winpool-0001"), ["aks-winpool", "-0001"]);
  assert.deepEqual(splitNodeName("ip-10-20-3-17"), ["ip-10-20", "-3-17"]);
  assert.deepEqual(splitNodeName("verylongnodenamewithoutseparators"), ["verylongnodenamewithoutsepa", "rators"]);
  assert.deepEqual(splitNodeName("pool"), ["pool", ""]);
  assert.equal(splitNodeName("gke-msgctf-pool-b-3").join(""), "gke-msgctf-pool-b-3");
});

test("계정별로도 묶을 수 있고 용량은 capacity, 없으면 allocatable 로 읽는다", () => {
  const fleet = [
    { account_id: "p", provider: "GCP", scope_id: "prod", nodes: [
      { node_id: "a", node_name: "a", status: "HEALTHY", capacity: { cpu_millicores: 4000, memory_mib: 16384, disk_gib: 100 }, instance_type: "e2-standard-4" },
      { node_id: "b", node_name: "b", status: "HEALTHY", resource_allocation: { allocatable: { cpu_millicores: 2000, memory_mib: 8192 } } },
    ] },
    { account_id: "q", provider: "GCP", scope_id: "burst", nodes: [{ node_id: "c", node_name: "c", status: "HEALTHY" }] },
  ];
  const entries = buildNodeOverview(fleet);
  const byAccount = filterNodeOverview(entries, { groupBy: "account" });
  assert.deepEqual(byAccount.groups.map((group) => group.name), ["burst", "prod"]);
  assert.equal(byAccount.groups.length, 2);
  assert.ok(byAccount.groups.every((group) => group.account));
  assert.equal(filterNodeOverview(entries).groups.length, 1);
  assert.deepEqual(nodeCapacity(fleet[0].nodes[0]), { cpu: 4000, memory: 16384, disk: 100, instanceType: "e2-standard-4" });
  assert.deepEqual(nodeCapacity(fleet[0].nodes[1]), { cpu: 2000, memory: 8192, disk: null, instanceType: null });
  assert.equal(formatCapacity(nodeCapacity(fleet[0].nodes[0])), "4 코어 · 16 GiB · 디스크 100 GiB");
  assert.deepEqual(sumCapacity(entries.filter((entry) => entry.account.account_id === "p")), { cpu: 6000, memory: 24576, disk: 100 });
  assert.equal(formatCapacity({ cpu: null, memory: null, disk: null }), "");
});
