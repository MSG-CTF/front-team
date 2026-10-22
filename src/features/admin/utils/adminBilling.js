// 계정별 요금: 무료 크레딧이나 예산을 대회가 끝날 때까지 다 쓸지 미리 본다
// 백엔드가 account.billing 을 주면 그 값을(프론트 요청), 아니면 이 브라우저에 적어 둔 요금 계획을 쓴다
// 예상 사용 = 지금까지 쓴 금액 + 시간당 요금 × 대회 끝까지 남은 시간

export const BILLING_PLANS = [
  { key: "FREE_TRIAL", label: "무료 크레딧" },
  { key: "CREDIT", label: "선불 크레딧" },
  { key: "BUDGET", label: "예산 한도" },
];
export const CURRENCIES = ["USD", "KRW"];
const STORAGE_PREFIX = "msgctf.admin.billing.";

const amount = (value) => {
  const number = Number(value);
  return value === "" || value === null || value === undefined || !Number.isFinite(number) || number < 0 ? null : number;
};

export function normalizeBilling(billing) {
  if (!billing || typeof billing !== "object") return null;
  return {
    plan: BILLING_PLANS.some((plan) => plan.key === billing.plan) ? billing.plan : "CREDIT",
    currency: CURRENCIES.includes(billing.currency) ? billing.currency : "USD",
    credit_total: amount(billing.credit_total),
    spent: amount(billing.spent),
    hourly_cost: amount(billing.hourly_cost),
    observed_at: billing.observed_at ?? null,
    scheduling_enabled: billing.scheduling_enabled !== false,
    source: billing.source ?? "server",
  };
}

// 남은 시간 동안 같은 속도로 쓰면 얼마가 되는지, 언제 크레딧이 바닥나는지
export function billingProjection(billing, { now = Date.now(), endTime } = {}) {
  const plan = normalizeBilling(billing);
  if (!plan || plan.credit_total === null || plan.spent === null) return { status: "unknown" };
  const end = Date.parse(endTime);
  const remainingHours = Number.isFinite(end) ? Math.max(0, (end - now) / 3600000) : null;
  const burn = plan.hourly_cost ?? 0;
  const projected = remainingHours === null ? plan.spent : plan.spent + burn * remainingHours;
  const left = plan.credit_total - projected;
  const usedRatio = plan.credit_total > 0 ? plan.spent / plan.credit_total : 1;
  const projectedRatio = plan.credit_total > 0 ? projected / plan.credit_total : 1;
  const runOutAt = burn > 0 && plan.spent < plan.credit_total ? new Date(now + (plan.credit_total - plan.spent) / burn * 3600000).toISOString() : null;
  const status = left < 0 ? "over" : projectedRatio >= 0.8 ? "low" : "ok";
  return { status, remainingHours, projected, left, usedRatio, projectedRatio, runOutAt, plan };
}

export const BILLING_STATUS = {
  ok: { label: "여유", tone: "good" },
  low: { label: "빠듯함", tone: "warn" },
  over: { label: "대회 전에 소진", tone: "bad" },
  unknown: { label: "요금 계획 없음", tone: "neutral" },
};

export function formatMoney(value, currency = "USD") {
  if (!Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  if (currency === "KRW") return `${sign}${Math.round(Math.abs(value)).toLocaleString("ko-KR")}원`;
  const cents = Math.round(Math.abs(value) * 100);
  const digits = cents % 100 === 0 ? 0 : 2;
  return `${sign}$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function validateBillingForm(form) {
  for (const [key, label] of [["credit_total", "크레딧 총액"], ["spent", "지금까지 쓴 금액"], ["hourly_cost", "시간당 요금"]]) {
    if (amount(form[key]) === null) return `${label}은 0 이상 숫자로 입력하세요`;
  }
  if (Number(form.spent) > Number(form.credit_total) * 10) return "쓴 금액이 크레딧보다 너무 큽니다 단위를 확인하세요";
  return "";
}

// 이 브라우저에만 남기는 요금 계획 (백엔드 반영 전 임시)
export function readLocalBilling(accountId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_PREFIX + accountId);
    return raw ? { ...normalizeBilling(JSON.parse(raw)), source: "local" } : null;
  } catch {
    return null;
  }
}

export function writeLocalBilling(accountId, billing, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_PREFIX + accountId, JSON.stringify({ ...billing, observed_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}
