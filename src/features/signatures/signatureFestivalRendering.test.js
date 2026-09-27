import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";
import { FESTIVAL_CLUBS } from "./utils/festivalBooths.js";

let server;
let ClubBrand;
let BoothAchievement;
let FestivalScreen;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-festival-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ default: ClubBrand } = await server.ssrLoadModule(
    "/src/features/signatures/components/ClubBrand.jsx",
  ));
  ({ default: BoothAchievement } = await server.ssrLoadModule(
    "/src/features/signatures/components/BoothAchievement.jsx",
  ));
  ({ SignatureFestivalScreen: FestivalScreen } = await server.ssrLoadModule(
    "/src/features/signatures/pages/SignaturesPage.jsx",
  ));
});
after(async () => {
  await server?.close();
});

const entry = (id, solved = false) => ({
  signature_id: id,
  club_id: "mjsec-club",
  club_name: "MJSEC",
  is_solved: solved,
});
const render = (data, status = "success") =>
  renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: "/signatures" },
      createElement(FestivalScreen, {
        state: { data, status, retry() {}, error: "조회 실패" },
      }),
    ),
  );

test("여섯 부스의 간판은 동아리 이름만 표시하고 로고는 완료 스탬프에만 쓴다", () => {
  for (const club of FESTIVAL_CLUBS) {
    const html = renderToStaticMarkup(
      createElement(ClubBrand, { name: club.name }),
    );
    assert.doesNotMatch(html, /<img\b|logoMount|brandLogo/);
    assert.match(
      html,
      new RegExp(`class="[^"]*brandName[^"]*">${club.name}</span>`),
    );
    assert.match(html, /data-shape="(?:round|angular|shield|wide)"/);
  }
});

test("알려지지 않은 동아리는 깨진 이미지 대신 이름으로 표시한다", () => {
  const html = renderToStaticMarkup(
    createElement(ClubBrand, { name: "추가 동아리" }),
  );
  assert.doesNotMatch(html, /<img\b/);
  assert.match(html, /brandName[^>]*>추가 동아리/);
});

test("일부만 해결한 부스는 해결 수만 표시하고 스탬프를 찍지 않는다", () => {
  const html = render([entry("one", true), entry("two")]);
  assert.match(html, /data-progress="partial"/);
  assert.match(html, /1 \/ 2 해결 · 이어서 도전/);
  assert.doesNotMatch(html, /data-achievement|data-stamp-brand|CLEAR/);
});

test("전부 해결한 부스만 해당 동아리 스탬프를 표시하고 다시 입장할 수 있다", () => {
  const html = render([entry("one", true), entry("two", true)]);
  assert.equal((html.match(/data-achievement="complete"/g) || []).length, 1);
  assert.match(html, /data-stamp-brand="mjsec"/);
  assert.doesNotMatch(html, /CLEAR|clearFlag|clearLabel/);
  assert.match(html, /aria-label="MJSEC 부스 들어가기 풀이 완료"/);
  assert.match(html, /href="\/signatures\/clubs\/mjsec-club"/);
  assert.match(html, /부스 다시 보기/);
});

test("문제가 없거나 조회 중 또는 실패한 부스에는 스탬프를 표시하지 않는다", () => {
  for (const html of [
    render([]),
    render([entry("one", true)], "loading"),
    render([entry("one", true)], "error"),
  ]) {
    assert.doesNotMatch(html, /data-achievement|data-stamp-brand|CLEAR/);
    assert.equal((html.match(/disabled=""/g) || []).length >= 6, true);
  }
});

test("여섯 완료 스탬프는 각 동아리의 원본 SVG와 형태를 사용한다", () => {
  const html = render(
    FESTIVAL_CLUBS.map((club) => ({
      signature_id: `problem-${club.key}`,
      club_id: club.key,
      club_name: club.name,
      is_solved: true,
    })),
  );
  assert.deepEqual(
    [...html.matchAll(/data-stamp-brand="([^"]+)"/g)].map((match) => match[1]),
    FESTIVAL_CLUBS.map((club) => club.key),
  );
  for (const club of FESTIVAL_CLUBS) {
    const stamp = renderToStaticMarkup(
      createElement(BoothAchievement, { name: club.name }),
    );
    assert.match(
      stamp,
      new RegExp(`--stamp-logo:[^"]*club-${club.key}-fitted\\.svg`),
    );
    assert.match(stamp, /data-stamp-shape="(?:round|angular|shield|wide)"/);
    assert.match(stamp, /data-stamp-frame="round"/);
    assert.equal((stamp.match(/<circle\b/g) || []).length, 2);
    assert.doesNotMatch(stamp, /<ellipse\b/);
    assert.doesNotMatch(stamp, /CLEAR|<text\b/);
  }
});

test("로고를 알 수 없는 동아리는 다른 동아리의 스탬프를 대신 표시하지 않는다", () => {
  for (const name of [undefined, "추가 동아리", "../../other.svg"]) {
    assert.equal(
      renderToStaticMarkup(createElement(BoothAchievement, { name })),
      "",
    );
  }
});
