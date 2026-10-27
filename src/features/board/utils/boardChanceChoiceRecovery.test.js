import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { adaptMyBoard, adaptChanceAction } from "./boardData.js";
import apiClient from "../../../api/client.js";
import { confirmChanceCard } from "../../../api/board.js";

const teamCardId = "0c12434b-571f-4afb-ac36-b8faf800db64";
const pending = {
  team_card_id: teamCardId,
  card_id: "card_roll_twice_choose",
  effect: "ROLL_TWICE_CHOOSE",
  first_number: 2,
  second_number: 12,
  awaiting_confirm: true,
};

test("보드 재조회는 서버에 저장된 두 결과와 보유 카드 ID를 복원한다", () => {
  const choice = adaptMyBoard({ pending_chance_choice: pending }).pendingChanceChoice;
  assert.equal(choice.teamCardId, teamCardId);
  assert.equal(choice.cardId, "card_roll_twice_choose");
  assert.equal(choice.firstNumber, 2);
  assert.equal(choice.secondNumber, 12);
  assert.equal(choice.awaitingConfirm, true);
});

test("선택 대기 없음과 구버전 서버의 미지원 응답을 구분한다", () => {
  assert.equal(adaptMyBoard({ pending_chance_choice: null }).pendingChanceChoice, null);
  assert.equal(adaptMyBoard({}).pendingChanceChoice, undefined);
});

test("카드 사용 직후 응답도 같은 보유 카드 ID를 유지한다", () => {
  assert.equal(adaptChanceAction(pending).teamCardId, teamCardId);
});

let lastRequest;
const originalAdapter = apiClient.defaults.adapter;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
before(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true, value: { getItem: () => "local-contract-token" },
  });
  apiClient.defaults.adapter = async config => {
    lastRequest = config;
    return { data: { code: "SUCCESS", data: null }, status: 200, statusText: "OK", headers: {}, config };
  };
});
after(() => {
  apiClient.defaults.adapter = originalAdapter;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

test("복원한 카드의 선택 확정은 그 카드 ID와 재시도 키를 전송한다", async () => {
  await confirmChanceCard({ choice: "SECOND", teamCardId, idempotencyKey: "recovered-choice" });
  assert.equal(lastRequest.url, "/board/chance/confirm");
  assert.deepEqual(JSON.parse(lastRequest.data), { choice: "SECOND", team_card_id: teamCardId });
  assert.equal(lastRequest.headers.get("Idempotency-Key"), "recovered-choice");
});

test("구버전 호출은 보유 카드 ID 없이 선택을 확정할 수 있다", async () => {
  await confirmChanceCard({ choice: "FIRST", idempotencyKey: "legacy-choice" });
  assert.deepEqual(JSON.parse(lastRequest.data), { choice: "FIRST" });
});
