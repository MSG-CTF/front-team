import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { mapChallengeInstance } from "./utils/challengeDetailMapper.js";
import { splitEndpointUrl } from "./utils/instanceConnectionDetails.js";

let server, Panel;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", cacheDir: "node_modules/.vite-endpoint-address-tests", optimizeDeps: { noDiscovery: true, include: [] } });
  Panel = (await server.ssrLoadModule("/src/features/challenges/components/InstancePanel.jsx")).default;
});
after(async () => server?.close());

const css = () => readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");

test("접속 주소를 포트 앞에서 나눈다", () => {
  assert.deepEqual(splitEndpointUrl("http://web-4ba8-m05-3a6f9b.inst.msgctf.kr:31659"), { head: "http://web-4ba8-m05-3a6f9b.inst.msgctf.kr", port: ":31659", rest: "" });
  assert.deepEqual(splitEndpointUrl("https://admin.inst.msgctf.kr:8443/login?next=/"), { head: "https://admin.inst.msgctf.kr", port: ":8443", rest: "/login?next=/" });
  assert.deepEqual(splitEndpointUrl("https://web.inst.msgctf.kr"), { head: "https://web.inst.msgctf.kr", port: "", rest: "" });
  assert.deepEqual(splitEndpointUrl(null), { head: "", port: "", rest: "" });
});

test("웹 주소는 포트를 따로 두고 컨테이너 이름이 WEB 이면 종류를 한 번만 보인다", () => {
  const instance = mapChallengeInstance({
    instance_id: "a", status: "RUNNING", host: "http://web-4ba8.inst.msgctf.kr:31659", expires_at: "2099-01-01T00:00:00Z",
    endpoints: [{ container_name: "web", port: 80, protocol: "HTTP", service_url: "http://web-4ba8.inst.msgctf.kr:31659" }],
  });
  const html = renderToStaticMarkup(createElement(Panel, { instance }));
  assert.match(html, /<span class="[^"]*urlHead[^"]*">http:\/\/<wbr\/>web-<wbr\/>4ba8\.<wbr\/>inst\.<wbr\/>msgctf\.<wbr\/>kr<\/span><span class="[^"]*urlPort[^"]*">:31659<\/span>/);
  assert.match(html, /title="http:\/\/web-4ba8\.inst\.msgctf\.kr:31659"/);
  assert.doesNotMatch(html, /<small>WEB<\/small>/);
  // 이름이 종류와 다르면 그대로 함께 보인다
  const other = mapChallengeInstance({
    instance_id: "b", status: "RUNNING", host: "http://a.test:1", expires_at: "2099-01-01T00:00:00Z",
    endpoints: [{ container_name: "admin", port: 80, protocol: "HTTP", service_url: "http://a.test:1" }],
  });
  assert.match(renderToStaticMarkup(createElement(Panel, { instance: other })), /<small>WEB<\/small>/);
});

test("넓은 화면은 주소 앞부분만 말줄임하고 좁은 화면은 점·하이픈 뒤에서만 줄을 바꾼다", () => {
  const source = css();
  assert.match(source, /\.endpoint a \{\s*display: flex;\s*align-items: baseline;\s*\}/);
  assert.match(source, /\.urlHead,\s*\.urlRest \{\s*min-width: 0;\s*overflow: hidden;\s*text-overflow: ellipsis;\s*white-space: nowrap;\s*\}/);
  assert.match(source, /\.urlPort,\s*\.urlArrow \{\s*flex: none;\s*white-space: pre;\s*\}/);
  // PC 한 줄 말줄임에서는 좁은 화면용 줄바꿈 자리를 끈다
  const desktop = source.slice(source.indexOf("@media (min-width: 1101px) and (min-height: 620px)"));
  assert.match(desktop, /\.urlHead wbr,\s*\.urlRest wbr \{\s*display: none;\s*\}/);
  // 좁은 화면은 여러 줄로 보이되 포트 숫자는 붙여 둔다
  const narrow = source.slice(source.indexOf("@media (max-width: 1100px), (max-height: 619px)"));
  assert.match(narrow, /\.endpoint a \{\s*display: block;\s*overflow-wrap: break-word;\s*\}/);
  assert.match(narrow, /\.urlPort,\s*\.urlArrow \{\s*white-space: nowrap;\s*\}/);
});

test("좁은 화면의 한글 칸 제목에는 영문 대문자용 넓은 자간을 쓰지 않는다", () => {
  const source = css();
  assert.match(source, /\.bakedLabel \{[^}]*letter-spacing: 0\.18em;/);
  assert.match(source, /\.bakedLabel \{ padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid #9c7548; font-size: 17px; letter-spacing: 0\.02em; \}/);
});
