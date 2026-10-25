import { formatFileSize } from "./challengeDetailMapper.js";

// 원격 실행 기록. 경로는 GET·POST /challenges/{id}/remote_runs (api/challenges.js)
// 실행이 실제로 시작된 기록만 제출 횟수에 들어간다(counted) 운영 오류와 파일 거절은 횟수를 쓰지 않는다
export const REMOTE_RUN_STATUS = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  TIMED_OUT: "TIMED_OUT",
  CRASHED: "CRASHED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
};

export const REMOTE_RUN_LABEL = {
  QUEUED: "대기 중",
  RUNNING: "실행 중",
  COMPLETED: "실행 완료",
  TIMED_OUT: "시간 초과",
  CRASHED: "VM 중단",
  FAILED: "실행 실패",
  REJECTED: "파일 거절",
};

// 결과 출력 위에 한 줄로 붙이는 안내 완료는 출력만 보인다
export const REMOTE_RUN_NOTICE = {
  TIMED_OUT: "제한 시간 안에 끝나지 않아 멈췄습니다 멈추기 전까지의 출력입니다",
  CRASHED: "실행 중 VM이 멈춰 초기화했습니다",
  FAILED: "운영 환경 문제로 실행하지 못했습니다 다시 실행해 주세요",
  REJECTED: "실행 파일 검사에서 거절됐습니다",
};

const ACTIVE_STATUSES = new Set([REMOTE_RUN_STATUS.QUEUED, REMOTE_RUN_STATUS.RUNNING]);

export function isActiveRun(run) {
  return ACTIVE_STATUSES.has(run?.status);
}

const text = (value) => (typeof value === "string" ? value : "");
const date = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

export function mapRemoteRun(run) {
  if (!run || typeof run !== "object" || run.run_id == null) return null;
  return {
    id: String(run.run_id),
    status: typeof run.status === "string" ? run.status : "",
    counted: run.counted === true,
    queuePosition:
      Number.isInteger(run.queue_position) && run.queue_position > 0 ? run.queue_position : null,
    fileName: text(run.file_name) || "payload.exe",
    fileSize: Number.isFinite(run.file_size) && run.file_size >= 0 ? run.file_size : null,
    sha256: /^[0-9a-f]{64}$/i.test(text(run.payload_sha256)) ? run.payload_sha256.toLowerCase() : null,
    createdAt: date(run.created_at),
    startedAt: date(run.started_at),
    finishedAt: date(run.finished_at),
    durationMs: Number.isFinite(run.duration_ms) && run.duration_ms >= 0 ? run.duration_ms : null,
    exitCode: Number.isInteger(run.exit_code) ? run.exit_code : null,
    stdout: text(run.stdout),
    stderr: text(run.stderr),
    message: text(run.message).trim(),
  };
}

// 최신 실행이 앞에 오게 둔다 시각이 같거나 없으면 받은 순서를 지킨다
export function mapRemoteRuns(data) {
  const runs = (Array.isArray(data?.runs) ? data.runs : []).map(mapRemoteRun).filter(Boolean);
  runs.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  return {
    runs,
    usedAttempts: count(data?.used_attempts),
    maxAttempts: count(data?.max_attempts) || null,
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
