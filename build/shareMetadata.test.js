import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createShareMetadata, shareMetadataPlugin, SHARE_COPY, SHARE_IMAGE } from "./shareMetadata.js";

const source = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const attribute = (html, property) => html.match(new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]+)"`))?.[1];

test("공유용 HTML은 JavaScript 실행 없이 제목, 대회 소개와 이미지를 제공한다", () => {
  const html = shareMetadataPlugin().transformIndexHtml.handler(source);
  assert.doesNotMatch(html, /%MSG_SHARE_/);
  assert.equal(attribute(html, "og:title"), "MSG CTF 2026");
  assert.match(html, /<title>MSG CTF 2026<\/title>/);
  assert.equal(attribute(html, "og:type"), "website");
  assert.equal(attribute(html, "og:locale"), "ko_KR");
  assert.equal(attribute(html, "og:site_name"), "MSG CTF");
  assert.equal(attribute(html, "og:description"), SHARE_COPY.description);
  assert.equal(attribute(html, "og:description"), "대학생 오프라인 해킹 축제");
  assert.equal(attribute(html, "og:description"), attribute(html, "twitter:description"));
  assert.equal(attribute(html, "og:description"), attribute(html, "description"));
  assert.equal(attribute(html, "og:title"), attribute(html, "twitter:title"));
  assert.ok(html.indexOf('property="og:image"') < html.indexOf('<div id="root">'));
  assert.equal((html.match(/property="og:image" /g) ?? []).length, 1);
});

test("공유 소개는 대회 이름과 한 줄 소개로 정리하고 모집 조건을 붙이지 않는다", () => {
  const metadata = createShareMetadata();
  assert.equal(metadata.title, "MSG CTF 2026");
  assert.equal(metadata.description, "대학생 오프라인 해킹 축제");
  assert.doesNotMatch(metadata.description + metadata.imageAlt + SHARE_COPY.imageSubtitle, /참가비|무료|75팀|2인 1팀/);
  assert.ok(metadata.description.length <= 140, "작은 공유 카드에서도 읽을 수 있는 짧은 소개");
  assert.equal(SHARE_COPY.imageSubtitle, "JEOPARDY  /  KoTH  /  CLUB BOOTH");
  assert.match(metadata.imageAlt, /11월 8일 일요일 오전 10시 시작/);
});

test("이미지는 공개 HTTPS 절대 주소이고 일반 OG와 큰 이미지 카드가 같은 파일을 가리킨다", () => {
  const html = shareMetadataPlugin().transformIndexHtml.handler(source);
  const image = new URL(attribute(html, "og:image"));
  assert.equal(image.origin, "https://msg2.mjsec.kr");
  assert.equal(image.pathname, SHARE_IMAGE.path);
  assert.match(image.searchParams.get("v"), /^[a-f0-9]{12}$/);
  assert.equal(attribute(html, "og:image"), attribute(html, "og:image:secure_url"));
  assert.equal(attribute(html, "og:image"), attribute(html, "twitter:image"));
  assert.equal(attribute(html, "twitter:card"), "summary_large_image");
  assert.match(attribute(html, "og:image:alt"), /MSG CTF 2026 로고/);
  assert.equal(attribute(html, "og:image:alt"), attribute(html, "twitter:image:alt"));
});

test("운영 도메인을 바꾸면 대표 주소와 이미지 주소가 함께 바뀌고 경로나 인증 정보를 끼우지 않는다", () => {
  const metadata = createShareMetadata("https://ctf.example.org/");
  assert.equal(metadata.siteUrl, "https://ctf.example.org/");
  assert.equal(new URL(metadata.imageUrl).origin, "https://ctf.example.org");
  for (const url of ["", "http://ctf.example.org", "https://user:password@ctf.example.org", "https://ctf.example.org/login", "https://ctf.example.org?token=test", "https://ctf.example.org#fragment"]) {
    assert.throws(() => createShareMetadata(url));
  }
  const html = shareMetadataPlugin("https://ctf.example.org").transformIndexHtml.handler(source);
  assert.equal(attribute(html, "og:url"), "https://ctf.example.org/");
  assert.match(html, /rel="canonical" href="https:\/\/ctf.example.org\/"/);
  assert.doesNotMatch(html, /msg2\.mjsec\.kr/);
});

test("공유 그림은 1200×630 RGB JPEG이고 작은 파일만 배포하며 첫 화면에서 미리 내려받지 않는다", () => {
  const image = readFileSync(new URL(`../public${SHARE_IMAGE.path}`, import.meta.url));
  assert.equal(image.readUInt16BE(0), 0xffd8);
  assert.equal(image.readUInt16BE(image.length - 2), 0xffd9);
  assert.ok(image.length < 350000, `image is ${image.length} bytes`);
  let dimensions;
  for (let cursor = 2; cursor < image.length - 8;) {
    assert.equal(image[cursor], 0xff);
    const marker = image[cursor + 1];
    if (marker === 0xda) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      dimensions = { height: image.readUInt16BE(cursor + 5), width: image.readUInt16BE(cursor + 7), channels: image[cursor + 9] };
      break;
    }
    cursor += 2 + image.readUInt16BE(cursor + 2);
  }
  assert.deepEqual(dimensions, { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, channels: 3 });
  const html = shareMetadataPlugin().transformIndexHtml.handler(source);
  assert.equal(attribute(html, "og:image:width"), "1200");
  assert.equal(attribute(html, "og:image:height"), "630");
  assert.equal(attribute(html, "og:image:type"), "image/jpeg");
  assert.doesNotMatch(html, /<link[^>]+(?:preload|prefetch)[^>]+msg-ctf-2026-share/);
  assert.doesNotMatch(html, /<img[^>]+msg-ctf-2026-share/);
});
