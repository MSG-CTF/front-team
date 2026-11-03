// 실행 이미지 없이 파일만 주는 문제는 배포 버전이 없어서 문제 단위로 참가자 ZIP을 고정한다

// 배포 버전도 실행 설정도 없는 문제만 고정할 수 있다 no_release 는 실행 설정만 있고 버전을 안 고른 상태다
export function isStaticFileChoice(data) {
  return Boolean(data && !data.release_id && data.status !== "no_release");
}

// 감사 로그와 같은 말로 지금 주는 파일을 적는다
export function describeStaticFile(file, pinned) {
  if (!file) return "없음";
  return pinned ? `발행 #${file.registry_revision} 고정` : `최신 자동 발행 #${file.registry_revision}`;
}

// 고정해 둔 사이 더 높은 발행번호가 수집됐으면 그 기록
export function newerCollectedFile(data) {
  if (data?.mode !== "SELECTED" || !data.current_file || !data.latest_file) return null;
  return data.latest_file.registry_revision > data.current_file.registry_revision ? data.latest_file : null;
}

// GitHub 최근 발행 목록에서 이 문제의 첨부파일 발행본 중 아직 수집되지 않은 가장 새 것
// 같은 커밋이 이미 수집됐거나 마지막 수집보다 먼저 발행된 것은 수집된 것으로 본다
export function uncollectedPublication(items, slug, data) {
  if (!slug || !Array.isArray(items)) return null;
  const newest = items
    .filter((item) => item.challenge_slug === slug && item.has_files_artifact && !["failed", "running"].includes(item.workflow_state))
    .sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")))[0];
  if (!newest) return null;
  const collected = [data?.current_file, data?.latest_file, ...(data?.history ?? [])].filter(Boolean);
  if (collected.some((file) => file.source_sha === newest.source_sha)) return null;
  const latest = data?.latest_file;
  if (latest && Date.parse(newest.published_at) <= Date.parse(latest.created_at)) return null;
  return newest;
}
