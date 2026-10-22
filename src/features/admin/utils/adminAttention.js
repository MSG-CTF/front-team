// 대시보드 "실패·지연 인스턴스" 줄의 규칙
// 실패한 인스턴스는 모두, 준비 단계(REQUESTED/SCHEDULING/PROVISIONING)에 STUCK_MINUTES 넘게 머문 인스턴스도 올린다
// 종료 중(STOPPING)은 스케줄러가 정리하는 중이라 올리지 않는다
export const STUCK_MINUTES = 5;
const PENDING = ["REQUESTED", "SCHEDULING", "PROVISIONING"];

// 첫 쪽만 읽으면 실패가 뒤쪽으로 밀려 덜 세므로 상태마다 따로 묻는다
// 실패는 total_count로 세고 줄은 최근 20개만 받는다 준비 단계는 상태마다 서버 상한인 100개를 받아 오래 머문 것을 고른다
// 실패를 먼저 묻는다 같은 인스턴스가 두 상태로 겹쳐 오면 먼저 받은 실패 쪽을 남긴다
export const ATTENTION_QUERIES = [{ status: "FAILED", size: 20 }, ...PENDING.map((status) => ({ status, size: 100 }))];

const ERROR_LABELS = {
  RUNTIME_CREATE_FAILED: "컨테이너 생성 실패",
  RESOURCE_UNAVAILABLE: "가용 노드 부족",
  BROKER_CALL_FAILED: "리소스 브로커 응답 없음",
  IMAGE_PULL_FAILED: "이미지 받기 실패",
};

export function formatAge(createdAt, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 경과`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분 경과`;
}

export function describeAttention(instance, now = Date.now()) {
  if (instance.status === "FAILED") {
    return { kind: "failed", label: ERROR_LABELS[instance.error_code] ?? (instance.error_code || "실패"), age: formatAge(instance.created_at, now) };
  }
  return { kind: "stuck", label: `${instance.status} 상태에 머묾`, age: formatAge(instance.created_at, now) };
}

// 오래된 것부터 보이도록 생성 시각 순으로 정렬한다
export function selectAttentionInstances(instances, now = Date.now()) {
  const rows = Array.isArray(instances) ? instances : [];
  return rows.filter((instance) => {
    if (instance.status === "FAILED") return true;
    if (!PENDING.includes(instance.status)) return false;
    const timestamp = Date.parse(instance.created_at);
    return Number.isFinite(timestamp) && now - timestamp >= STUCK_MINUTES * 60000;
  }).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

// 상태별로 받은 쪽 [{ status, instances, total_count }]을 합쳐 위젯 줄과 건수를 만든다
// 서버가 상태 조건을 무시해 다른 상태가 섞여 오면 total_count를 믿지 않고 받은 줄만 센다
// 받지 못한 줄이 남아 건수가 모자랄 수 있으면 partial로 알린다
export function summarizeAttention(pages, now = Date.now()) {
  const seen = new Set();
  const rows = [];
  let failed = 0;
  let partial = false;
  for (const page of Array.isArray(pages) ? pages : []) {
    const list = Array.isArray(page?.instances) ? page.instances : [];
    const matching = list.filter((instance) => instance?.status === page.status);
    const filtered = matching.length === list.length;
    const complete = !Number.isFinite(page.total_count) || list.length >= page.total_count;
    for (const instance of matching) {
      if (instance.instance_id != null) {
        if (seen.has(instance.instance_id)) continue;
        seen.add(instance.instance_id);
      }
      rows.push(instance);
    }
    if (page.status === "FAILED") failed += filtered && Number.isFinite(page.total_count) ? Math.max(page.total_count, matching.length) : matching.length;
    if (!complete && (page.status !== "FAILED" || !filtered)) partial = true;
  }
  const selected = selectAttentionInstances(rows, now);
  return { rows: selected, count: failed + selected.filter((instance) => instance.status !== "FAILED").length, partial };
}

// 재시작은 실행 중인 인스턴스만 받으므로(409 INSTANCE_NOT_RESTARTABLE) 여기서는 종료만 바로 할 수 있다
export function canForceStop(instance) {
  return !["STOPPED", "STOPPING", "FAILED", "EXPIRED", "CLEANED"].includes(instance.status);
}
