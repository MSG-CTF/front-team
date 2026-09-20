import test from "node:test";
import assert from "node:assert/strict";
import {
  fileDownloadError,
  getAttachmentDownload,
  safeDownloadName,
  validateFileBlob,
} from "./challengeFileDownload.js";

const challengeId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const origin = "https://ctf.example";
const url = `/api/v1/challenges/${challengeId}/files/${fileId}/download`;
const item = { challengeId, fileId, url };

test("현재 문제의 같은 출처 파일 API만 인증 다운로드로 분류한다", () => {
  assert.equal(getAttachmentDownload(item, origin).kind, "authenticated");
  assert.equal(
    getAttachmentDownload({ ...item, url: origin + url }, origin).kind,
    "authenticated",
  );
  for (const bad of [
    { ...item, url: "https://outside.invalid" + url },
    { ...item, challengeId: fileId },
    { ...item, fileId: challengeId },
    { ...item, url: url + "?redirect=other" },
    { ...item, url: "/api/v1/admin/settings" },
    { ...item, url: "javascript:alert(1)" },
    { ...item, url: "https://user:pass@ctf.example" + url },
    { ...item, url: null },
  ])
    assert.equal(getAttachmentDownload(bad, origin), null);
});

test("기존 공개 링크에는 Bearer 다운로드를 붙이지 않는다", () => {
  const external = "https://files.example/archive.zip?signature=local";
  assert.deepEqual(getAttachmentDownload({ url: external }, origin), {
    kind: "public",
    url: external,
  });
});

test("파일 대신 반환된 JSON, HTML과 빈 본문은 저장하지 않는다", async () => {
  const zip = new Blob([new Uint8Array([80, 75, 5, 6, ...Array(18).fill(0)])], {
    type: "application/zip",
  });
  assert.equal(await validateFileBlob(zip), zip);
  for (const invalid of [
    new Blob([], { type: "application/zip" }),
    new Blob(["{}"], { type: "application/json" }),
    new Blob(["error"], { type: "text/html" }),
    new Blob(['{"code":"ERROR"}'], { type: "application/octet-stream" }),
    { type: "application/zip", size: 2 },
  ]) {
    await assert.rejects(validateFileBlob(invalid));
  }
  assert.equal(safeDownloadName("../자료.zip"), ".._자료.zip");
  assert.equal(safeDownloadName("..."), "user-files.zip");
  assert.doesNotMatch(safeDownloadName("x\r\ny.zip"), /[\r\n]/);
});

test("다운로드 실패는 권한, 파일 교체와 연결 지연을 구분한다", () => {
  assert.match(fileDownloadError({ response: { status: 403 } }), /권한/);
  assert.match(fileDownloadError({ response: { status: 404 } }), /교체/);
  assert.match(fileDownloadError({ code: "ECONNABORTED" }), /초과/);
});
