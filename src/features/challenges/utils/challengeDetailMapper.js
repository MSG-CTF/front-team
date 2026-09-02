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
    solved: data.is_solved,
    description: data.description,
    attachments: Array.isArray(data.files)
      ? data.files.map((file) => ({
        fileId: file.file_id,
        name: file.file_name,
        url: file.download_url,
        sizeLabel: file.file_size == null ? "—" : String(file.file_size),
      }))
      : [],
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
    expiresAt: data.expires_at,
    remainingSeconds: calculateRemainingSeconds(data.expires_at, now),
    extendsUsed: data.extend_count ?? null,
  };
}
