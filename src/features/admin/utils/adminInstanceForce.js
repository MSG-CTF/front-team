import { ADMIN_INSTANCE_STATUS_LABEL } from "../../../constants/enums.js";

// 관리자 인스턴스 강제 작업 사유와 Scheduler 관측 정보 (Backend #245, #246)

// 강제 종료, 재시작, 정리(DELETE)는 앞뒤 공백을 뺀 1~500자 사유가 필요하다
// 정리 재시도(retry-cleanup)는 기존대로 빈 객체를 보내고 사유를 받지 않는다
export const INSTANCE_REASON_MAX = 500;

export function normalizeInstanceReason(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > INSTANCE_REASON_MAX) return null;
  return trimmed;
}

// 확인창 종류 reset(강제 재시작), stop(강제 종료와 정리 대기 강제 정리)만 사유를 받는다
export function needsInstanceReason(kind) {
  return kind === "reset" || kind === "stop";
}

// Backend가 검증한 관측값의 유효 시간 이 시간보다 오래된 확인 시각은 화면에서도 오래된 정보로 본다
export const OBSERVATION_MAX_AGE_MS = 60 * 1000;

const OBSERVATION_ERROR_LABELS = {
  NOT_FOUND: "Scheduler에 기록 없음",
  UNAUTHORIZED: "Scheduler 인증 실패",
  FORBIDDEN: "Scheduler 권한 없음",
  UNAVAILABLE: "Scheduler 응답 없음",
  INVALID_RESPONSE: "Scheduler 응답 형식 오류",
};

const statusLabel = (status) => (status ? ADMIN_INSTANCE_STATUS_LABEL[status] ?? status : null);

// scheduler_observation 한 건을 화면 표시로 바꾼다
// 확인했고(OK) 비교 결과가 boolean으로 온 경우만 일치/불일치로 보이고 나머지는 모두 확인되지 않은 정보다
// null, 빠진 필드, 모르는 값은 정상 일치로 보지 않는다
// 반환: { state, label, tone, remoteStatus, remoteLabel, checkedAt, detail }
//   state: match | mismatch | error | stale | unchecked
export function describeSchedulerObservation(observation, now = Date.now()) {
  const value = observation && typeof observation === "object" ? observation : null;
  const checkedAt = typeof value?.checked_at === "string" && Number.isFinite(Date.parse(value.checked_at)) ? value.checked_at : null;
  const remoteStatus = typeof value?.status === "string" && value.status ? value.status : null;
  const base = { remoteStatus, remoteLabel: statusLabel(remoteStatus), checkedAt };
  const unchecked = { ...base, state: "unchecked", label: "미확인", tone: "neutral", detail: "Scheduler 확인 결과가 아직 없습니다" };
  if (!value) return { ...unchecked, detail: "Scheduler 관측 정보를 받지 못했습니다" };

  const check = value.check_status;
  if (check === "NOT_CHECKED") return unchecked;
  if (check === "STALE") {
    return { ...base, state: "stale", label: "오래된 정보", tone: "warn",
      detail: remoteStatus ? `마지막 확인 값 ${statusLabel(remoteStatus)} - 지금 상태와 다를 수 있습니다` : "확인 이후 상태가 바뀌었거나 확인한 지 오래됐습니다" };
  }
  if (check === "ERROR") {
    const code = typeof value.error_code === "string" ? value.error_code : null;
    return { ...base, remoteStatus: null, remoteLabel: null, state: "error", label: "조회 실패", tone: "bad",
      detail: code ? OBSERVATION_ERROR_LABELS[code] ?? code : "Scheduler 조회에 실패했습니다" };
  }
  if (check !== "OK" || !remoteStatus || !checkedAt) return unchecked;

  // Backend 판정 뒤 응답이 늦게 그려졌거나 화면이 오래 열려 있으면 여기서 오래된 정보로 낮춘다
  const age = now - Date.parse(checkedAt);
  if (!(age <= OBSERVATION_MAX_AGE_MS)) {
    return { ...base, state: "stale", label: "오래된 정보", tone: "warn",
      detail: `마지막 확인 값 ${statusLabel(remoteStatus)} - 지금 상태와 다를 수 있습니다` };
  }
  if (value.status_mismatch === true) {
    return { ...base, state: "mismatch", label: "상태 불일치", tone: "bad", detail: `Scheduler는 ${statusLabel(remoteStatus)} 상태입니다` };
  }
  if (value.status_mismatch === false) {
    return { ...base, state: "match", label: "일치", tone: "good", detail: `Scheduler도 ${statusLabel(remoteStatus)} 상태입니다` };
  }
  return unchecked;
}
