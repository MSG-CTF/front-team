// 관리자 화면에서 끝없이 늘 수 있는 목록을 다루는 도구
// 이력처럼 쌓이는 목록은 최근 것부터 정해진 수만 보이고, 전부 받아야 하는 목록은 상한을 둔다

// 롤백 지점과 비밀값 이력처럼 쪽 나눔이 없는 이력 목록은 최근 20개만 보인다
export const RECENT_LIMIT = 20;

function timeOf(item) {
  const value = Date.parse(item?.created_at);
  return Number.isFinite(value) ? value : -Infinity;
}

// 생성 시각이 늦은 것부터 세우고 앞의 limit개만 남긴다 시각을 읽을 수 없는 항목은 뒤로 보내고 같은 시각은 원래 순서를 지킨다
export function latestFirst(items, limit = Infinity) {
  const sorted = (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index, time: timeOf(item) }))
    .sort((a, b) => (b.time - a.time) || a.index - b.index)
    .map(({ item }) => item);
  return { items: sorted.slice(0, limit), hidden: Math.max(0, sorted.length - limit) };
}

// 쪽 단위 목록을 모은다 첫 쪽에서 전체 수와 실제 쪽 크기를 알고 나머지 쪽은 parallel개씩 함께 받는다
// limit을 넘는 목록은 거기서 멈추고 capped로 알린다 쪽 사이에 순서가 밀려 같은 항목이 두 번 오면 한 번만 남긴다
// fetchPage(page)는 { items, totalCount }를 돌려주거나 던진다
export async function collectPages(fetchPage, { limit = Infinity, parallel = 4, keyOf = (item) => item?.id } = {}) {
  const first = await fetchPage(1);
  const items = [...first.items];
  const reported = first.totalCount == null ? NaN : Number(first.totalCount);
  const total = Number.isFinite(reported) ? reported : items.length;
  const pageCount = items.length ? Math.ceil(Math.min(total, limit) / items.length) : 1;
  for (let start = 2; start <= pageCount; start += parallel) {
    const pages = [];
    for (let page = start; page < start + parallel && page <= pageCount; page += 1) pages.push(fetchPage(page));
    for (const result of await Promise.all(pages)) items.push(...result.items);
  }
  const seen = new Set();
  const unique = items.filter((item) => {
    const key = keyOf(item);
    if (key == null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { items: unique.slice(0, limit), totalCount: total, capped: total > limit };
}
