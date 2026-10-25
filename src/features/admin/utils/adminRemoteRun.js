import { mapRemoteRunConfig } from "../../challenges/utils/challengeDetailMapper.js";

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
};

function formatLimit(bytes) {
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
      `팀당 ${config.maxAttempts}회`,
    ].join(" · "),
  };
}

export function remoteRunDraft(value) {
  const config = mapRemoteRunConfig(value) ?? mapRemoteRunConfig({});
  return {
    environment: config.environment,
    accept: config.accept.join(", "),
    amd64: config.executable === "pe-amd64",
    maxMegabytes: String(Math.max(1, Math.round(config.maxBytes / MEGABYTE))),
    timeoutSeconds: String(config.timeoutSeconds),
    maxAttempts: String(config.maxAttempts),
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
  const maxMegabytes = wholeNumber(draft.maxMegabytes, 1, 100);
  const timeoutSeconds = wholeNumber(draft.timeoutSeconds, 10, 600);
  const maxAttempts = wholeNumber(draft.maxAttempts, 1, 20);
  let error = "";
  if (!environment || environment.length > 80) error = "실행 환경을 80자 안으로 적어주세요";
  else if (!accept.length || !accept.every((extension) => /^\.[a-z0-9]{1,10}$/.test(extension))) error = "받는 파일은 .exe 처럼 점으로 시작하는 확장자를 쉼표로 나눠 적어주세요";
  else if (maxMegabytes == null) error = "최대 크기는 1에서 100 MB 사이 정수로 적어주세요";
  else if (timeoutSeconds == null) error = "제한 시간은 10에서 600초 사이 정수로 적어주세요";
  else if (maxAttempts == null) error = "팀당 횟수는 1에서 20회 사이 정수로 적어주세요";
  return {
    error,
    payload: error ? null : {
      environment,
      accept,
      executable: draft.amd64 ? "pe-amd64" : "",
      max_file_bytes: maxMegabytes * MEGABYTE,
      timeout_seconds: timeoutSeconds,
      max_attempts: maxAttempts,
    },
  };
}

export function remoteRunDraftChanged(draft, value) {
  const saved = remoteRunDraft(value);
  return Object.keys(saved).some((key) => String(saved[key]) !== String(draft[key]));
}
