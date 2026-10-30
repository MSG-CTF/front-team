export function validateSubmissionReason(reason) {
  const length = Array.from(reason.trim()).length;
  return length >= 1 && length <= 500 ? "" : "삭제 사유는 1~500자로 입력하세요";
}

export function submissionDeleteMessage(data) {
  if (data?.revoked == null) return "제출 기록을 삭제했습니다";
  const { score, mileage, line_monopoly: line } = data.revoked;
  return ["정답을 회수했습니다",
    score != null && `회수 점수: ${score}점`,
    mileage != null && `회수 마일리지: ${mileage}`,
    line != null && `취소된 라인 독점: ${line.line_number}번 라인 (${line.earned_score}점)`,
  ].filter(Boolean).join("\n");
}

export function submissionDeleteError(error) {
  const status = error?.response?.status;
  if (status === 400) return "삭제 사유는 1~500자로 입력하세요";
  if (status === 404) return "이미 삭제됐거나 없는 제출 기록입니다 목록을 다시 불러오세요";
  if (status === 401) return "로그인이 만료됐습니다 다시 로그인하세요";
  if (status === 403) return "제출 기록을 삭제할 권한이 없습니다";
  return "삭제 결과를 확인하지 못했습니다 다시 지우기 전에 목록에서 상태를 확인하세요";
}
