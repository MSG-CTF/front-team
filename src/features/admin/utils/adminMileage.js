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
