export function getInstanceFailureNotice(instance) {
  if (instance?.deleteReason === "CREATE_FAILED_CLEANUP" &&
      ["FAILED", "CLEANUP_PENDING", "CLEANED"].includes(instance.status)) {
    return {
      title: "인스턴스를 생성하지 못했습니다",
      message: instance.status === "CLEANUP_PENDING"
        ? "사용한 자원을 정리하고 있습니다 정리가 끝난 뒤 다시 시도해 주세요"
        : "실행 준비 중 오류가 발생했습니다 잠시 후 다시 시도하고, 계속되면 운영진에게 문의해 주세요",
    };
  }
  if (instance?.status !== "FAILED") return null;
  const reset = Boolean(instance.replacedInstanceId);
  if (instance.deleteReason === "TTL_EXPIRED") {
    return {
      title: reset ? "초기화 중 사용 시간이 만료됐습니다" : "생성 중 사용 시간이 만료됐습니다",
      message: "새 인스턴스를 생성해 주세요",
    };
  }
  if (instance.deleteReason === "HARD_TIMEOUT") {
    return {
      title: "최대 사용 시간이 만료됐습니다",
      message: "새 인스턴스를 생성해 주세요",
    };
  }
  return {
    title: reset ? "초기화를 완료하지 못했습니다" : "인스턴스를 생성하지 못했습니다",
    message: "새로 생성한 뒤에도 실패하면 운영진에게 문의해 주세요",
  };
}
