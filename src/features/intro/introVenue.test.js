import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";
import { eventConfig } from "./config/eventConfig.js";

let server;
let overview;
let onsite;
let guide;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-intro-venue-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const [
    { default: EventOverview },
    { default: OnsiteGuide },
    { default: IntroGuidePage },
    { MotionProvider },
  ] = await Promise.all([
    server.ssrLoadModule("/src/features/intro/components/EventOverview.jsx"),
    server.ssrLoadModule("/src/features/intro/components/OnsiteGuide.jsx"),
    server.ssrLoadModule("/src/features/intro/IntroGuidePage.jsx"),
    server.ssrLoadModule("/src/features/intro/components/MotionProvider.jsx"),
  ]);
  const render = (Component) =>
    renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: "/guide" },
        createElement(MotionProvider, null, createElement(Component)),
      ),
    );
  overview = render(EventOverview);
  onsite = render(OnsiteGuide);
  guide = render(IntroGuidePage);
});

after(async () => {
  await server?.close();
});

test("대회 개요와 현장 안내, 상세 안내가 확정 장소를 함께 표시한다", () => {
  assert.equal(eventConfig.venue, "교원챌린지홀 2층");
  assert.equal(eventConfig.venueAddress, "서울시 종로구 우정국로 6");
  for (const html of [overview, onsite, guide]) {
    assert.ok(html.includes(eventConfig.venue));
    assert.doesNotMatch(html, /대회 장소는 아직 미정|장소가 확정되면|장소 확정 후/);
  }
  assert.ok(overview.includes(eventConfig.venueAddress));
  assert.ok(onsite.includes(eventConfig.venueAddress));
  assert.ok(guide.includes(eventConfig.venueAddress));
});

test("상단 장소 안내에 도로명 주소와 카카오맵, 네이버지도 링크를 표시한다", () => {
  assert.match(overview, /class="venue-address">서울시 종로구 우정국로 6<\/p>/);
  assert.match(overview, /<nav class="venue-map-links" aria-label="대회장 지도">/);
  assert.equal(eventConfig.venueMapLinks.length, 2);
  const expected = [
    { label: "카카오맵", host: "map.kakao.com", prefix: "/link/search/" },
    { label: "네이버지도", host: "map.naver.com", prefix: "/p/search/" },
  ];
  for (const [index, { label, host, prefix }] of expected.entries()) {
    const link = eventConfig.venueMapLinks[index];
    const url = new URL(link.url);
    assert.equal(link.label, label);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, host);
    assert.ok(url.pathname.startsWith(prefix));
    assert.equal(
      decodeURIComponent(url.pathname.slice(prefix.length)),
      eventConfig.venueAddress,
    );
    assert.ok(
      overview.includes(`href="${link.url}" target="_blank" rel="noopener noreferrer"`),
    );
    assert.ok(overview.includes(`${label}에서 보기 (새 탭)`));
  }
});

test("장소 안내는 다람쥐 대신 한 번만 표시하고 출구 번호나 주차 정보를 임의로 넣지 않는다", () => {
  const copy = overview.match(/<div class="overview-copy"[\s\S]*?<\/dl>/)?.[0];
  const summary = overview.match(/<aside class="venue-summary"[\s\S]*?<\/aside>/)?.[0];
  assert.ok(copy);
  assert.ok(summary);
  assert.match(copy, /일정/);
  assert.match(copy, /참가 규모/);
  assert.ok(!copy.includes(eventConfig.venue));
  assert.equal(overview.split(eventConfig.venueAddress).length - 1, 1);
  assert.match(summary, /1호선 종각역/);
  assert.match(summary, /도보 2분/);
  assert.doesNotMatch(overview, /mascot-dice-|mascot-sequence|\d+번 출구|무료 주차/);
  assert.equal(eventConfig.venueAccess.sourceUrl, "https://www.kyowonspace.co.kr/Info/InfoRental?gbn=1");
});

test("현장 안내와 상세 안내의 지도 링크가 같은 장소를 새 탭으로 연다", () => {
  const mapUrl = new URL(eventConfig.venueMapUrl);
  assert.equal(mapUrl.protocol, "https:");
  assert.equal(mapUrl.hostname, "www.google.com");
  assert.equal(mapUrl.searchParams.get("api"), "1");
  assert.equal(
    mapUrl.searchParams.get("query"),
    "교원챌린지홀 서울시 종로구 우정국로 6",
  );
  for (const html of [onsite, guide]) {
    assert.match(
      html,
      /href="https:\/\/www\.google\.com\/maps\/search\/[^\"]+" target="_blank" rel="noopener noreferrer">지도에서 위치 보기<\/a>/,
    );
  }
});

test("상단 지도는 확정 주소의 공유 지도를 사용하고 지도 밖에도 주소와 길찾기 링크를 남긴다", () => {
  const mapUrl = new URL(eventConfig.venueMapEmbedUrl);
  assert.equal(mapUrl.protocol, "https:");
  assert.equal(mapUrl.hostname, "www.google.com");
  assert.equal(mapUrl.pathname, "/maps/embed");
  assert.equal(mapUrl.searchParams.size, 1);
  const mapSpec = mapUrl.searchParams.get("pb");
  assert.ok(mapSpec.includes("0x357ca2e92c46b501:0x43cb14ac16d93154"));
  const addressToken = mapSpec.match(/!2z([^!]+)/)?.[1];
  assert.equal(Buffer.from(addressToken, "base64").toString("utf8"), "서울특별시 종로구 우정국로 6");
  assert.ok(overview.includes(`src="${eventConfig.venueMapEmbedUrl}"`));
  assert.match(overview, /<\/iframe><\/div><p class="venue-name">교원챌린지홀 2층<\/p>/);
  assert.match(overview, /<p class="venue-transit">1호선 종각역에서 도보 2분<\/p>/);
  assert.equal((overview.match(/<iframe\b/g) || []).length, 1);
});

test("장소 확정과 별개인 현장 운영 정보는 확정된 것처럼 안내하지 않는다", () => {
  assert.match(guide, /교통편, 주차, 체크인과 현장 운영 안내는 별도로 공지합니다/);
  assert.match(guide, /추가 장비와 네트워크 연결 방식은 추후 안내합니다/);
});
