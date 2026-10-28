import { formatFileSize } from "./challengeDetailMapper.js";

// 실행 기록은 /challenges/{id}/exe-submissions 에서 조회한다
export const REMOTE_RUN_STATUS = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  TIMED_OUT: "TIMED_OUT",
  CRASHED: "CRASHED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
  PREPARING: "PREPARING",
  CLEANUP_PENDING: "CLEANUP_PENDING",
  START_UNKNOWN: "START_UNKNOWN",
};

export const REMOTE_RUN_LABEL = {
  QUEUED: "대기 중",
  RUNNING: "실행 중",
  COMPLETED: "실행 완료",
  TIMED_OUT: "시간 초과",
  CRASHED: "VM 중단",
  FAILED: "실행 실패",
  REJECTED: "파일 거절",
  PREPARING: "실행 준비 중",
  CLEANUP_PENDING: "정리 중",
  START_UNKNOWN: "실행 확인 중",
};

// 결과 출력 위에 한 줄로 붙이는 안내 완료는 출력만 보인다
export const REMOTE_RUN_NOTICE = {
  TIMED_OUT: "제한 시간 안에 끝나지 않아 멈췄습니다 멈추기 전까지의 출력입니다",
  CRASHED: "실행 중 VM이 멈춰 초기화했습니다",
  FAILED: "실행 환경에서 오류가 발생했습니다 정리가 끝나면 다시 실행할 수 있습니다",
  START_UNKNOWN: "실행 여부를 확인하고 있습니다 확인이 끝날 때까지 새 실행을 막아두었습니다",
  CLEANUP_PENDING: "실행은 끝났고 환경을 정리하고 있습니다",
  REJECTED: "실행 파일 검사에서 거절됐습니다",
};

const ACTIVE_STATUSES = new Set(["QUEUED", "PREPARING", "RUNNING", "CLEANUP_PENDING", "START_UNKNOWN"]);

export function isActiveRun(run) {
  if (run?.canStartNext === true) return false;
  return ACTIVE_STATUSES.has(run?.status) || run?.releasePending === true || run?.requiresReview === true;
}

// 연결이 끊긴 동안 예전 순서를 현재 순서처럼 계속 보이지 않는다
export function currentQueuePosition(run, now = Date.now()) {
  if (run?.status !== REMOTE_RUN_STATUS.QUEUED) return null;
  if (run.queuePolicy === "TEAM_FIFO") {
    const observed = Date.parse(run.queueObservedAt);
    if (!Number.isFinite(observed) || observed > now || now - observed > 15000) return null;
  }
  return Number.isInteger(run.queuePosition) && run.queuePosition > 0 ? run.queuePosition : null;
}

const text = (value) => (typeof value === "string" ? value : "");
const date = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

export function remoteRetryDeadline(response, now = Date.now()) {
  const seconds = Number(response?.data?.data?.retry_after_seconds);
  const header = response?.headers?.["retry-after"];
  const headerSeconds = header == null ? NaN : Number(header);
  const fromHeader = Number.isFinite(headerSeconds) ? now + Math.max(0, headerSeconds) * 1000 : Date.parse(header);
  return Math.max(now, Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1000 : now, Number.isFinite(fromHeader) ? fromHeader : now);
}

export function mapRemoteRun(run) {
  if (!run || typeof run !== "object" || (run.submission_id ?? run.run_id) == null) return null;
  const status = { TIMEOUT: "TIMED_OUT", CRASH: "CRASHED", INFRA_ERROR: "FAILED" }[run.status] ?? run.status;
  const output = run.output;
  return {
    id: String(run.submission_id ?? run.run_id),
    status: typeof status === "string" ? status : "",
    releasePending: run.release_pending === true,
    requiresReview: run.requires_review === true,
    canStartNext: run.requires_review === false && Boolean(date(run.finished_at))
      && ["CLEANUP_PENDING", "COMPLETED", "CRASH", "TIMEOUT", "INFRA_ERROR"].includes(run.status)
      && ["COMPLETED", "CRASH", "TIMEOUT", "INFRA_ERROR"].includes(run.execution_status),
    outputAvailable: output != null || typeof run.stdout === "string" || typeof run.stderr === "string",
    counted: run.counted === true,
    queuePolicy: run.queue_policy === "TEAM_FIFO" ? "TEAM_FIFO" : null,
    queueObservedAt: date(run.queue_observed_at),
    queuePosition:
      Number.isInteger(run.queue_position) && run.queue_position > 0 ? run.queue_position : null,
    fileName: text(run.file_name) || "payload.exe",
    fileSize: Number.isFinite(run.file_size) && run.file_size >= 0 ? run.file_size : null,
    sha256: /^[0-9a-f]{64}$/i.test(text(run.payload_sha256)) ? run.payload_sha256.toLowerCase() : null,
    createdAt: date(run.submitted_at ?? run.created_at),
    startedAt: date(run.started_at),
    finishedAt: date(run.finished_at),
    durationMs: Number.isFinite(run.duration_ms) && run.duration_ms >= 0 ? run.duration_ms : null,
    exitCode: Number.isInteger(run.exit_code) ? run.exit_code : null,
    stdout: text(output?.stdout ?? run.stdout),
    stderr: text(output?.stderr ?? run.stderr),
    message: text(run.message).trim(),
  };
}

// 최신 실행이 앞에 오게 둔다 시각이 같거나 없으면 받은 순서를 지킨다
export function mapRemoteRuns(data) {
  const runs = (Array.isArray(data?.runs) ? data.runs : []).map(mapRemoteRun).filter(Boolean);
  runs.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  return {
    runs,
    totalRuns: Number.isSafeInteger(data?.total_count) && data.total_count >= runs.length
      ? data.total_count : runs.length,
    usedAttempts: count(data?.used_attempts),
    maxAttempts: null,
  };
}

export function formatRunDuration(milliseconds) {
  if (milliseconds == null) return null;
  const seconds = milliseconds / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}초` : `${Math.round(seconds)}초`;
}

// 브라우저에서 먼저 거르는 검사 서버가 같은 검사를 다시 하므로 여기서는 빨리 알려주기만 한다
export function checkPayloadFile(file, config) {
  if (!file) return "실행 파일을 골라 주세요";
  const name = file.name.toLowerCase();
  if (!config.accept.some((extension) => name.endsWith(extension)))
    return `${config.accept.join(", ")} 파일만 낼 수 있습니다`;
  if (file.size === 0) return "빈 파일은 낼 수 없습니다";
  if (file.size > config.maxBytes)
    return `${formatFileSize(config.maxBytes)} 이하 파일만 낼 수 있습니다`;
  return null;
}

// MZ 머리와 PE 머리의 기계 종류만 읽는다 0x8664 가 x64(AMD64) 다
export async function readPeMachine(file) {
  const read = async (start, length) =>
    new DataView(await file.slice(start, start + length).arrayBuffer());
  if (file.size < 0x40) return "not-pe";
  const dos = await read(0, 0x40);
  if (dos.getUint16(0, true) !== 0x5a4d) return "not-pe";
  const offset = dos.getUint32(0x3c, true);
  if (offset + 6 > file.size) return "not-pe";
  const header = await read(offset, 6);
  if (header.getUint32(0, true) !== 0x00004550) return "not-pe";
  return header.getUint16(4, true) === 0x8664 ? "amd64" : "other";
}

export async function checkPayloadMachine(file, config) {
  if (config.executable !== "pe-amd64") return null;
  try {
    const machine = await readPeMachine(file);
    if (machine === "not-pe") return "Windows 실행 파일(PE)이 아닙니다";
    if (machine === "other") return "x64(AMD64)용으로 빌드한 실행 파일만 낼 수 있습니다";
    return null;
  } catch {
    return "파일을 읽지 못했습니다 다시 골라 주세요";
  }
}
