export function mergePublications(current, incoming) {
  const rows = new Map(current.map((item) => [`${item.challenge_slug}:${item.run_id}`, item]));
  for (const item of incoming) {
    const key = `${item.challenge_slug}:${item.run_id}`;
    const previous = rows.get(key);
    rows.set(key, { ...previous, ...item,
      has_release_artifact: Boolean(previous?.has_release_artifact || item.has_release_artifact),
      has_files_artifact: Boolean(previous?.has_files_artifact || item.has_files_artifact),
    });
  }
  return [...rows.values()];
}

export function latestPublications(rows) {
  const latest = new Map();
  for (const row of rows) {
    const previous = latest.get(row.challenge_slug);
    if (!previous || Number(row.run_id) > Number(previous.run_id)) latest.set(row.challenge_slug, row);
  }
  return [...latest.values()].sort((a, b) => Number(b.run_id) - Number(a.run_id));
}

export function publicationAttempt(previous, body, newKey) {
  if (previous?.body.preview_token === body.preview_token && previous.body.difficulty === body.difficulty
    && Boolean(previous.body.update_metadata) === Boolean(body.update_metadata)) return previous;
  return { body, key: newKey() };
}

export function publicationFileLabel(files) {
  if (files.status === "none") return "첨부파일 없음";
  if (files.status !== "available") return "파일 발행 대기";
  const size = files.size_bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(files.size_bytes / 1024))} KB`
    : `${(files.size_bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `ZIP 1개 · 파일 ${files.file_count}개 · ${size}`;
}
