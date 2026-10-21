import test from "node:test";
import assert from "node:assert/strict";
import { createPendingDiceRoll, restorePendingDiceRoll } from "./pendingDiceRoll.js";

function fixture() {
  const values = new Map();
  const queues = new Map();
  let sequence = 0;
  const options = { userId: "leader", teamId: "team", createKey: () => `dice-roll-${++sequence}`,
    storage: () => ({ getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }),
    locks: { request(key, _, action) {
      const next = (queues.get(key) ?? Promise.resolve()).then(action);
      queues.set(key, next.catch(() => {}));
      return next;
    } } };
  return { options, values };
}

test("two tabs starting the same unresolved roll share one request key", async () => {
  const { options } = fixture();
  const first = createPendingDiceRoll(options), second = createPendingDiceRoll(options);
  const keys = await Promise.all([first.acquire(), second.acquire()]);
  assert.deepEqual(keys, ["dice-roll-1", "dice-roll-1"]);
});

test("reload and token renewal keep an unresolved roll until explicit recovery", async () => {
  const { options } = fixture();
  const first = createPendingDiceRoll(options);
  const key = await first.acquire();
  const reloaded = createPendingDiceRoll(options);
  assert.equal(reloaded.peek(), key);
  assert.equal(await reloaded.acquire(), key);
  await reloaded.clear(key);
  assert.notEqual(await reloaded.acquire(), key, "the next deliberate roll needs a fresh key");
});

test("a late completion cannot erase the key for a newer roll", async () => {
  const { options } = fixture();
  const first = createPendingDiceRoll(options), other = createPendingDiceRoll(options);
  const oldKey = await first.acquire();
  await other.clear(oldKey);
  const newKey = await other.acquire();
  await first.clear(oldKey);
  assert.equal(other.peek(), newKey);
  assert.equal(await first.acquire(oldKey), oldKey);
  assert.equal(other.peek(), newKey, "replaying the old receipt must not replace the new operation");
});

test("different users and teams never reuse a stored key", async () => {
  const { options } = fixture();
  const keys = await Promise.all([
    createPendingDiceRoll(options).acquire(),
    createPendingDiceRoll({ ...options, userId: "other" }).acquire(),
    createPendingDiceRoll({ ...options, teamId: "other" }).acquire(),
  ]);
  assert.equal(new Set(keys).size, 3);
});

test("broken or unavailable browser storage preserves an in-tab retry", async () => {
  const { options, values } = fixture();
  values.set("msgctf_pending_dice_roll:leader:team", "invalid-json");
  const repaired = createPendingDiceRoll(options);
  assert.equal(await repaired.acquire(), "dice-roll-1");
  const blocked = createPendingDiceRoll({ ...options, storage() { throw new Error("blocked"); } });
  const key = await blocked.acquire();
  assert.equal(await blocked.acquire(), key);
  await blocked.clear(key);
  assert.notEqual(await blocked.acquire(), key);
});

test("independent browser stores acquire the server's same unresolved request", async () => {
  const serverKey = "dice-roll-request-server-owned";
  const first = fixture(), second = fixture();
  const requests = [];
  const createKey = async () => { requests.push(1); return serverKey; };
  const a = createPendingDiceRoll({ ...first.options, createKey });
  const b = createPendingDiceRoll({ ...second.options, createKey });
  assert.deepEqual(await Promise.all([a.acquire(), b.acquire()]), [serverKey, serverKey]);
  assert.equal(requests.length, 2);
  assert.notEqual(first.values, second.values);
});

test("a reloaded browser accepts an unresolved key returned by status without preparing another roll", async () => {
  const { options } = fixture();
  const restored = createPendingDiceRoll({ ...options, createKey() { throw new Error("must not prepare"); } });
  const key = "dice-roll-request-restored";
  assert.equal(await restored.acquire(key), key);
  assert.equal(await restored.acquire(), key);
});

test("lost prepare response and invalid keys never store a new local request", async () => {
  const { options, values } = fixture();
  await assert.rejects(createPendingDiceRoll({ ...options, async createKey() { throw new Error("offline"); } }).acquire(), /offline/);
  assert.equal(values.size, 0);
  await assert.rejects(createPendingDiceRoll({ ...options, async createKey() { return undefined; } }).acquire());
  assert.equal(values.size, 0);
});

test("server acknowledgement in another browser clears the stale local receipt", async () => {
  const { options } = fixture();
  const pending = createPendingDiceRoll(options);
  await pending.acquire("dice-roll-request-old");
  await restorePendingDiceRoll(pending, null);
  assert.equal(pending.peek(), null);
  await pending.acquire("dice-roll-request-old");
  await restorePendingDiceRoll(pending, "dice-roll-request-new");
  assert.equal(pending.peek(), "dice-roll-request-new");
});

test("a server without the new status field cannot discard an unresolved request", async () => {
  const { options } = fixture();
  const pending = createPendingDiceRoll(options);
  await pending.acquire("dice-roll-request-old");
  await restorePendingDiceRoll(pending, undefined);
  assert.equal(pending.peek(), "dice-roll-request-old");
});

test("legacy local requests remain available for their original idempotent retry", async () => {
  const { options } = fixture();
  const pending = createPendingDiceRoll(options);
  const key = await pending.acquire();
  await restorePendingDiceRoll(pending, null);
  assert.equal(pending.peek(), key);
});
