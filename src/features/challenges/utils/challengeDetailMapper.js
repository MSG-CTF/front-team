import { getChallengeDeadline } from "../../../utils/time.js";

function stringIdentifier(value) {
  return value == null ? "" : String(value);
}

export function mapChallengeDetail(data) {
  return {
    title: data.title,
    category: data.category,
    difficulty: data.difficulty,
    points: data.score,
    solves: data.solved_team_count,
    solved: data.is_solved === true,
    // 응답에 없으면 미제공 상태를 유지한다. 풀이 여부로 개방 상태를 추측하지 않는다.
    accessStatus: data.status ?? null,
    openedAt: data.opened_at ?? null,
    description: data.description,
    attachments: Array.isArray(data.files)
      ? data.files.map((file) => ({
        fileId: file.file_id,
        name: file.file_name,
        url: file.download_url,
        sizeLabel: file.file_size == null ? "-" : (file.file_size / 1024 / 1024).toFixed(2),
      }))
      : [],
  };
}

export function getChallengeSubmissionState(challenge, now = Date.now()) {
  const deadline = getChallengeDeadline(challenge?.openedAt);
  const remainingSeconds = deadline == null
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
  return instances.find(
    (instance) => (
      stringIdentifier(instance.challenge_id) === stringIdentifier(challengeId)
    ),
  ) ?? null;
}

export function calculateRemainingSeconds(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  const expiresAtMilliseconds = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMilliseconds)) return null;
  return Math.max(0, Math.floor((expiresAtMilliseconds - now) / 1000));
}

export function mapChallengeInstance(data, now = Date.now()) {
  if (!data) return null;

  return {
    instanceId: data.instance_id,
    challengeId: data.challenge_id,
    status: data.status,
    connectUrl: data.host,
    endpoints: mapInstanceEndpoints(data),
    expiresAt: data.expires_at,
    hardExpiresAt: data.hard_expires_at ?? null,
    remainingSeconds: calculateRemainingSeconds(data.expires_at, now),
    extendsUsed: data.extend_count ?? null,
  };
}

export function mapInstanceEndpoints(data) {
  if (data?.status !== "RUNNING") return [];
  const endpoints = Array.isArray(data.endpoints) ? data.endpoints : [];
  return endpoints.flatMap((endpoint) => {
    try {
      const url = new URL(endpoint.service_url);
      if (!["http:", "https:", "tcp:"].includes(url.protocol) || url.username || url.password) return [];
      return [{
        name: endpoint.container_name || "서비스",
        url: endpoint.service_url,
        isWeb: ["http:", "https:"].includes(url.protocol),
      }];
    } catch {
      return [];
    }
  });
}

export function getRetryDeadline(envelope, now = Date.now()) {
  const seconds = envelope?.data?.retry_after_seconds;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? now + Math.ceil(seconds) * 1000
    : null;
}
