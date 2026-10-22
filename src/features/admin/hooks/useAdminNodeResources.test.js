import test from "node:test";
import assert from "node:assert/strict";
import { LIVE_WINDOW_MS, isResourceLive } from "./useAdminNodeResources.js";

test("최근 조회가 이어질 때만 갱신 중으로 보고 조회 실패나 공백이 길면 지연으로 본다", () => {
  const now = 1_000_000;
  assert.equal(isResourceLive({ status: "success", fetchedAt: now - 3000 }, now), true);
  assert.equal(isResourceLive({ status: "loading", fetchedAt: now - 3000 }, now), true);
  assert.equal(isResourceLive({ status: "success", fetchedAt: now - LIVE_WINDOW_MS - 1 }, now), false);
  assert.equal(isResourceLive({ status: "error", fetchedAt: now }, now), false);
  assert.equal(isResourceLive({ status: "success", fetchedAt: null }, now), false);
});
