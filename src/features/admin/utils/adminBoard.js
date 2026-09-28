// 관리자 보드 강제 개입, 이벤트 로그, 리소스 화면 공용 규칙.
// 기준: 백엔드 #81~#85 공유 내용(2026-09-28), README.md 8절.

// 보드 칸은 1번(START)부터 36번까지다. 0번 칸은 존재하지 않는다.
export const BOARD_CELL_MIN = 1;
export const BOARD_CELL_MAX = 36;

export const BOARD_CELL_STATUSES = ["UNVISITED", "CONSUMED", "OPENED", "CLEARED"];

// OPENED/CLEARED로 바꾸려면 그 칸에서 이미 연 문제가 있어야 한다(없으면 400 INVALID_REQUEST).
export const CELL_STATUSES_REQUIRING_OPENED_CHALLENGE = ["OPENED", "CLEARED"];

export function parseBoardCellIndex(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= BOARD_CELL_MIN && parsed <= BOARD_CELL_MAX ? parsed : null;
}

export function validateBoardCellUpdate({ cellIndex, status, reason }) {
  if (parseBoardCellIndex(cellIndex) === null) return `칸 번호는 ${BOARD_CELL_MIN}~${BOARD_CELL_MAX}로 입력하세요`;
  if (!BOARD_CELL_STATUSES.includes(status)) return "칸 상태를 선택하세요";
  if (!reason?.trim() || Array.from(reason.trim()).length > 500) return "사유는 1~500자로 입력하세요";
  return "";
}

export function validateBoardPositionMove({ position, reason }) {
  if (parseBoardCellIndex(position) === null) return `이동할 칸은 ${BOARD_CELL_MIN}~${BOARD_CELL_MAX}로 입력하세요`;
  if (!reason?.trim() || Array.from(reason.trim()).length > 500) return "사유는 1~500자로 입력하세요";
  return "";
}

// GET /admin/events type 11종. 뒤 세 개(DICE_ADJUSTED 이후)가 #81~#85에서 새로 추가됐다.
export const ADMIN_EVENT_TYPES = [
  { value: "TEAM_BANNED", label: "팀 밴" },
  { value: "TEAM_UNBANNED", label: "팀 밴 해제" },
  { value: "MILEAGE_ADJUSTED", label: "마일리지 조정" },
  { value: "PAYMENT_REFUNDED", label: "결제 환불" },
  { value: "INSTANCE_FAILED", label: "인스턴스 실패" },
  { value: "INSTANCE_FORCED", label: "인스턴스 강제 조작" },
  { value: "CHALLENGE_VISIBILITY_CHANGED", label: "문제 공개 전환" },
  { value: "SETTINGS_CHANGED", label: "설정 변경" },
  { value: "DICE_ADJUSTED", label: "주사위 지급/회수" },
  { value: "BOARD_POSITION_MOVED", label: "말 위치 이동" },
  { value: "CELL_STATUS_CHANGED", label: "칸 상태 변경" },
];

// Notion 명세(2026-09-24): 아래 5종은 백엔드 PR 대기 중. 머지 전 필터로 보내면 400이므로
// 필터에서는 따로 묶어 보여주고, 라벨 표시는 미리 해둔다.
export const ADMIN_EVENT_TYPES_PENDING = [
  { value: "TEAM_UPDATED", label: "팀 정보 수정" },
  { value: "TEAM_DELETED", label: "팀 삭제" },
  { value: "ACCOUNT_CREATED", label: "계정 등록" },
  { value: "PAYMENT_PROCESSED", label: "결제 처리" },
  { value: "CHALLENGE_CREATED", label: "문제 등록" },
];

export function getAdminEventTypeLabel(type) {
  return [...ADMIN_EVENT_TYPES, ...ADMIN_EVENT_TYPES_PENDING].find((item) => item.value === type)?.label ?? type ?? "-";
}

// severity는 네 가지만 온다. 명세 초안의 ERROR는 없는 값(CRITICAL로 정정됨).
// 관리자 조작은 INFO/WARNING, 팀 삭제(TEAM_DELETED)만 CRITICAL.
export const ADMIN_EVENT_SEVERITIES = {
  INFO: { label: "정보", tone: "neutral" },
  WARNING: { label: "경고", tone: "warn" },
  CRITICAL: { label: "심각", tone: "bad" },
  MANUAL_REVIEW: { label: "수동 확인", tone: "warn" },
};

export function getAdminEventSeverity(severity) {
  return ADMIN_EVENT_SEVERITIES[severity] ?? { label: severity ?? "-", tone: "neutral" };
}

// 조작 사유가 잘리지 않고 500자를 넘게 들어올 수 있다. 목록에서는 줄여 보여주고 펼칠 수 있게 한다.
export const EVENT_MESSAGE_PREVIEW_LENGTH = 120;

export function isLongEventMessage(message) {
  return Array.from(message ?? "").length > EVENT_MESSAGE_PREVIEW_LENGTH;
}

export function previewEventMessage(message) {
  const chars = Array.from(message ?? "");
  return chars.length > EVENT_MESSAGE_PREVIEW_LENGTH ? `${chars.slice(0, EVENT_MESSAGE_PREVIEW_LENGTH).join("")}…` : chars.join("");
}

// cpu_usage_percent, memory_usage_percent, running_instances가 null이면 "미수집"이다. 0으로 표시하지 않는다.
export function formatCollectedValue(value, suffix = "") {
  return Number.isFinite(value) ? `${value}${suffix}` : "미수집";
}

// accounts[].account_name, instance_quota는 삭제됐다. provider + scope_id로 계정을 식별한다.
export function formatResourceAccountName(account) {
  const parts = [account?.provider, account?.scope_id].filter(Boolean);
  return parts.length ? parts.join(" / ") : account?.account_id ?? "알 수 없는 계정";
}
