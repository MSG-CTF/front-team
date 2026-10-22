// 점수와 마일리지는 천 단위 쉼표를 넣어 자릿수가 다른 줄도 한눈에 비교되게 한다
export function formatAdminNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : String(value);
}
