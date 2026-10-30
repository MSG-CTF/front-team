export function lineScoreBody(score, reason) {
  const text = String(score).trim(), why = reason.trim();
  if (!/^[0-9]{1,18}(?:\.[0-9]{1,2})?$/.test(text)) return { error: "점수는 0 이상, 소수 둘째 자리까지 입력해주세요" };
  if (!why || Array.from(why).length > 500) return { error: "사유는 1~500자로 입력해주세요" };
  const [whole, fraction = ""] = text.split(".");
  return { body: { earned_score: `${BigInt(whole)}.${fraction.padEnd(2, "0")}`, reason: why } };
}

export function exactLineScore(line) {
  return line.earned_score_exact ?? String(line.earned_score);
}

export function displayLineScore(text) {
  const [whole, fraction] = String(text).split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction && !/^0+$/.test(fraction) ? `.${fraction}` : "");
}
