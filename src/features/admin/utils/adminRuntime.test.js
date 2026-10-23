import assert from "node:assert/strict";
import test from "node:test";
import { buildDerivedSettings, orderReleasesByPublication, parseReleaseFile, releaseRequirements, releaseSettingsDraft, validateRuntimeSecret } from "./adminRuntime.js";

test("historical CI artifacts appear after newer publications even when registered later", () => {
  const releases = [
    { release_id: "old-backfill", version: 20, registry_revision: 552 },
    { release_id: "current", version: 17, registry_revision: 578, is_current: true },
    { release_id: "newer-settings", version: 21, registry_revision: 578 },
    { release_id: "previous", version: 8, registry_revision: 573 },
  ];
  assert.deepEqual(orderReleasesByPublication(releases).map((release) => release.release_id),
    ["newer-settings", "current", "previous", "old-backfill"]);
  assert.equal(releases[0].release_id, "old-backfill");
});

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

test("버전 출처는 파생 여부와 수집 기록으로 가르고 GitHub 최신 버전을 찾는다", async () => {
  const { describeRelease, latestGithubRelease, releaseOrigin } = await import("./adminRuntime.js");
  const releases = [
    { release_id: "r4", version: 4, registry_revision: 41, note: "공급망 자동 등록: web-cookie" },
    { release_id: "r3", version: 3, registry_revision: 38, derived_from_release_id: "r2", note: "app .env 가져오기" },
    { release_id: "r2", version: 2, registry_revision: 38, note: "GitHub 발행본 가져오기 · 실행 9912" },
    { release_id: "r1", version: 1, registry_revision: 0, source_ref: "backfill" },
    { release_id: "r5", version: 5, registry_revision: 41, note: "관리자 릴리스 파일 등록" },
  ];
  assert.deepEqual(releases.map(releaseOrigin), ["GITHUB", "PLATFORM", "GITHUB", "BACKFILL", "MANUAL"]);
  assert.equal(releaseOrigin({ origin: "MANUAL", note: "공급망 자동 등록" }), "MANUAL");
  assert.equal(latestGithubRelease(releases).release_id, "r4");
  const derived = describeRelease(releases[1], releases);
  assert.equal(derived.baseVersion, 2);
  assert.equal(derived.newerGithub.release_id, "r4");
  assert.equal(describeRelease(releases[0], releases).isLatestGithub, true);
  assert.equal(describeRelease(releases[0], releases).newerGithub, null);
});

test("저장소 env 로 채운 버전은 반영 커밋과 파일을 보이고 못 채운 값이 있으면 사용을 막는다", async () => {
  const { repositoryEnvStatus } = await import("./adminRuntime.js");
  assert.equal(repositoryEnvStatus({ repository_env: null }), null);
  const filled = repositoryEnvStatus({ repository_env: { revision: "1a82c92ffffffffffffffffffffffffffffffff0", files: ["env/web.env"], missing: [] } });
  assert.deepEqual([filled.revision, filled.files, filled.blocked], ["1a82c92", ["env/web.env"], false]);
  const blocked = repositoryEnvStatus({ repository_env: { revision: "a".repeat(40), files: ["env/web.env", "env/api.env"], missing: [
    { container: "web", name: "FLAG", reason: "flag_mismatch" },
    { container: "api", name: null, reason: "invalid", message: "env/api.env:3 환경변수 형식을 확인해주세요" },
  ] } });
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.missing.map((item) => item.label), ["web · FLAG 채점 플래그와 다름", "api env/api.env:3 환경변수 형식을 확인해주세요"]);
});
