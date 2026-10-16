import test from "node:test";
import assert from "node:assert/strict";
import { repositoryEnvironmentRequest, repositoryEnvironmentRows } from "./adminRepositoryEnvironment.js";

test("저장소 값은 다시 보내지 않고 비밀값의 기존 연결 버전을 유지한다", () => {
  const rows = repositoryEnvironmentRows([
    { name: "PORT", value: "8080", kind: "env", selected: true, required: true, has_value: true },
    { name: "FLAG", kind: "secret", selected: true, required: true, use_existing: true, secret_name: "flag", secret_id: "pinned-id" },
    { name: "IGNORED", kind: "env", selected: false, value: "unused" },
  ]);
  const body = repositoryEnvironmentRequest("web", "signed-revision", rows);
  assert.deepEqual(body.overrides, {});
  assert.equal(body.entries.length, 2);
  assert.equal(body.entries[1].secret_id, "pinned-id");
  assert.equal(body.source_token, "signed-revision");
});

test("직접 입력한 값만 전달하고 기존 연결로 되돌리면 입력값을 보내지 않는다", () => {
  const rows = [{ name: "PORT", kind: "env", selected: true, required: true, mode: "manual", override: "9090" },
    { name: "PASSWORD", kind: "secret", selected: true, required: true, mode: "existing", secret_name: "password", override: "stale-input" }];
  assert.deepEqual(repositoryEnvironmentRequest("web", "token", rows).overrides, { PORT: "9090" });
});

test("빈 선택과 컨테이너 제한을 넘는 선택은 저장 전에 막는다", () => {
  assert.throws(() => repositoryEnvironmentRequest("web", "token", []));
  const rows = Array.from({ length: 128 }, (_, index) => ({ name: `KEY_${index}`, selected: true, kind: "env" }));
  assert.equal(repositoryEnvironmentRequest("web", "token", rows).entries.length, 128);
  assert.throws(() => repositoryEnvironmentRequest("web", "token", [...rows, { name: "EXTRA", selected: true }]));
});

test("출제자의 비밀값이 있으면 재입력 없이 원본값 사용을 요청한다", () => {
  const rows = repositoryEnvironmentRows([
    { name: "DB_PASS", kind: "secret", selected: true, required: true, has_value: true,
      use_existing: false, secret_name: "db_pass", secret_id: "previous-version" },
  ]);
  assert.equal(rows[0].mode, "repository");
  const body = repositoryEnvironmentRequest("db", "pinned-source", rows);
  assert.deepEqual(body.overrides, {});
  assert.equal(body.entries[0].use_existing, false);
  assert.equal(body.entries[0].secret_id, undefined);
  assert.equal(body.entries[0].value, undefined);
});
