import test from "node:test";
import assert from "node:assert/strict";
import { collectPages, latestFirst } from "./adminLists.js";

test("최근 것부터 정해진 수만 남기고 나머지 수를 알려준다", () => {
  const rows = [
    { id: "a", created_at: "2026-10-20T01:00:00Z" },
    { id: "b", created_at: "not a date" },
    { id: "c", created_at: "2026-10-22T01:00:00Z" },
    { id: "d", created_at: "2026-10-21T01:00:00Z" },
    { id: "e", created_at: "2026-10-21T01:00:00Z" },
  ];
  assert.deepEqual(latestFirst(rows).items.map((row) => row.id), ["c", "d", "e", "a", "b"]);
  const capped = latestFirst(rows, 2);
  assert.deepEqual(capped.items.map((row) => row.id), ["c", "d"]);
  assert.equal(capped.hidden, 3);
  assert.deepEqual(latestFirst(undefined, 20), { items: [], hidden: 0 });
});

function fakeTeams(total, pageSize = 100) {
  const calls = [];
  let running = 0;
  let peak = 0;
  const fetchPage = async (page) => {
    calls.push(page);
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 1));
    running -= 1;
    const start = (page - 1) * pageSize;
    const items = Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, index) => ({ team_id: `t${start + index}` }));
    return { items, totalCount: total };
  };
  return { fetchPage, calls, peak: () => peak };
}

test("첫 쪽으로 전체 수를 알고 나머지 쪽은 몇 개씩 함께 받는다", async () => {
  const source = fakeTeams(950);
  const result = await collectPages(source.fetchPage, { parallel: 4, keyOf: (team) => team.team_id });
  assert.equal(result.items.length, 950);
  assert.equal(result.capped, false);
  assert.equal(source.calls[0], 1);
  assert.deepEqual([...source.calls].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(source.peak() <= 4);
});

test("상한을 넘는 목록은 그 수까지만 받고 잘렸다고 알린다", async () => {
  const source = fakeTeams(5000);
  const result = await collectPages(source.fetchPage, { limit: 2000, keyOf: (team) => team.team_id });
  assert.equal(result.items.length, 2000);
  assert.equal(result.totalCount, 5000);
  assert.equal(result.capped, true);
  assert.equal(Math.max(...source.calls), 20);
});

test("서버가 쪽 크기를 줄여 보내면 실제 크기로 쪽 수를 다시 센다", async () => {
  const source = fakeTeams(120, 50);
  const result = await collectPages(source.fetchPage, { keyOf: (team) => team.team_id });
  assert.equal(result.items.length, 120);
  assert.deepEqual([...source.calls].sort((a, b) => a - b), [1, 2, 3]);
});

test("쪽 사이에 밀려 두 번 온 항목은 한 번만 남기고 전체 수가 없으면 첫 쪽만 쓴다", async () => {
  const pages = { 1: ["a", "b"], 2: ["b", "c"] };
  const shifted = await collectPages(async (page) => ({ items: pages[page].map((id) => ({ id })), totalCount: 4 }));
  assert.deepEqual(shifted.items.map((item) => item.id), ["a", "b", "c"]);
  const calls = [];
  const single = await collectPages(async (page) => { calls.push(page); return { items: [{ id: "a" }, { id: "b" }] }; });
  assert.equal(single.items.length, 2);
  assert.deepEqual(calls, [1]);
  const text = await collectPages(async (page) => ({ items: [{ id: `x${page}` }], totalCount: "2" }));
  assert.deepEqual(text.items.map((item) => item.id), ["x1", "x2"]);
});

test("한 쪽이라도 실패하면 모은 목록 대신 오류를 낸다", async () => {
  await assert.rejects(collectPages(async (page) => {
    if (page === 3) throw new Error("팀 목록을 불러오지 못했습니다");
    return { items: Array.from({ length: 10 }, (_, index) => ({ id: `${page}-${index}` })), totalCount: 40 };
  }), /팀 목록을 불러오지 못했습니다/);
});
