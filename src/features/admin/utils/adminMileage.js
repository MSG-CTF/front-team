export function validateMileageAdjustment({ teamId, amount, reason }) {
  if (!teamId) return "대상 팀을 선택하세요";
  const value = Number(amount);
  if (!String(amount).trim() || !Number.isSafeInteger(value) || value === 0 || Math.abs(value) > 2147483647) {
    return "변동량은 0이 아닌 정수로 입력하세요";
  }
  if (!reason?.trim() || Array.from(reason.trim()).length > 500) return "사유는 1~500자로 입력하세요";
  return "";
}

// 응답을 놓친 요청은 같은 키로 재시도하고, 입력을 바꾼 요청에는 새 키를 쓴다
export function mileageAttempt(previous, { teamId, amount, reason }, createKey) {
  const fingerprint = JSON.stringify([teamId, Number(amount), reason.trim()]);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, key: createKey() };
}

export function validateCheckout({ paymentToken, amount, itemName }) {
  if (!paymentToken?.trim()) return "QR 결제 토큰을 입력하세요";
  const value = Number(amount);
  if (!String(amount).trim() || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    return "결제 금액은 1 이상의 정수로 입력하세요";
  }
  if (!itemName?.trim() || Array.from(itemName.trim()).length > 100) return "품목은 1~100자로 입력하세요";
  return "";
}

export function canRefund(entry) {
  return Boolean(entry?.history_id) && entry.type === "PURCHASE" && entry.is_refunded === false
    && Number.isFinite(entry.amount) && entry.amount < 0;
}

export function paymentErrorMessage(error) {
  if (!error?.response || error.response.status >= 500) {
    return "처리 결과를 확인하지 못했습니다 먼저 결제 내역을 새로고침해서 확인하세요";
  }
  return error.response.data?.message || "결제 요청이 처리되지 않았습니다";
}

// 내역 표에는 사람이 읽는 이름을 보이고 원래 값은 title로 남긴다
export const MILEAGE_TYPE_LABELS = {
  CHALLENGE_SOLVE: "문제 풀이",
  START_BONUS: "출발 보너스",
  ROULETTE: "룰렛",
  KOTH_REWARD: "KoTH 보상",
  ADMIN_GRANT: "관리자 지급",
  REFUND: "환불",
  PURCHASE: "결제",
  ADMIN_DEDUCT: "관리자 회수",
};

export function getMileageTypeLabel(type) {
  return MILEAGE_TYPE_LABELS[type] ?? type ?? "-";
}

export function formatMileageAmount(amount) {
  if (!Number.isFinite(amount)) return "-";
  const text = Math.abs(amount).toLocaleString("ko-KR");
  return amount > 0 ? `+${text}` : amount < 0 ? `-${text}` : "0";
}

// 마일리지 내역 필터: 대회 중에는 문제 풀이 보상이 대부분이라 기본은 그걸 뺀 운영 내역을 본다
// 백엔드 type 은 쉼표로 여러 유형을 함께 받는다 (README 8절 mileage_history, 프론트 요청)
export const MILEAGE_FILTERS = [
  { key: "ops", label: "운영 내역", types: ["PURCHASE", "REFUND", "ADMIN_GRANT", "ADMIN_DEDUCT", "START_BONUS", "ROULETTE", "KOTH_REWARD"] },
  { key: "payment", label: "결제 · 환불", types: ["PURCHASE", "REFUND"] },
  { key: "admin", label: "관리자 조정", types: ["ADMIN_GRANT", "ADMIN_DEDUCT"] },
  { key: "reward", label: "게임 보상", types: ["START_BONUS", "ROULETTE", "KOTH_REWARD"] },
  { key: "solve", label: "문제 풀이", types: ["CHALLENGE_SOLVE"] },
  { key: "all", label: "전체", types: [] },
];

export function mileageFilterQuery(key) {
  const filter = MILEAGE_FILTERS.find((item) => item.key === key);
  return filter?.types.length ? filter.types.join(",") : undefined;
}

// 유형마다 색 하나: 결제는 주황, 환불은 초록, 관리자 지급은 파랑, 회수는 빨강, 게임 보상은 노랑과 보라, 문제 풀이는 회색
export const MILEAGE_TYPE_TONES = {
  PURCHASE: "orange", REFUND: "good", ADMIN_GRANT: "blue", ADMIN_DEDUCT: "bad",
  START_BONUS: "warn", ROULETTE: "warn", KOTH_REWARD: "purple", CHALLENGE_SOLVE: "neutral",
};

// 부스에서 자주 파는 품목: 최근 결제에서 품목과 금액을 뽑아 한 번에 다시 넣는다 환불된 결제는 뺀다
export function recentPaymentItems(history = [], limit = 6) {
  const items = [];
  const seen = new Set();
  for (const entry of history) {
    const name = typeof entry?.reason === "string" ? entry.reason.trim() : "";
    const amount = Math.abs(Number(entry?.amount));
    if (entry?.type !== "PURCHASE" || entry.is_refunded || !name || !Number.isSafeInteger(amount) || amount < 1) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    items.push({ itemName: name, amount });
    if (items.length >= limit) break;
  }
  return items;
}

// 마일리지 조정: 지급과 회수를 고른 뒤 양수 금액만 적는다 서버에는 부호를 붙여 보낸다
export function signedMileageAmount(mode, digits) {
  if (!digits) return "";
  return mode === "deduct" ? `-${digits}` : digits;
}
