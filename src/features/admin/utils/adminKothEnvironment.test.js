import assert from "node:assert/strict";
import test from "node:test";
import { kothEnvironmentBody, manualKothEnvironment } from "./adminKothEnvironment.js";

const container = { name: "service", entries: [
  { name: "PORT", kind: "env", required: true, value: "8080" },
  { name: "OPTION", kind: "secret", required: false },
  { name: "INTERNAL_TOKEN", kind: "secret", required: true, locked: true },
] };

test("repository requests carry a pinned version without copied secret values", () => {
  assert.deepEqual(kothEnvironmentBody("version", "service", "repository", "ignored", "request"), {
    base_version_id: "version", container: "service", method: "repository", request_id: "request",
  });
});

test("manual edits include only changed rows and preserve literal characters", () => {
  const result = manualKothEnvironment("v1", container, { PORT: { action: "update", value: '$(PORT) # "quoted"' } }, null, "id");
  assert.equal(result.content, 'PORT="$(PORT) # "quoted""');
  assert.deepEqual(result.rules, { PORT: { kind: "env", required: true } });
  assert.equal(result.content.includes("INTERNAL_TOKEN"), false);
});

test("unset and an explicitly empty value remain different", () => {
  assert.equal(manualKothEnvironment("v1", container, { OPTION: { action: "unset" } }).content, "OPTION");
  assert.equal(manualKothEnvironment("v1", container, { OPTION: { action: "update", value: "" } }).content, 'OPTION=""');
  assert.throws(() => manualKothEnvironment("v1", container, { PORT: { action: "unset" } }));
});

test("protected fields, duplicate names and multiline inputs are blocked", () => {
  assert.throws(() => manualKothEnvironment("v1", container, { INTERNAL_TOKEN: { value: "new", action: "update" } }));
  assert.throws(() => manualKothEnvironment("v1", container, {}, { name: "PORT", value: "8081", kind: "env", required: true }));
  assert.throws(() => manualKothEnvironment("v1", container, { PORT: { value: "a\nb", action: "update" } }));
  assert.throws(() => manualKothEnvironment("v1", container, {}));
});
