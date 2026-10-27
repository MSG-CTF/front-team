import { getChallengeDeadline } from "../../../utils/time.js";

const TERMINAL_STATUSES = new Set(["STOPPED", "FAILED", "EXPIRED", "CLEANED"]);

function stringIdentifier(value) {
  return value == null ? "" : String(value);
}

export function formatFileSize(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0)
    return "크기 정보 없음";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  return (bytes / 1024 ** 3).toFixed(1) + " GB";
}

export function getAttachmentUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, "https://attachment.invalid");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return value.trim();
  } catch {
    return null;
  }
}

const positiveInteger = (value, fallback) =>
  Number.isInteger(value) && value > 0 ? value : fallback;

// 윈도우 커널 문제처럼 참가자가 실행 파일을 내면 운영 VM에서 한 번 돌려 출력을 돌려주는 문제
// GET /challenges/{id} 의 remote_run 이 있으면 인스턴스 대신 원격 실행 칸을 그린다 값이 없으면 문제 파일 기본값을 쓴다
export function mapRemoteRunConfig(value) {
  if (!value || typeof value !== "object") return null;
  const accept = Array.isArray(value.accept)
    ? value.accept
        .filter((extension) => typeof extension === "string" && /^\.[a-z0-9]+$/i.test(extension))
        .map((extension) => extension.toLowerCase())
    : [];
  return {
    environment: typeof value.environment === "string" ? value.environment.trim() : "",
    accept: accept.length ? accept : [".exe"],
    executable: typeof value.executable === "string" ? value.executable : "",
    maxBytes: positiveInteger(value.max_file_bytes, 10 * 1024 * 1024),
    timeoutSeconds: positiveInteger(value.timeout_seconds, 180),
    maxAttempts: positiveInteger(value.max_attempts, 5),
    usedAttempts:
      Number.isInteger(value.used_attempts) && value.used_attempts >= 0
        ? value.used_attempts
        : 0,
  };
}

export function mapChallengeDetail(data) {
  const remoteRun = mapRemoteRunConfig(data.remote_run);
  return {
    title: data.title || "제목 없는 문제",
    category: data.category,
    clubName: data.club_name ?? null,
    difficulty: data.difficulty,
    points: data.score,
    solves: data.solved_team_count,
    solved: data.is_solved === true,
    accessStatus: data.status ?? null,
    openedAt: data.opened_at ?? null,
    // 제한시간은 관리자 설정으로 달라질 수 있어 서버가 준 마감을 쓴다 opened_at + 15분은 구버전 응답용 대체값이다
    solveDeadlineAt: data.solve_deadline_at ?? null,
    description: typeof data.description === "string" ? data.description : "",
    requiresInstance: !remoteRun && data.requires_instance !== false,
    remoteRun,
    attachments: Array.isArray(data.files)
      ? data.files
          .filter((file) => file && typeof file === "object")
          .map((file) => ({
            challengeId: data.challenge_id,
            fileId: file.file_id,
            name: typeof file.file_name === "string" && file.file_name ? file.file_name : "첨부파일",
            url: getAttachmentUrl(file.download_url),
            sizeLabel: formatFileSize(file.file_size),
          }))
      : [],
  };
}

export function getChallengeSubmissionState(challenge, now = Date.now()) {
  const deadline = getChallengeDeadline(challenge?.openedAt, challenge?.solveDeadlineAt);
  const remainingSeconds =
    deadline == null
      ? null
      : Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
  const isCleared = challenge?.accessStatus === "CLEARED";

  return {
    remainingSeconds,
    isCleared,
    expired: remainingSeconds === 0,
    blocked: isCleared || challenge?.solved === true,
  };
}

export function findChallengeInstance(data, challengeId) {
  const instances = Array.isArray(data) ? data : data == null ? [] : [data];
  return (
    instances.find(
      (instance) =>
        instance &&
        stringIdentifier(instance.challenge_id) ===
          stringIdentifier(challengeId),
    ) ?? null
  );
}

export function findOtherInstance(data, challengeId) {
  const instances = Array.isArray(data) ? data : data == null ? [] : [data];
  return (
    instances.find(
      (instance) =>
        instance?.instance_id &&
        instance.challenge_id != null &&
        stringIdentifier(instance.challenge_id) !==
          stringIdentifier(challengeId) &&
        !TERMINAL_STATUSES.has(instance.status),
    ) ?? null
  );
}

export function calculateRemainingSeconds(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  const timestamp = Date.parse(expiresAt);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((timestamp - now) / 1000));
}

export function mapChallengeInstance(data, now = Date.now()) {
  if (!data) return null;
  return {
    instanceId: data.instance_id,
    challengeId: data.challenge_id,
    challengeTitle: data.challenge_title || "다른 문제",
    status: data.status,
    deleteReason: data.delete_reason ?? null,
    replacedInstanceId: data.replaced_instance_id ?? null,
    connectUrl: data.host,
    endpoints: mapInstanceEndpoints(data),
    expiresAt: data.expires_at,
    hardExpiresAt: data.hard_expires_at ?? null,
    remainingSeconds: calculateRemainingSeconds(data.expires_at, now),
    hardRemainingSeconds: calculateRemainingSeconds(data.hard_expires_at, now),
    extendsUsed:
      Number.isInteger(data.extend_count) && data.extend_count >= 0
        ? data.extend_count
        : null,
  };
}

export function mapInstanceEndpoints(data) {
  if (data?.status !== "RUNNING") return [];
  const provided = Array.isArray(data.endpoints) ? data.endpoints : [];
  const endpoints = provided.length
    ? provided
    : data.host
      ? [{ service_url: data.host, container_name: "서비스" }]
      : [];
  return endpoints.flatMap((endpoint) => {
    try {
      const url = new URL(endpoint.service_url);
      if (
        !["http:", "https:", "tcp:", "tls:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        return [];
      const healthPath = endpoint.healthcheck_path;
      const healthcheck = ["http:", "https:"].includes(url.protocol)
        && typeof healthPath === "string" && /^\/(?!\/)[^\s\\?#]*$/.test(healthPath);
      if (healthcheck) url.pathname = healthPath;
      const connection = {};
      for (const field of ["hostname", "connection_port", "tls", "server_name"]) {
        if (Object.hasOwn(endpoint, field)) connection[field] = endpoint[field];
      }
      return [
        {
          name: `${endpoint.container_name || "서비스"}${healthcheck ? " · 상태 확인" : ""}`,
          url: healthcheck ? url.href : endpoint.service_url,
          isWeb: ["http:", "https:"].includes(url.protocol),
          ...connection,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function getInstanceControlState(instance, otherInstance) {
  const canCreate =
    !instance?.instanceId || TERMINAL_STATUSES.has(instance.status);
  const running = instance?.status === "RUNNING";
  const expired =
    instance?.remainingSeconds === 0 || instance?.hardRemainingSeconds === 0;
  return {
    canCreate:
      canCreate && (!otherInstance || otherInstance.status === "RUNNING"),
    canExtend:
      running &&
      !expired &&
      (instance.extendsUsed == null || instance.extendsUsed < 3),
    canRestart: running && !expired,
    canStop: running,
    extendLimitReached:
      running && instance.extendsUsed != null && instance.extendsUsed >= 3,
    expired: running && expired,
  };
}

export function getRetryDeadline(envelope, now = Date.now()) {
  const seconds = envelope?.data?.retry_after_seconds;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? now + Math.ceil(seconds) * 1000
    : null;
}
