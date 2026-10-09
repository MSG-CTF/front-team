import assert from "node:assert/strict";
import test from "node:test";
import { buildDerivedSettings, parseReleaseFile, releaseRequirements, releaseSettingsDraft, validateRuntimeSecret } from "./adminRuntime.js";

test("release uploads preserve per-container environment and secret aliases", () => {
  const artifact = { schema_version: "2.1", challenge_slug: "web-basic", registry_revision: 2,
    workload: { containers: [{ name: "web", env: { LITERAL: "$(APP_MODE)" }, secret_env: { FLAG: "flag" } }, { name: "db", env: { MODE: "private" } }] } };
  assert.deepEqual(parseReleaseFile(JSON.stringify(artifact)), artifact);
  assert.deepEqual(parseReleaseFile(JSON.stringify({ artifact })), artifact);
});

test("invalid and non-runtime release files cannot be submitted", () => {
  for (const text of ["invalid", "null", "[]", "{}", '{"schema_version":2.1}', '{"schema_version":"2.1","workload":{"containers":[]}}', '{"schema_version":"2.2","workload":{"containers":[{}]}}', '{"schema_version":"2.1","workload":{"containers":[null]}}', '{"schema_version":"2.1","workload":{"containers":[{"name":"web","secret_env":{"FLAG":123}}]}}']) {
    assert.throws(() => parseReleaseFile(text));
  }
});

test("release preview lists each container and missing secret names without values", () => {
  const artifact = parseReleaseFile(JSON.stringify({ schema_version: "2.1", workload: { containers: [
    { name: "web", env: { APP_MODE: "ctf" }, secret_env: { FLAG: "flag", INTERNAL_TOKEN: "token" } },
    { name: "helper", secret_env: { INTERNAL_TOKEN: "token" } },
  ] } }));
  assert.deepEqual(releaseRequirements(artifact, [{ name: "flag" }]), {
    containers: [
      { name: "web", envNames: ["APP_MODE"], secretBindings: [["FLAG", "flag"], ["INTERNAL_TOKEN", "token"]] },
      { name: "helper", envNames: [], secretBindings: [["INTERNAL_TOKEN", "token"]] },
    ],
    requiredSecrets: ["flag", "token"],
    missingSecrets: ["token"],
  });
});

test("runtime secret validation measures UTF-8 bytes and rejects invalid aliases", () => {
  assert.equal(validateRuntimeSecret("flag", "한".repeat(1365)), "");
  assert.notEqual(validateRuntimeSecret("flag", "한".repeat(1366)), "");
  for (const name of ["FLAG", "1flag", "flag-value", "a".repeat(65)]) assert.notEqual(validateRuntimeSecret(name, "test-only"), "");
  assert.notEqual(validateRuntimeSecret("flag", "test\0only"), "");
});

test("existing release settings can be copied without changing image fields", () => {
  const release = { containers: [{ name: "web", image_ref: "fixed-image", env: { APP_MODE: "old" }, secret_bindings: [{ env_name: "FLAG", name: "flag" }] }] };
  const draft = releaseSettingsDraft(release);
  draft[0].env[0].value = "new";
  assert.deepEqual(buildDerivedSettings(draft, [{ name: "flag" }]), {
    containers: [{ name: "web", env: { APP_MODE: "new" }, secret_env: { FLAG: "flag" } }],
  });
  assert.equal(release.containers[0].env.APP_MODE, "old");
  assert.equal(JSON.stringify(buildDerivedSettings(draft, [{ name: "flag" }])).includes("fixed-image"), false);
});

test("new settings reject missing secret, duplicate names, and raw flag", () => {
  const draft = [{ name: "web", env: [{ name: "FLAG", value: "raw" }], secret_env: [] }];
  assert.throws(() => buildDerivedSettings(draft, []));
  draft[0].env = [{ name: "APP_MODE", value: "one" }, { name: "APP_MODE", value: "two" }];
  assert.throws(() => buildDerivedSettings(draft, []));
  draft[0].env = [];
  draft[0].secret_env = [{ name: "FLAG", value: "flag" }];
  assert.throws(() => buildDerivedSettings(draft, []));
});
