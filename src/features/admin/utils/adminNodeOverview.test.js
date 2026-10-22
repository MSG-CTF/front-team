import test from "node:test";
import assert from "node:assert/strict";
import { buildNodeOverview, filterNodeOverview } from "./adminNodeOverview.js";

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
