export function validateAdminAccount({ loginId, password, nickname, role, isLeader, teamMode, teamId }) {
  if (!loginId.trim() || Array.from(loginId.trim()).length > 50) return "아이디는 1~50자로 입력하세요";
  if (Array.from(password).length < 8 || Array.from(password).length > 128) return "비밀번호는 8~128자로 입력하세요";
  if (!nickname.trim() || Array.from(nickname.trim()).length > 50) return "닉네임은 1~50자로 입력하세요";
  if (!["PARTICIPANT", "ADMIN"].includes(role)) return "권한을 선택하세요";
  if (role === "ADMIN" && isLeader) return "관리자는 팀장으로 지정할 수 없습니다";
  if (teamMode === "EXISTING" && !teamId) return "소속 팀을 선택하세요";
  if (!["NONE", "EXISTING"].includes(teamMode)) return "지원하지 않는 팀 등록 방식입니다";
  return "";
}

export const SETTING_RANGES = {
  dice_rolls_per_reset: [1, 20],
  dice_reset_interval_minutes: [1, 1440],
  solve_deadline_minutes: [1, 180],
  max_attempts: [1, 10],
  lock_seconds: [1, 3600],
};

export function validateAdminSettings(form) {
  return Boolean(form) && Object.entries(SETTING_RANGES).every(([key, [min, max]]) =>
    form[key] !== "" && Number.isInteger(Number(form[key])) && Number(form[key]) >= min && Number(form[key]) <= max);
}

export function getAdminRequestError(error, fallbackMessage) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const unavailable = [405, 501].includes(status) || (status === 404 && (!code || code === "NOT_FOUND"));
  return {
    status: unavailable ? "unavailable" : "error",
    error: unavailable ? "현재 서버에서 제공하지 않는 기능입니다"
      : error?.response?.data?.message || error?.message || fallbackMessage,
  };
}

export function createRequestGuard() {
  let controller = null;
  let sequence = 0;
  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const request = ++sequence;
      const requestController = controller;
      return {
        signal: requestController.signal,
        isCurrent: () => request === sequence,
        abort: () => requestController.abort(),
      };
    },
    cancel() { ++sequence; controller?.abort(); },
  };
}

export function summarizeAdminResources(data) {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  const nodes = accounts.flatMap((account) => Array.isArray(account.nodes) ? account.nodes : []);
  if (!nodes.length) return null;
  const mean = (key) => {
    const values = nodes.map((node) => node[key]).filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  };
  return { nodesTotal: nodes.length, nodesHealthy: nodes.filter((node) => node.status === "HEALTHY").length,
    averageCpuUsagePercent: mean("cpu_usage_percent"), averageMemoryUsagePercent: mean("memory_usage_percent") };
}

export const ADMIN_CHALLENGE_CATEGORIES = ["WEB", "PWN", "REV", "CRYPTO", "FORENSIC", "MISC", "WEB3", "OSINT"];

export function validateAdminChallenge(form) {
  if (form.challengeSlug.trim().length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.challengeSlug.trim())) return "식별자는 소문자, 숫자, 하이픈으로 100자 이내로 입력하세요";
  if (!form.title.trim() || Array.from(form.title.trim()).length > 200) return "제목은 1~200자로 입력하세요";
  if (!ADMIN_CHALLENGE_CATEGORIES.includes(form.category) || !["EASY", "MEDIUM", "HARD"].includes(form.difficulty)) return "분야와 난이도를 선택하세요";
  if (!form.flag) return "정답 플래그를 입력하세요";
  const initial = Number(form.initialScore);
  const minimum = Number(form.minimumScore);
  const decay = Number(form.decay);
  if (![form.initialScore, form.minimumScore].every((value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(String(value))) || !Number.isFinite(initial) || !Number.isFinite(minimum) || minimum < 0 || initial < minimum) return "점수는 정수부 10자리, 소수점 2자리 이내의 0 이상 값이며 초기 점수는 최소 점수 이상이어야 합니다";
  if (form.decay === "" || !Number.isSafeInteger(decay) || decay < 1) return "점수 감소 계수는 1 이상의 정수로 입력하세요";
  return "";
}
