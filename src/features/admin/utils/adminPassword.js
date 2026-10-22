// 강력한 비밀번호: Safari 추천 비밀번호와 같은 꼴 (여섯 글자씩 세 묶음, 대문자 하나와 숫자 하나)
// 헷갈리는 글자(l, o, I, O, 0, 1)는 빼서 불러 주거나 받아 적어도 틀리지 않는다
// 소문자 16자 × 24종, 대문자 1자 × 24종, 숫자 1자 × 8종, 두 자리 위치까지 더해 약 89비트
export const PASSWORD_LOWER = "abcdefghijkmnpqrstuvwxyz";
export const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const PASSWORD_DIGITS = "23456789";

// 0 이상 max 미만 정수를 고르게 뽑는다 (나머지 편향을 피하려고 버리기 표본을 쓴다)
export function secureRandomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

export function generateStrongPassword(randomInt = secureRandomInt) {
  const letters = Array.from({ length: 18 }, () => PASSWORD_LOWER[randomInt(PASSWORD_LOWER.length)]);
  const upperAt = randomInt(letters.length);
  let digitAt = randomInt(letters.length - 1);
  if (digitAt >= upperAt) digitAt += 1;
  letters[upperAt] = PASSWORD_UPPER[randomInt(PASSWORD_UPPER.length)];
  letters[digitAt] = PASSWORD_DIGITS[randomInt(PASSWORD_DIGITS.length)];
  return [0, 6, 12].map((start) => letters.slice(start, start + 6).join("")).join("-");
}

// 직접 입력한 비밀번호의 세기: 길이와 글자 종류로만 가늠한다
export function passwordStrength(password) {
  const text = String(password ?? "");
  if (text.length < 8) return { level: 0, label: "8자 이상 입력" };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((pattern) => pattern.test(text)).length;
  if (text.length >= 16 && kinds >= 3) return { level: 3, label: "강함" };
  if (text.length >= 12 && kinds >= 2) return { level: 2, label: "보통" };
  return { level: 1, label: "약함" };
}
