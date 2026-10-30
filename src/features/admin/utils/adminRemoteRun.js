import { formatFileSize, mapRemoteRunConfig } from "../../challenges/utils/challengeDetailMapper.js";

const MEGABYTE = 1024 * 1024;

// 관리자 화면의 원격 실행 결과 배지. 참가자 화면과 같은 이름을 쓴다
export const ADMIN_REMOTE_RUN_BADGES = {
  QUEUED: { label: "대기 중", tone: "blue" },
  RUNNING: { label: "실행 중", tone: "blue" },
  COMPLETED: { label: "실행 완료", tone: "good" },
  TIMED_OUT: { label: "시간 초과", tone: "warn" },
  CRASHED: { label: "VM 중단", tone: "bad" },
  FAILED: { label: "실행 실패", tone: "neutral" },
  REJECTED: { label: "파일 거절", tone: "neutral" },
  PREPARING: { label: "실행 준비 중", tone: "blue" },
  CLEANUP_PENDING: { label: "정리 중", tone: "warn" },
  START_UNKNOWN: { label: "실행 확인 필요", tone: "warn" },
};

// 백엔드가 행마다 남기는 마지막 오류와 확인 필요 표시를 한 줄로 읽는다 모르는 코드는 그대로 보인다
const REMOTE_RUN_ERROR_LABEL = {
  QA_EXECUTION_VERSION_CHANGED: "승인한 실행 버전이 바뀜",
  QA_APPROVAL_MISMATCH: "승인 범위와 다름",
  EXECUTION_NOT_RESOLVED: "실행 결과 정리 확인 필요",
  LEGACY_EXECUTION_REQUIRES_REVIEW: "이전 실행 기록 확인 필요",
};

export function remoteRunIssue(run) {
  const parts = [];
  if (run?.requires_review) parts.push("운영자 확인 필요");
  if (run?.last_error_code) parts.push(REMOTE_RUN_ERROR_LABEL[run.last_error_code] ?? run.last_error_code);
  return parts.join(" · ");
}

function formatLimit(bytes) {
  if (bytes < MEGABYTE) return formatFileSize(bytes);
  const megabytes = bytes / MEGABYTE;
  return Number.isInteger(megabytes) ? `${megabytes} MB` : `${megabytes.toFixed(1)} MB`;
}

// 목록과 설정 카드에 쓰는 두 줄: 실행 환경, 받는 파일과 제한값
export function remoteRunSummary(value) {
  const config = mapRemoteRunConfig(value);
  if (!config) return null;
  return {
    environment: config.environment || "실행 환경 미정",
    rules: [
      `${config.accept.join(", ")}${config.executable === "pe-amd64" ? " (x64)" : ""}`,
      `${formatLimit(config.maxBytes)} 이하`,
      `${config.timeoutSeconds}초`,
      `요청 간격 ${config.rateLimitSeconds}초`,
      "총 횟수 제한 없음",
      config.queuePolicy === "TEAM_FIFO" ? "팀별 순서 대기 · 팀당 1건" : null,
    ].filter(Boolean).join(" · "),
  };
}

export function remoteRunDraft(value) {
  const config = mapRemoteRunConfig(value) ?? mapRemoteRunConfig({});
  return {
    environment: config.environment,
    accept: config.accept.join(", "),
    amd64: config.executable === "pe-amd64",
    maxMegabytes: String(config.maxBytes / MEGABYTE),
    timeoutSeconds: String(config.timeoutSeconds),
    rateLimitSeconds: String(config.rateLimitSeconds),
    enabled: config.enabled,
  };
}

const wholeNumber = (text, min, max) => {
  if (!/^\d+$/.test(String(text).trim())) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
};

// 저장할 값으로 바꾸고, 틀린 칸이 있으면 무엇이 틀렸는지 한 줄로 알려준다
export function remoteRunChanges(draft) {
  const environment = draft.environment.trim();
  const accept = draft.accept.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const maxFileBytes = Number(draft.maxMegabytes) * MEGABYTE;
  const timeoutSeconds = wholeNumber(draft.timeoutSeconds, 10, 180);
  const rateLimitSeconds = wholeNumber(draft.rateLimitSeconds, 1, 3600);
  let error = "";
  if (!environment || environment.length > 80) error = "실행 환경을 80자 안으로 적어주세요";
  else if (accept.length !== 1 || accept[0] !== ".exe" || !draft.amd64) error = "이 문제는 x64 PE 실행 파일(.exe)만 받습니다";
  else if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || maxFileBytes > 10 * MEGABYTE) error = "최대 크기는 1바이트에서 10 MB 사이로 적어주세요";
  else if (timeoutSeconds == null) error = "제한 시간은 10에서 180초 사이 정수로 적어주세요";
  else if (rateLimitSeconds == null) error = "요청 간격은 1에서 3600초 사이 정수로 적어주세요";
  return {
    error,
    payload: error ? null : {
      environment,
      accept,
      executable: draft.amd64 ? "pe-amd64" : "",
      max_file_bytes: maxFileBytes,
      timeout_seconds: timeoutSeconds,
      rate_limit_seconds: rateLimitSeconds,
      enabled: draft.enabled === true,
    },
  };
}

export function remoteRunDraftChanged(draft, value) {
  const saved = remoteRunDraft(value);
  return Object.keys(saved).some((key) => String(saved[key]) !== String(draft[key]));
}
