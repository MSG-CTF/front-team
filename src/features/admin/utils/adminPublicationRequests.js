export function publicationBody(draft) {
  const slug = draft.slug.trim(), sha = draft.sha.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return { error: "등록한 문제의 저장소 이름을 입력해주세요" };
  if (sha && !/^[a-f0-9]{40}$/.test(sha)) return { error: "커밋 SHA는 40자리로 입력해주세요" };
  return { body: { challenge_slug: slug, requested_sha: sha || null, runtime_smoke: false } };
}

export function publicationRunUrl(value) {
  try { const url = new URL(value); return url.origin === "https://github.com" && /^\/MSG-CTF\/[^/]+\/actions\/runs\/\d+$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export const PUBLICATION_STATUS = { NOT_DISPATCHED: "발행 전", DISPATCH_UNKNOWN: "접수 확인 필요", DISPATCHED: "발행 요청됨", DISPATCH_REJECTED: "발행 거절", DISPATCH_CONFLICT: "요청 충돌" };
