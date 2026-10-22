// 점수와 마일리지는 천 단위 쉼표를 넣어 자릿수가 다른 줄도 한눈에 비교되게 한다
export function formatAdminNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : String(value);
}

// 금액 입력: 숫자만 남기고 앞자리 0을 지운 뒤 쉼표를 넣어 보인다 "1,500"
export function amountDigits(text, maxLength = 10) {
  return String(text ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "").slice(0, maxLength);
}

export function formatAmountDigits(digits) {
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}
