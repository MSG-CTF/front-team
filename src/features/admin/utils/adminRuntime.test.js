import assert from "node:assert/strict";
import test from "node:test";
import { parseReleaseFile, validateRuntimeSecret } from "./adminRuntime.js";

test("release uploads preserve per-container environment and secret aliases", () => {
  const artifact = { schema_version: "2.1", challenge_slug: "web-basic", registry_revision: 2,
    workload: { containers: [{ name: "web", env: { LITERAL: "$(APP_MODE)" }, secret_env: { FLAG: "flag" } }, { name: "db", env: { MODE: "private" } }] } };
  assert.deepEqual(parseReleaseFile(JSON.stringify(artifact)), artifact);
  assert.deepEqual(parseReleaseFile(JSON.stringify({ artifact })), artifact);
});

test("invalid and non-runtime release files cannot be submitted", () => {
  for (const text of ["invalid", "null", "[]", "{}", '{"schema_version":2.1}', '{"schema_version":"2.1","workload":{"containers":[]}}', '{"schema_version":"2.2","workload":{"containers":[{}]}}']) {
    assert.throws(() => parseReleaseFile(text));
  }
});

test("runtime secret validation measures UTF-8 bytes and rejects invalid aliases", () => {
  assert.equal(validateRuntimeSecret("flag", "한".repeat(1365)), "");
  assert.notEqual(validateRuntimeSecret("flag", "한".repeat(1366)), "");
  for (const name of ["FLAG", "1flag", "flag-value", "a".repeat(65)]) assert.notEqual(validateRuntimeSecret(name, "test-only"), "");
  assert.notEqual(validateRuntimeSecret("flag", "test\0only"), "");
});
