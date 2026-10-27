import { LosslessNumber, parse } from "lossless-json";

// 보드 지급액의 큰 정수만 보존하고 칸 번호·주사위 등은 기존 number로 읽는다
export function parseScoreJson(data) {
  if (typeof data !== "string") return data;
  return parse(data, null, (text) => {
    const value = Number(text);
    return /^-?\d+$/.test(text) && !Number.isSafeInteger(value)
      ? new LosslessNumber(text)
      : value;
  });
}

export function validScore(score) {
  if (score instanceof LosslessNumber) {
    return /^\d+(?:\.\d+)?$/.test(score.value) ? score : null;
  }
  return Number.isFinite(score) && score >= 0 ? (score === 0 ? 0 : score) : null;
}
