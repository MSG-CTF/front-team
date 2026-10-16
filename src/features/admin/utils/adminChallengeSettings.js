export function challengeDetailsDraft(challenge) {
  return { title: challenge.title ?? "", description: challenge.description ?? "",
    category: challenge.category, difficulty: challenge.difficulty };
}

export function challengeDetailsChanges(challenge, draft) {
  const original = challengeDetailsDraft(challenge);
  const next = { ...draft, title: draft.title.trim() };
  return Object.fromEntries(Object.keys(original).filter((key) => original[key] !== next[key]).map((key) => [key, next[key]]));
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FILE_KINDS = { participant: "배포용 파일", configuration: "설정 파일", source: "문제 소스" };
export const FLAG_BINDING_STATES = { match: "채점 값과 일치", mismatch: "채점 값과 다름", missing: "비밀값 없음", unavailable: "값 확인 실패" };
