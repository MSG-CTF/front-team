// 대회 시각 편집: 화면에는 한국 시각(datetime-local)으로 보이고 서버에는 UTC ISO로 보낸다
// PATCH /admin/settings 의 contest { started_at, ends_at } (백엔드 구현 완료) 규칙을 그대로 따른다
// 시작한 대회의 시작 시각은 바꿀 수 없고, 종료는 시작보다 늦어야 한다

const KST_OFFSET = "+09:00";
const kstParts = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function kstInputFromIso(iso) {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? kstParts.format(time).replace(" ", "T") : "";
}

export function isoFromKstInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value ?? ""))) return null;
  const date = new Date(`${value}:00${KST_OFFSET}`);
  if (!Number.isFinite(date.getTime()) || kstInputFromIso(date.toISOString()) !== value) return null;
  return date.toISOString().replace(".000Z", "Z");
}

export function shiftKstInput(value, minutes) {
  const iso = isoFromKstInput(value);
  return iso ? kstInputFromIso(new Date(Date.parse(iso) + minutes * 60000).toISOString()) : value;
}

export function contestStarted(contest, now = Date.now()) {
  const start = Date.parse(contest?.started_at);
  return ["RUNNING", "ENDED"].includes(String(contest?.status ?? "").toUpperCase()) || (Number.isFinite(start) && start <= now);
}

// 화면 값에서 바뀐 항목만 골라 보낼 몸통을 만든다 문제가 있으면 error를 돌려준다
// 시작한 대회의 시작 시각은 allowStarted 일 때만 바꾸고, 그때는 force 를 함께 보낸다 (백엔드 요청 사항)
export function buildContestPatch(contest, form, now = Date.now(), { allowStarted = false } = {}) {
  const startIso = isoFromKstInput(form.start);
  const endIso = isoFromKstInput(form.end);
  if (!startIso || !endIso) return { error: "날짜와 시각을 모두 입력해주세요" };
  if (Date.parse(endIso) <= Date.parse(startIso)) return { error: "종료는 시작보다 늦어야 합니다" };
  const body = {};
  if (startIso !== isoFromKstInput(kstInputFromIso(contest?.started_at))) {
    if (contestStarted(contest, now)) {
      if (!allowStarted) return { error: "이미 시작한 대회는 시작 시각을 바꿀 수 없습니다" };
      body.force = true;
    }
    body.started_at = startIso;
  }
  if (endIso !== isoFromKstInput(kstInputFromIso(contest?.ends_at))) body.ends_at = endIso;
  return { body, changed: Object.keys(body).some((key) => key !== "force"), startedChange: Boolean(body.force) };
}

export function describeDuration(startValue, endValue) {
  const start = Date.parse(isoFromKstInput(startValue) ?? "");
  const end = Date.parse(isoFromKstInput(endValue) ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "";
  const minutes = Math.round((end - start) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours && `${hours}시간`, rest && `${rest}분`].filter(Boolean).join(" ");
}
