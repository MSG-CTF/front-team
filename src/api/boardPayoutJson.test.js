import test from "node:test";
import assert from "node:assert/strict";
import apiClient from "./client.js";
import { getMyBoard } from "./board.js";
import { adaptMyBoard } from "../features/board/utils/boardData.js";
import { formatBoardLineScore } from "../features/board/utils/boardLines.js";

test("실제 board/me Axios 변환이 큰 정수와 요청 취소 설정을 보존한다", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const controller = new AbortController();
  let observed;
  try {
    const response = await getMyBoard({
      signal: controller.signal, timeout: 4321,
      adapter: async (config) => {
        observed = config;
        return { status: 200, statusText: "OK", headers: {}, config,
          data: '{"code":"SUCCESS","data":{"line_monopolies":[{"line_number":1,"earned_score":999999999999999999,"is_category_bonus":false}]}}' };
      },
    });
    const board = adaptMyBoard(response.data.data);
    assert.equal(formatBoardLineScore(board.lineMonopolies[0].earnedScore), "999,999,999,999,999,999 pts");
    assert.equal(observed.url, "/board/me");
    assert.equal(observed.signal, controller.signal);
    assert.equal(observed.timeout, 4321);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});
