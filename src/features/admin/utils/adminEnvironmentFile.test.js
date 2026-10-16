import assert from "node:assert/strict";
import test from "node:test";
import { environmentFileEntries, readEnvironmentFile } from "./adminEnvironmentFile.js";

test("review declarations never contain a copied value or stale secret version", () => {
  const result = environmentFileEntries([
    { name: "PORT", kind: "env", required: true, value: "8080", secret_id: "stale" },
    { name: "FLAG", kind: "secret", required: true, secret_name: "flag", use_existing: true, secret_id: "pinned" },
    { name: "DB_PASS", kind: "secret", required: false, secret_name: "db", use_existing: false, secret_id: "stale" },
  ]);
  assert.deepEqual(result, [
    { name: "PORT", kind: "env", required: true },
    { name: "FLAG", kind: "secret", required: true, secret_name: "flag", use_existing: true, secret_id: "pinned" },
    { name: "DB_PASS", kind: "secret", required: false, secret_name: "db", use_existing: false },
  ]);
});

test("file reading preserves CRLF and literal characters for the backend parser", async () => {
  const content = "PORT=8080\r\nTEXT='한글 # $VALUE=1'\r\n";
  assert.equal(await readEnvironmentFile(new Blob([content])), content);
});

test("oversized and non-UTF8 files are rejected before sending", async () => {
  await assert.rejects(readEnvironmentFile(new Blob([new Uint8Array(65537)])), /64KiB/);
  await assert.rejects(readEnvironmentFile(new Blob([new Uint8Array([0xff, 0xfe])])), /UTF-8/);
});
