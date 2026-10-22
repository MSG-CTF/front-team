import { formatAdminTime } from "./adminTime.js";
import { isoFromKstInput, kstInputFromIso } from "./adminContestTime.js";

// KoTH 관리: 15분 구간마다 문제 서버가 준 순위를 플랫폼 점수로 바꿔 누적한다
// 환산 규칙은 백엔드 apps/koth/services.py PERIOD_POINTS · _awards 와 같다
export const KOTH_POINTS = [40, 25, 15, 12, 8];
export const KOTH_PERIOD_MINUTES = 15;

export const KOTH_STATUS = {
  SCHEDULED: { label: "공개 예정", tone: "neutral" },
  ACTIVE: { label: "진행 중", tone: "good" },
  CLOSED: { label: "종료", tone: "quiet" },
};
export const KOTH_STATUS_ORDER = ["SCHEDULED", "ACTIVE", "CLOSED"];

export const PERIOD_STATUS = {
  APPLIED: { label: "반영됨", tone: "good" },
  PENDING: { label: "반영 전", tone: "warn" },
  FAILED: { label: "수집 실패", tone: "bad" },
};

export function kothStatus(status) {
  return KOTH_STATUS[status] ?? { label: status || "상태 미수집", tone: "neutral" };
}

export function periodStatus(status) {
  return PERIOD_STATUS[status] ?? { label: status || "상태 미수집", tone: "neutral" };
}

// 공동 순위 팀은 차지한 연속 순위의 배점을 합쳐 팀 수로 나누고 소수점 아래를 버린다
// 예: 공동 1위 두 팀은 (40 + 25) / 2 = 32점씩, 6위 아래는 0점
export function kothAwards(results = []) {
  const groups = new Map();
  for (const row of results) {
    const rank = Number(row?.period_rank);
    if (!Number.isInteger(rank) || rank < 1) continue;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(row);
  }
  const awards = new Map();
  for (const [rank, rows] of groups) {
    let occupied = 0;
    for (let position = rank; position < rank + rows.length; position += 1) occupied += KOTH_POINTS[position - 1] ?? 0;
    const each = Math.floor(occupied / rows.length);
    for (const row of rows) awards.set(row.team_id, each);
  }
  return awards;
}

// 구간 결과 줄: 순위 순서, 공동 순위 표시, 환산 점수는 서버 값이 있으면 그 값을 쓰고 없으면 같은 규칙으로 계산한다
export function periodRows(period) {
  const results = Array.isArray(period?.results) ? period.results : [];
  const computed = kothAwards(results);
  const sizes = new Map();
  for (const row of results) sizes.set(row.period_rank, (sizes.get(row.period_rank) ?? 0) + 1);
  return results.map((row) => ({
    ...row,
    tied: (sizes.get(row.period_rank) ?? 0) > 1,
    awarded: Number.isFinite(row.awarded_score) ? row.awarded_score : computed.get(row.team_id) ?? 0,
  })).sort((a, b) => a.period_rank - b.period_rank || String(a.team_name ?? "").localeCompare(String(b.team_name ?? ""), "ko"));
}

// 틱 번호: 백엔드 틱은 정각 기준 15분 칸(00, 15, 30, 45분)이라 문제를 연 시각이 든 칸을 1틱으로 센다
// 연 시각을 모르면 최신순 목록의 전체 개수로 센다 몇 초 어긋난 시각은 가까운 칸으로 맞춘다
export function tickNumber(periodId, openedAt) {
  const slot = KOTH_PERIOD_MINUTES * 60000;
  const opened = Date.parse(openedAt);
  const at = Date.parse(periodId);
  if (!Number.isFinite(opened) || !Number.isFinite(at)) return null;
  const tick = Math.round((at - Math.floor(opened / slot) * slot) / slot) + 1;
  return tick >= 1 ? tick : null;
}

export function numberTicks(periods = [], { openedAt, totalCount } = {}) {
  return periods.map((period, index) => ({
    ...period,
    tick: tickNumber(period.period_id, openedAt) ?? (Number.isInteger(totalCount) ? totalCount - index : null),
  }));
}

export function tickLabel(tick) {
  return Number.isInteger(tick) ? `${tick}틱` : "틱";
}

// 다시 불러올 수 있는 틱: 수집에 실패했거나 끝났는데 아직 반영되지 않은 틱
export function retryablePeriod(period, now = Date.now()) {
  if (period?.status === "FAILED") return true;
  const end = Date.parse(period?.period_id) + KOTH_PERIOD_MINUTES * 60000;
  return period?.status === "PENDING" && Number.isFinite(end) && end <= now;
}

export function periodRange(periodId) {
  const start = Date.parse(periodId);
  if (!Number.isFinite(start)) return "-";
  const end = new Date(start + KOTH_PERIOD_MINUTES * 60000).toISOString();
  return `${formatAdminTime(periodId, { seconds: false })} ~ ${formatAdminTime(end, { seconds: false }).slice(-5)}`;
}

// 관리자 KoTH API가 아직 없으면 참가자 API GET /koth/clubs (구현 완료)로 목록만 채운다
// 이때는 지문, 구간 기록, 저장소 연결을 알 수 없어 limited로 표시한다
export function kothListFromClubs(data) {
  const clubs = Array.isArray(data?.clubs) ? data.clubs : [];
  return clubs.flatMap((club) => {
    const challenges = Array.isArray(club.challenges) ? club.challenges : club.koth_challenge_id ? [club] : [];
    return challenges.map((challenge) => ({
      koth_challenge_id: challenge.koth_challenge_id, club_id: club.club_id, club_name: club.name, title: challenge.title,
      description: null, status: challenge.status, open_group: challenge.open_group ?? null,
      opened_at: challenge.opened_at ?? null, closed_at: challenge.closed_at ?? null, challenge_url: challenge.challenge_url ?? null,
      current_owner_team_id: challenge.current_owner_team_id ?? null, current_owner_team_name: challenge.current_owner_team_name ?? null,
      current_score: challenge.current_score ?? 0, scored_team_count: null, last_period: null, failed_period_count: null,
      repository: null, limited: true,
    }));
  }).sort(byOpenGroup);
}

export function byOpenGroup(a, b) {
  return (a.open_group ?? 99) - (b.open_group ?? 99) || String(a.title ?? "").localeCompare(String(b.title ?? ""), "ko");
}

export function kothSummary(list = []) {
  const summary = { all: list.length, ACTIVE: 0, SCHEDULED: 0, CLOSED: 0, failing: 0, unlinked: 0 };
  for (const item of list) {
    if (summary[item.status] !== undefined) summary[item.status] += 1;
    if (item.failed_period_count > 0) summary.failing += 1;
    if (!item.limited && !item.repository) summary.unlinked += 1;
  }
  return summary;
}

// 편집 폼: 지문 수정은 제오파디 문제와 같은 방식으로 바뀐 칸만 보낸다
export function kothEditForm(challenge) {
  return {
    title: challenge?.title ?? "", description: challenge?.description ?? "", challenge_url: challenge?.challenge_url ?? "",
    open_group: challenge?.open_group == null ? "" : String(challenge.open_group), status: challenge?.status ?? "SCHEDULED",
    opened_at: kstInputFromIso(challenge?.opened_at), closed_at: kstInputFromIso(challenge?.closed_at),
    score_api_url: challenge?.score_api_url ?? "", score_api_token_env: challenge?.score_api_token_env ?? "", reason: "",
  };
}

const sameMoment = (input, iso) => (isoFromKstInput(input) ?? "") === (isoFromKstInput(kstInputFromIso(iso)) ?? "");

export function buildKothPatch(challenge, form) {
  const body = {};
  const title = form.title.trim();
  if (title !== (challenge?.title ?? "")) body.title = title;
  if ((form.description ?? "") !== (challenge?.description ?? "")) body.description = form.description;
  const url = form.challenge_url.trim();
  if (url !== (challenge?.challenge_url ?? "")) body.challenge_url = url || null;
  if (form.open_group !== "" && Number(form.open_group) !== challenge?.open_group) body.open_group = Number(form.open_group);
  if (form.status !== challenge?.status) body.status = form.status;
  if (form.opened_at !== undefined && !sameMoment(form.opened_at, challenge?.opened_at)) body.opened_at = isoFromKstInput(form.opened_at);
  if (form.closed_at !== undefined && !sameMoment(form.closed_at, challenge?.closed_at)) body.closed_at = isoFromKstInput(form.closed_at);
  if (form.score_api_url !== undefined && form.score_api_url.trim() !== (challenge?.score_api_url ?? "")) body.score_api_url = form.score_api_url.trim();
  if (form.score_api_token_env !== undefined && form.score_api_token_env.trim() !== (challenge?.score_api_token_env ?? "")) body.score_api_token_env = form.score_api_token_env.trim();
  return body;
}

// 백엔드 _request_scores 와 같은 조건: http(s), 호스트 있음, 계정 정보와 # 없음
export function cleanHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password && !url.hash && !value.includes("#");
  } catch {
    return false;
  }
}

export function validateKothEdit(form) {
  const title = form.title.trim();
  if (!title || Array.from(title).length > 100) return "제목은 1~100자로 입력하세요";
  const url = form.challenge_url.trim();
  if (url && !/^https?:\/\/[^\s/]+[^\s]*$/i.test(url)) return "접속 주소는 http 또는 https로 시작하는 전체 주소여야 합니다";
  const group = Number(form.open_group);
  if (form.open_group === "" || !Number.isInteger(group) || group < 1 || group > 12) return "공개 순번은 1~12 사이 정수로 입력하세요";
  if (form.description.length > 100000) return "지문은 100,000자 이하로 입력하세요";
  for (const key of ["opened_at", "closed_at"]) {
    if (form[key] && !isoFromKstInput(form[key])) return "여는 시각과 닫는 시각은 날짜와 시각을 모두 입력하세요";
  }
  if (form.opened_at && form.closed_at && Date.parse(isoFromKstInput(form.closed_at)) <= Date.parse(isoFromKstInput(form.opened_at))) return "닫는 시각은 여는 시각보다 늦어야 합니다";
  const scoreUrl = form.score_api_url?.trim();
  if (scoreUrl && !cleanHttpUrl(scoreUrl)) return "채점 주소는 http 또는 https 주소여야 하고 계정 정보나 # 을 넣을 수 없습니다";
  const tokenEnv = form.score_api_token_env?.trim();
  if (tokenEnv && !/^[A-Z][A-Z0-9_]{0,99}$/.test(tokenEnv)) return "토큰 환경 변수 이름은 영어 대문자, 숫자, _ 로 씁니다";
  const reason = form.reason.trim();
  if (!reason || Array.from(reason).length > 500) return "사유는 1~500자로 입력하세요";
  return "";
}

// 상태를 뒤로 돌리면(종료 → 진행, 진행 → 예정) 확인 문구를 따로 보인다
export function statusGoesBack(from, to) {
  return KOTH_STATUS_ORDER.indexOf(to) < KOTH_STATUS_ORDER.indexOf(from);
}

// 저장소 폴더 추천: 플랫폼 제목과 info.yaml 이름을 글자만 남겨 비교한다
const letters = (value) => String(value ?? "").normalize("NFC").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

export function suggestRepository(challenge, folders = []) {
  const title = letters(challenge?.title);
  if (!title) return null;
  return folders.find((folder) => letters(folder.title) === title || letters(folder.slug.replace(/^koth-/, "")) === title)
    ?? folders.find((folder) => {
      const name = letters(folder.title);
      return name.length >= 3 && (name.includes(title) || title.includes(name));
    })
    ?? null;
}

// ── 참가자 파일: 저장소 prob/for_user 묶음을 주거나 주지 않는다 ──
export const KOTH_FILE_MODES = [
  { key: "REPOSITORY", label: "저장소 파일 주기" },
  { key: "NONE", label: "파일 없음" },
];

// 참가자 묶음에 섞이면 안 되는 파일: 캐시와 메타 파일은 필요 없고, 환경 변수와 플래그 이름 파일은 값이 새는지 확인한다
const FILE_CHECKS = [
  { key: "cache", label: "파이썬 캐시", hint: "참가자에게 필요 없는 파일입니다", test: (path) => /(^|\/)__pycache__\//.test(path) || /\.py[co]$/.test(path) },
  { key: "meta", label: "운영체제 메타 파일", hint: "참가자에게 필요 없는 파일입니다", test: (path) => /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(path) || /(^|\/)__MACOSX\//.test(path) },
  { key: "deps", label: "설치된 의존성", hint: "용량만 커집니다", test: (path) => /(^|\/)(node_modules|\.venv|venv)\//.test(path) },
  { key: "git", label: "Git 내부 파일", hint: "커밋 기록이 그대로 나갑니다", test: (path) => /(^|\/)\.git\//.test(path) },
  { key: "env", label: "환경 변수 파일", hint: "비밀값이 들어 있지 않은지 확인하세요", test: (path) => /(^|\/)\.env(\.[^/]*)?$/.test(path) && !/\.(example|sample|template)$/.test(path) },
  { key: "flag", label: "플래그 이름 파일", hint: "가짜 값인지 확인하세요", test: (path) => /(^|\/)flag(\.[a-z]+)?$/i.test(path) },
];

export function kothFileWarnings(files = []) {
  return FILE_CHECKS.map((check) => ({ ...check, paths: files.map((file) => file.path).filter((path) => check.test(path)) }))
    .filter((check) => check.paths.length > 0)
    .map(({ key, label, hint, paths }) => ({ key, label, hint, paths }));
}

// 맨 위 파일은 그대로, 폴더는 한 줄로 묶어 개수와 크기를 보인다
export function groupKothFiles(files = []) {
  const groups = [];
  const folders = new Map();
  for (const file of files) {
    const slash = file.path.indexOf("/");
    if (slash < 0) { groups.push({ key: file.path, name: file.path, folder: false, files: [file], size: file.size_bytes ?? 0 }); continue; }
    const name = file.path.slice(0, slash);
    if (!folders.has(name)) {
      const group = { key: `${name}/`, name: `${name}/`, folder: true, files: [], size: 0 };
      folders.set(name, group);
      groups.push(group);
    }
    const group = folders.get(name);
    group.files.push({ ...file, name: file.path.slice(slash + 1) });
    group.size += file.size_bytes ?? 0;
  }
  return groups.sort((a, b) => Number(a.folder) - Number(b.folder) || a.name.localeCompare(b.name, "en"));
}

// 저장소 최신화: 플랫폼에 반영한 커밋과 저장소 main 의 그 폴더 최신 커밋을 비교한다
export function repositoryFreshness(repository) {
  if (!repository) return { linked: false, behind: false };
  const source = repository.source_revision ?? null;
  const latest = repository.latest_revision ?? null;
  return {
    linked: true,
    behind: Boolean(source && latest && !latest.startsWith(source) && !source.startsWith(latest)),
    source, latest,
    committedAt: repository.committed_at ?? null,
    syncedAt: repository.synced_at ?? null,
    latestAt: repository.latest_committed_at ?? null,
  };
}
