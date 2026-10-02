import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { eventConfig } from "../src/features/intro/config/eventConfig.js";
import { getEventLabels } from "../src/features/intro/utils/eventData.js";

export const SHARE_IMAGE = Object.freeze({
  path: "/assets/intro/msg-ctf-2026-share-v1.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
});

export const SHARE_COPY = Object.freeze({
  description: "대학생 오프라인 해킹 축제",
  imageSubtitle: "JEOPARDY  /  KoTH  /  CLUB BOOTH",
});

const imageFile = new URL(`../public${SHARE_IMAGE.path}`, import.meta.url);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export function createShareMetadata(publicSiteUrl = "https://msg2.mjsec.kr") {
  const site = new URL(publicSiteUrl);
  if (site.protocol !== "https:" || site.username || site.password ||
    site.pathname !== "/" || site.search || site.hash) {
    throw new Error("VITE_PUBLIC_SITE_URL에는 경로나 로그인 정보 없이 HTTPS 사이트 주소만 지정하세요");
  }
  const labels = getEventLabels(eventConfig.event);
  const year = eventConfig.event.date.slice(0, 4);
  const imageVersion = createHash("sha256").update(readFileSync(imageFile)).digest("hex").slice(0, 12);
  const image = new URL(SHARE_IMAGE.path, site);
  image.searchParams.set("v", imageVersion);
  return {
    title: `MSG CTF ${year}`,
    description: SHARE_COPY.description,
    siteUrl: site.href,
    imageUrl: image.href,
    imageAlt: `MSG CTF ${year} 로고와 가을 축제 배경, ${labels.shortDate} ${labels.startTime}, Jeopardy·KoTH·동아리 부스`,
  };
}

// 앱이 실행되기 전의 HTML에 넣는다 JavaScript를 실행하지 않는 공유 스크래퍼도 읽을 수 있다
export function shareMetadataPlugin(publicSiteUrl) {
  const metadata = createShareMetadata(publicSiteUrl);
  const replacements = {
    MSG_SHARE_TITLE: metadata.title,
    MSG_SHARE_DESCRIPTION: metadata.description,
    MSG_SHARE_SITE_URL: metadata.siteUrl,
    MSG_SHARE_IMAGE_URL: metadata.imageUrl,
    MSG_SHARE_IMAGE_ALT: metadata.imageAlt,
  };
  return {
    name: "msg-ctf-share-metadata",
    transformIndexHtml: {
      order: "pre",
      handler: html => html.replace(/%(MSG_SHARE_[A-Z_]+)%/g, (token, name) =>
        Object.hasOwn(replacements, name) ? escapeHtml(replacements[name]) : token),
    },
  };
}
