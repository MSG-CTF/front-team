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

export function mapChallengeDetail(data) {
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
    description: typeof data.description === "string" ? data.description : "",
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
  const deadline = getChallengeDeadline(challenge?.openedAt);
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
        !["http:", "https:", "tcp:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        return [];
      return [
        {
          name: endpoint.container_name || "서비스",
          url: endpoint.service_url,
          isWeb: ["http:", "https:"].includes(url.protocol),
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
