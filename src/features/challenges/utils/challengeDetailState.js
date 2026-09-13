import {
  findChallengeInstance,
  findOtherInstance,
} from "./challengeDetailMapper.js";

export const INITIAL_DETAIL_STATE = {
  status: "loading",
  challengeData: null,
  instanceData: null,
  otherInstanceData: null,
  pageError: null,
  refreshError: null,
  instanceError: null,
  refreshing: false,
};

export function readDetailResult(result, fallbackMessage) {
  const envelope =
    result.status === "fulfilled"
      ? result.value.data
      : result.reason?.response?.data;
  if (envelope?.code === "SUCCESS") return { data: envelope.data, error: null };
  const status =
    result.status === "fulfilled"
      ? result.value.status
      : result.reason?.response?.status;
  return {
    data: null,
    error: {
      code: envelope?.code || "REQUEST_FAILED",
      message: envelope?.message || fallbackMessage,
      recoverable: status == null || status >= 500 || status === 429,
    },
  };
}

export function resolveDetailState(current, detail, instance, challengeId) {
  const validDetail =
    detail.data &&
    typeof detail.data === "object" &&
    !Array.isArray(detail.data);
  if (
    (!validDetail && !detail.error) ||
    (detail.error && (!detail.error.recoverable || !current.challengeData))
  ) {
    return {
      ...INITIAL_DETAIL_STATE,
      status: "error",
      pageError: detail.error || {
        code: "EMPTY_RESPONSE",
        message: "문제 정보를 찾을 수 없습니다",
      },
    };
  }

  return {
    ...current,
    status: "success",
    challengeData: detail.error ? current.challengeData : detail.data,
    refreshError: detail.error,
    pageError: null,
    instanceData: instance.error
      ? null
      : findChallengeInstance(instance.data, challengeId),
    otherInstanceData: instance.error
      ? null
      : findOtherInstance(instance.data, challengeId),
    instanceError: instance.error,
    refreshing: false,
  };
}
