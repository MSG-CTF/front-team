export function validateSubmissionReason(reason) {
  const length = Array.from(reason.trim()).length;
  return length >= 1 && length <= 500 ? "" : "삭제 사유는 공백을 제외한 앞뒤 정리 후 1~500자로 입력하세요";
}

export function submissionDeleteMessage(data) {
  if (data?.revoked == null) return "제출 기록이 삭제되었습니다.";
  const { score, mileage, line_monopoly: line } = data.revoked;
  return ["정답 회수가 완료되었습니다.",
    score != null && `회수 점수: ${score}점`,
    mileage != null && `회수 마일리지: ${mileage}`,
    line != null && `취소된 라인 독점: ${line.line_number}번 라인 (${line.earned_score}점)`,
  ].filter(Boolean).join("\n");
}

export function submissionDeleteError(error) {
  const status = error?.response?.status;
  if (status === 400) return "삭제 사유는 1~500자여야 합니다. 입력 내용을 확인하세요.";
  if (status === 404) return "이미 삭제되었거나 존재하지 않는 제출 기록입니다. 목록을 다시 조회하세요.";
  if (status === 401) return "인증이 만료되었습니다. 다시 로그인하세요.";
  if (status === 403) return "제출 기록을 삭제할 관리자 권한이 없습니다.";
  return "요청 결과를 확인하지 못했습니다. 다시 삭제하기 전에 목록을 조회하여 상태를 확인하세요.";
}
