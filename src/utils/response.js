// 응답 봉투는 성공/실패 무관하게 항상 { code, message, data } 형태로 온다.
// HTTP 200이어도 실패일 수 있으므로 code로만 성공을 판정한다.
// (예: 플래그 오답은 200 OK + code: "INCORRECT_FLAG")
export function isSuccess(envelope) {
  return envelope?.code === "SUCCESS";
}
