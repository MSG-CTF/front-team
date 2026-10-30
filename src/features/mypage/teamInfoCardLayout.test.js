import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFileSync } from "node:fs";

let server;
let TeamInfoCard;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-team-card-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  TeamInfoCard = (await server.ssrLoadModule("/src/features/mypage/components/TeamInfoCard.jsx")).default;
});

test("QR 안내의 중심을 QR 박스에 맞추고 로그아웃 영역과 분리한다", () => {
  const css = readFileSync(new URL("./components/MyPageScene.module.css", import.meta.url), "utf8");
  assert.match(css, /\.qrStatus \{[^}]*left: calc\(var\(--u\) \* 125\);[^}]*top: calc\(var\(--u\) \* 420\);[^}]*width: calc\(var\(--u\) \* 220\);/);
  assert.equal(125 + 220 / 2, 149 + 172 / 2);
  assert.ok(125 + 220 < 350);
  assert.match(css, /\.qrStatus \{[^}]*text-align: center;/);
});
after(async () => server?.close());

function render(members, status = "success") {
  return renderToStaticMarkup(createElement(TeamInfoCard, {
    profile: { status: "success", data: { teamName: "Team", members } },
    memberRanking: { status, data: { nickname: "아주긴닉네임_ABCDEFGHIJKLMNOPQRSTUVWXYZ", rank: 12, score: 1200, solvedCount: 8 } },
    qrState: { status: "idle" },
  }));
}

test("팀원 원문과 개인 순위 데이터를 유지하고 세 번째 팀원부터 펼치기를 제공한다", () => {
  for (const count of [1, 2, 4]) {
    const members = Array.from({ length: count }, (_, index) => `긴닉네임_ABCDEFGHIJKLMNOPQRSTUVWXYZ_${index}`);
    const html = render(members);
    for (const member of members) assert.ok(html.includes(`title="${member}"`));
    assert.equal(html.includes('aria-expanded="false"'), count > 2);
    assert.ok(html.includes('title="아주긴닉네임_ABCDEFGHIJKLMNOPQRSTUVWXYZ"'));
    assert.match(html, /PERSONAL RANK/);
    assert.match(html, /1,200/);
  }
});

test("개인 순위 로딩·오류·빈 상태의 안내를 보존한다", () => {
  assert.match(render(["팀원"], "loading"), /role="status">개인 순위를 불러오는 중/);
  assert.match(render(["팀원"], "error"), /role="alert">개인 순위를 확인하지 못했습니다/);
  assert.match(render(["팀원"], "empty"), /아직 집계된 개인 순위가 없습니다/);
});

test("회원 수와 무관하게 그룹을 MEMBERS 구간의 가로·세로 중앙에 배치한다", () => {
  const css = readFileSync(new URL("./components/MyPageScene.module.css", import.meta.url), "utf8");
  assert.match(css, /\.membersRegion \{[^}]*top: calc\(var\(--u\) \* 490\);[^}]*height: calc\(var\(--u\) \* 168\);[^}]*place-items: center;/);
  assert.match(css, /row-gap: calc\(var\(--u\) \* 22\)/);
  assert.equal(490 + 168 / 2, 574);
  assert.match(css, /\.members \{[^}]*width: max-content;[^}]*max-width: 100%;/);
  assert.match(css, /\.members li::before \{[^}]*display: block;/);
  assert.match(css, /mask-image:[\s\S]*580\.5[\s\S]*632\.5/);
  assert.match(css, /\.members\[data-expanded\] li \{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
});
