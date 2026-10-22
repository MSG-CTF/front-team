// 관리자 화면 검색: 대소문자와 띄어쓰기를 무시하고, 한글은 초성만 쳐도 찾는다 (ㄷㅌㄹ → 도토리묵사발)
// 호환 자모(ㄱ~ㅎ)는 NFKC에서 조합용 자모로 바뀌므로 NFC만 쓴다
const CHOSUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

export function normalizeSearch(value) {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase("ko").replace(/\s+/g, "");
}

export function initialsOf(value) {
  return Array.from(normalizeSearch(value), (letter) => {
    const code = letter.codePointAt(0);
    return code >= HANGUL_FIRST && code <= HANGUL_LAST ? CHOSUNG[Math.floor((code - HANGUL_FIRST) / 588)] : letter;
  }).join("");
}

const ONLY_INITIALS = /^[ㄱ-ㅎ]+$/;

// 맞으면 순위(작을수록 앞), 안 맞으면 -1: 앞부분 일치 → 중간 일치 → 초성 일치
export function searchRank(text, query) {
  const needle = normalizeSearch(query);
  if (!needle) return 0;
  const haystack = normalizeSearch(text);
  const index = haystack.indexOf(needle);
  if (index === 0) return 0;
  if (index > 0) return 1 + index / 1000;
  if (ONLY_INITIALS.test(needle)) {
    const initialIndex = initialsOf(haystack).indexOf(needle);
    if (initialIndex === 0) return 2;
    if (initialIndex > 0) return 3 + initialIndex / 1000;
  }
  return -1;
}

export function matchesSearch(text, query) {
  return searchRank(text, query) >= 0;
}

// 목록을 검색어로 거르고 잘 맞는 순서로 세운다 같은 순위는 원래 순서를 지킨다
export function searchItems(items, query, textOf) {
  if (!normalizeSearch(query)) return items;
  return items
    .map((item, index) => ({ item, index, rank: searchRank(textOf(item), query) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}
