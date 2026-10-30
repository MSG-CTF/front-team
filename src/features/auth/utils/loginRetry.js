// 로그인 시도 제한(429)의 Retry-After를 초로 읽는다 값이 없으면 백엔드 기준인 1분을 쓴다
export function retryAfterSeconds(error, now = Date.now()) {
  const value = error?.response?.headers?.["retry-after"];
  const seconds = Number(value);
  if (value != null && value !== "" && Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - now) / 1000)) : 60;
}

export function loginRetryMessage(seconds) {
  return `로그인 시도가 많아 ${seconds}초 뒤에 다시 시도할 수 있습니다`;
}
