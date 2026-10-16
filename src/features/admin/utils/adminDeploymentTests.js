export const deploymentTestStatus = {
  REQUESTED: "접수됨", SCHEDULING: "자원 배정 중", PROVISIONING: "컨테이너 준비 중",
  RUNNING: "실행 중", RESTARTING: "다시 시작 중", RESETTING: "초기화 중",
  STOPPING: "종료 중", STOPPED: "정리 중", CLEANUP_PENDING: "정리 중",
  EXPIRED: "만료 · 정리 중", CLEANED: "종료됨", FAILED: "실패",
};

export function deploymentTestSteps(test) {
  const stages = ["요청 접수", "자원 배정", "컨테이너 준비", "접속 확인"];
  const index = { REQUESTED: 0, SCHEDULING: 1, PROVISIONING: 2, RUNNING: 3 }[test?.status];
  const failedIndex = ["FAILED", "CLEANUP_PENDING", "CLEANED"].includes(test?.status)
    ? { RESOURCE_UNAVAILABLE: 1, BROKER_CALL_FAILED: 1, RUNTIME_CREATE_FAILED: 2, INVALID_REQUEST: 0, UNAUTHORIZED: 0 }[test.error_code]
    : undefined;
  return stages.map((label, position) => ({ label,
    state: !test ? "waiting" : test.running_at ? (position < 3 ? "done" : "manual")
      : failedIndex !== undefined ? (position < failedIndex ? "done" : position === failedIndex ? "failed" : "waiting")
      : index !== undefined ? (position < index ? "done" : position === index ? "current" : "waiting") : "waiting",
  }));
}
