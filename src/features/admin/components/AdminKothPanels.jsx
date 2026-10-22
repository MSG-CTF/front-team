import { useMemo, useState } from "react";
import {
  getAdminKothPeriods, getAdminKothRepository, linkAdminKothRepository, retryAdminKothPeriod, testAdminKothConnection, updateAdminKothChallenge,
} from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import useAdminResource from "../hooks/useAdminResource.js";
import {
  KOTH_POINTS, KOTH_STATUS, KOTH_STATUS_ORDER, buildKothPatch, kothEditForm, numberTicks, periodRange, periodRows, periodStatus,
  repositoryFreshness, retryablePeriod, statusGoesBack, suggestRepository, tickLabel, validateKothEdit,
} from "../utils/adminKoth.js";
import { shiftKstInput } from "../utils/adminContestTime.js";
import { KothFileSummary } from "./AdminKothFilesPanel.jsx";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import { AdminReasonField, AdminSegmented } from "./AdminFormParts.jsx";
import pickerStyles from "./AdminPicker.module.css";
import ui from "./AdminWorkspace.module.css";
import styles from "../pages/AdminKoth.module.css";

const PERIOD_PAGE = 100;

// 틱 기록은 최신 틱부터 100개씩 온다 이전 틱은 다음 쪽을 받아 뒤에 붙이고, 쪽 사이에 새 틱이 끼어 겹친 기록은 하나만 남긴다
async function loadPeriodPages(challengeId, pages, config) {
  const responses = await Promise.all(Array.from({ length: pages }, (_, index) =>
    getAdminKothPeriods(challengeId, { page: index + 1, size: PERIOD_PAGE }, config)));
  const failed = responses.find((response) => !isSuccess(response.data));
  if (failed) return failed;
  const seen = new Map();
  for (const response of responses) for (const period of response.data.data.periods ?? []) if (!seen.has(period.period_id)) seen.set(period.period_id, period);
  return { data: { code: "SUCCESS", data: { periods: [...seen.values()], total_count: responses[0].data.data.total_count } } };
}
const EDIT_REASONS = ["지문 오타 수정", "접속 주소 변경", "공개 일정 조정", "저장소 지문 반영"];
const LINK_REASONS = ["출제 저장소 연결", "저장소 최신 커밋 반영", "폴더 이름 변경 반영"];

// 점수 환산 규칙 카드: 백엔드 PERIOD_POINTS 와 같은 표
export function KothScoringRule() {
  return <section className={styles.rule} aria-label="KoTH 점수 환산">
    <div className={styles.ruleHead}>
      <strong>점수 환산</strong>
      <span>한 틱은 15분이고, 틱마다 문제 서버가 준 순위를 플랫폼 점수로 바꿔 쌓습니다</span>
    </div>
    <ol className={styles.points}>
      {KOTH_POINTS.map((points, index) => <li key={points}><span>{index + 1}위</span><strong>{points}</strong></li>)}
      <li><span>6위부터</span><strong>0</strong></li>
    </ol>
    <p className={styles.ruleNote}>공동 순위는 차지한 순위의 점수를 합쳐 팀 수로 나누고 소수점은 버립니다 · 공동 1위 두 팀은 (40 + 25) ÷ 2 = 32점씩</p>
  </section>;
}

// 틱 기록: 위에는 1틱부터 마지막 틱까지 상태 색으로 칠한 번호 칸, 아래에는 고른 틱의 순위와 환산 점수
// 반영되지 못한 틱은 문제 서버에서 다시 불러온다 하나씩 또는 실패한 틱을 한 번에
export function KothPeriodsPanel({ challengeId, openedAt, limited, onRetried }) {
  const [pages, setPages] = useState(1);
  const periods = useAdminResource((config) => loadPeriodPages(challengeId, pages, config), [challengeId, pages], "틱 기록을 불러오지 못했습니다");
  const total = periods.data?.total_count;
  const ticks = useMemo(() => numberTicks(periods.data?.periods ?? [], { openedAt, totalCount: total }), [periods.data, openedAt, total]);
  const ordered = useMemo(() => [...ticks].reverse(), [ticks]);
  const [selectedId, setSelectedId] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [notice, setNotice] = useState(null);
  const fallback = ticks.find((period) => period.status === "APPLIED") ?? ticks[0];
  const selected = ticks.find((period) => period.period_id === selectedId) ?? fallback;
  const rows = useMemo(() => periodRows(selected), [selected]);
  const counts = useMemo(() => ticks.reduce((sum, tick) => ({ ...sum, [tick.status]: (sum[tick.status] ?? 0) + 1 }), {}), [ticks]);
  const retryable = ticks.filter((tick) => retryablePeriod(tick));
  const failed = ticks.filter((tick) => tick.status === "FAILED");

  async function retry(targets) {
    if (retrying || targets.length === 0) return;
    setNotice(null);
    let applied = 0;
    const errors = [];
    for (const [index, target] of targets.entries()) {
      setRetrying({ done: index, total: targets.length });
      try {
        const response = await retryAdminKothPeriod(challengeId, target.period_id);
        if (!isSuccess(response.data)) throw new Error(response.data?.message || "다시 불러오지 못했습니다");
        if (response.data.data?.status === "APPLIED") applied += 1;
        else errors.push(`${tickLabel(target.tick)} ${response.data.data?.last_error || "아직 반영되지 않았습니다"}`);
      } catch (failure) {
        errors.push(`${tickLabel(target.tick)} ${failure?.response?.data?.message || failure?.message || "다시 불러오지 못했습니다"}`);
      }
    }
    setRetrying(null);
    setNotice(errors.length ? { tone: "bad", text: `${applied}개 반영 · ${errors.join(" · ")}` } : { tone: "good", text: `${applied}개 틱을 다시 불러와 반영했습니다` });
    await Promise.all([periods.reload(), onRetried?.()]);
  }

  if (limited || periods.status === "unavailable") {
    return <p className={ui.quietNote}>틱 기록은 관리자 KoTH API(GET /admin/koth/challenges/&#123;id&#125;/periods)가 백엔드에 반영되면 보입니다</p>;
  }
  return <div className={styles.periods}>
    <AdminStatusMessage status={periods.status} error={periods.error} onRetry={periods.retry} hasData={Boolean(periods.data)} />
    {periods.data && ticks.length === 0 && <p className={ui.quietNote}>아직 채점한 틱이 없습니다 문제가 진행 중이 되면 15분마다 한 틱씩 쌓입니다</p>}
    {ticks.length > 0 && <>
      <div className={styles.tickHead}>
        <p className={styles.tickSummary}>
          <strong>{tickLabel(ordered.at(-1)?.tick)}까지</strong>
          <span><i data-tone="good" aria-hidden="true" />반영 {counts.APPLIED ?? 0}</span>
          <span><i data-tone="bad" aria-hidden="true" />실패 {counts.FAILED ?? 0}</span>
          <span><i data-tone="warn" aria-hidden="true" />반영 전 {counts.PENDING ?? 0}</span>
        </p>
        {failed.length > 0 && <button type="button" className={ui.button} disabled={Boolean(retrying)} onClick={() => retry(failed)}>
          {retrying ? `불러오는 중 ${retrying.done + 1}/${retrying.total}` : `실패한 틱 ${failed.length}개 다시 불러오기`}</button>}
      </div>
      {notice && <p role="status" className={ui.callout} data-tone={notice.tone}>{notice.text}</p>}
      <div className={styles.tickStrip} role="listbox" aria-label="틱">
        {(periods.data?.total_count ?? 0) > ticks.length && <button type="button" className={styles.tickMore} disabled={periods.status === "loading"}
          onClick={() => setPages((value) => value + 1)}>이전 틱</button>}
        {ordered.map((tick) => {
          const status = periodStatus(tick.status);
          const top = periodRows(tick)[0];
          return <button key={tick.period_id} type="button" role="option" aria-selected={selected?.period_id === tick.period_id}
            className={styles.tick} data-tone={status.tone} onClick={() => setSelectedId(tick.period_id)}
            title={[tickLabel(tick.tick), periodRange(tick.period_id), status.label, top && `1위 ${top.team_name}`].filter(Boolean).join(" · ")}>
            {tick.tick ?? "-"}
          </button>;
        })}
      </div>
      {selected && <div className={styles.periodDetail}>
        <div className={styles.periodHead}>
          <h3>{tickLabel(selected.tick)}</h3>
          <span className={styles.periodClock}>{periodRange(selected.period_id)}</span>
          <AdminBadge tone={periodStatus(selected.status).tone}>{periodStatus(selected.status).label}</AdminBadge>
          <span className={styles.periodWhen}>{selected.applied_at ? `반영 ${formatAdminTime(selected.applied_at)}` : selected.attempts ? `시도 ${selected.attempts}회` : ""}</span>
          {retryablePeriod(selected) && <button type="button" className={`${ui.button} ${ui.small}`} disabled={Boolean(retrying)} onClick={() => retry([selected])}>
            {retrying ? "불러오는 중" : "다시 불러오기"}</button>}
        </div>
        {selected.status === "FAILED" && <div className={ui.callout} data-tone="bad">
          <strong>문제 서버에서 순위를 받지 못했습니다</strong>
          <span className={styles.errorLine}>{selected.last_error || "오류 내용이 없습니다"} · 시도 {selected.attempts ?? 0}회 · 문제 서버가 이 틱 기록을 갖고 있으면 다시 불러와 반영할 수 있습니다</span>
        </div>}
        {selected.status === "PENDING" && <p className={ui.quietNote}>{retryablePeriod(selected) ? "틱은 끝났지만 아직 반영되지 않았습니다 다시 불러오기로 바로 반영할 수 있습니다" : "틱이 끝나면 문제 서버에서 순위를 받아 환산합니다"}</p>}
        {rows.length > 0 && <div className={`${ui.tableWrap} ${styles.periodTable}`}>
          <table className={ui.table} aria-label={`${tickLabel(selected.tick)} 결과`}>
            <thead><tr><th>순위</th><th>팀</th><th className={ui.num}>문제 점수</th><th className={ui.num}>환산 점수</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.team_id}>
              <td className={styles.rank}>{row.tied ? `공동 ${row.period_rank}` : row.period_rank}</td>
              <td><span className={ui.title}>{row.team_name ?? row.team_id}</span></td>
              <td className={ui.num}>{formatAdminNumber(row.metric_score)}</td>
              <td className={`${ui.num} ${row.awarded > 0 ? ui.amountPlus : ui.muted}`}>{row.awarded > 0 ? `+${formatAdminNumber(row.awarded)}` : "0"}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {selected.status === "APPLIED" && rows.length === 0 && <p className={ui.quietNote}>이 틱에는 순위에 든 팀이 없습니다</p>}
      </div>}
    </>}
  </div>;
}

// 누적 순위: 문제 하나 안의 팀별 누적 KoTH 점수 (GET /koth/leaderboard 구현 완료)
export function KothLeaderboardPanel({ leaderboard }) {
  const rows = leaderboard.data?.leaderboard ?? [];
  return <div className={styles.leaderboard}>
    <KothScoringRule />
    <AdminStatusMessage status={leaderboard.status} error={leaderboard.error} onRetry={leaderboard.retry} hasData={Boolean(leaderboard.data)} />
    {leaderboard.data && <div className={ui.tableWrap}>
      <table className={ui.table} aria-label="누적 순위">
        <thead><tr><th>순위</th><th>팀</th><th className={ui.num}>누적 점수</th><th>첫 득점 (KST)</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.team_id}>
            <td className={styles.rank}>{row.rank}</td>
            <td><span className={ui.title}>{row.team_name ?? row.team_id}</span></td>
            <td className={ui.num}><strong>{formatAdminNumber(row.earned_score)}</strong></td>
            <td className={ui.time}>{formatAdminTime(row.solved_at)}</td>
          </tr>)}
          {rows.length === 0 && <tr className={ui.emptyRow}><td colSpan={4} className={ui.empty}>아직 점수를 얻은 팀이 없습니다</td></tr>}
        </tbody>
      </table>
    </div>}
  </div>;
}

const STATUS_ITEMS = KOTH_STATUS_ORDER.map((key) => ({ key, label: KOTH_STATUS[key].label }));
const FIELD_LABELS = {
  title: "제목", description: "지문", challenge_url: "접속 주소", open_group: "공개 순번", status: "상태",
  opened_at: "여는 시각", closed_at: "닫는 시각", score_api_url: "채점 주소", score_api_token_env: "토큰 이름",
};

// 연결 확인: 서버가 접속 주소와 채점 주소를 대신 불러 응답 코드와 걸린 시간을 알려 준다 저장하지 않는다
function ConnectionResult({ label, result }) {
  if (!result) return null;
  const ok = result.ok === true;
  const facts = [result.status ? `응답 ${result.status}` : null, Number.isFinite(result.latency_ms) ? `${result.latency_ms}ms` : null,
    Number.isInteger(result.result_count) ? `${result.result_count}팀 결과` : null].filter(Boolean).join(" · ");
  return <div className={styles.checkRow} data-ok={ok || undefined}>
    <span className={styles.checkDot} aria-hidden="true" />
    <strong>{label}</strong>
    <span>{ok ? facts || "정상" : result.skipped ? "주소가 없어 건너뜀" : result.error || "응답이 없습니다"}</span>
  </div>;
}

// 문제 정보 편집: 제오파디 문제 설정처럼 바뀐 칸만 보내고 사유를 남긴다
// 탭 위 오른쪽 한 줄: GitHub 에서 어느 커밋을 언제 반영했는지, main 에 새 커밋이 있는지
export function KothSourceLine({ challenge, onOpenRepository }) {
  const fresh = repositoryFreshness(challenge.repository);
  if (!fresh.linked || !fresh.source) return null;
  return <p className={styles.sourceLine}>
    <span>GitHub 반영 <strong className={ui.mono}>{fresh.source}</strong>{fresh.syncedAt ? ` · ${formatAdminTime(fresh.syncedAt, { seconds: false })}` : ""}</span>
    {fresh.behind && <button type="button" className={styles.sourceNew} onClick={onOpenRepository}
      title={fresh.latestAt ? `${formatAdminTime(fresh.latestAt, { seconds: false })} 커밋` : undefined}>새 커밋 {fresh.latest}</button>}
  </p>;
}

export function KothEditorPanel({ challenge, limited, draft, onDraftUsed, onSaved, onOpenFiles }) {
  const [form, setForm] = useState(() => ({ ...kothEditForm(challenge), ...(draft ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [preview, setPreview] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null);
  const body = buildKothPatch(challenge, form);
  const changed = Object.keys(body);
  const invalid = validateKothEdit(form);
  const back = statusGoesBack(challenge.status, form.status);
  const edit = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSaved(""); setError(""); };

  async function checkConnection() {
    if (checking || limited) return;
    setChecking(true);
    setCheck(null);
    try {
      const response = await testAdminKothConnection(challenge.koth_challenge_id, {
        challengeUrl: form.challenge_url.trim(), scoreApiUrl: form.score_api_url.trim(), scoreApiTokenEnv: form.score_api_token_env.trim(),
      });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "연결을 확인하지 못했습니다");
      setCheck(response.data.data);
    } catch (failure) {
      setCheck({ error: failure?.response?.data?.message || failure?.message || "연결을 확인하지 못했습니다" });
    } finally {
      setChecking(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || limited || invalid || changed.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const response = await updateAdminKothChallenge(challenge.koth_challenge_id, { ...body, reason: form.reason.trim() });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "저장하지 못했습니다");
      setSaved(`${changed.map((key) => FIELD_LABELS[key]).join(" · ")} 저장했습니다`);
      setForm((current) => ({ ...current, reason: "" }));
      onDraftUsed?.();
      await onSaved(response.data.data);
    } catch (failure) {
      setError(failure?.response?.data?.message || failure?.message || "저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={save} className={styles.editor}>
    {limited && <p className={ui.callout}>지문 수정은 관리자 KoTH API(PATCH /admin/koth/challenges/&#123;id&#125;)가 백엔드에 반영되면 열립니다</p>}
    {draft && <p className={ui.callout} data-tone="good">저장소 info.yaml 내용을 불러왔습니다 확인한 뒤 저장해주세요</p>}
    <fieldset disabled={busy || limited} className={styles.editorFields}>
      <div className={styles.editorTop}>
        <label className={ui.field}><span className={ui.fieldLabel}>제목</span>
          <input className={ui.input} value={form.title} maxLength={100} onChange={(event) => edit("title", event.target.value)} /></label>
        <label className={ui.field}><span className={ui.fieldLabel}>공개 순번 <small>1~12</small></span>
          <input className={ui.input} inputMode="numeric" value={form.open_group} onChange={(event) => edit("open_group", event.target.value.replace(/[^0-9]/g, "").slice(0, 2))} /></label>
        <div className={ui.field}><span className={ui.fieldLabel}>상태</span>
          <AdminSegmented items={STATUS_ITEMS} value={form.status} onChange={(value) => edit("status", value)} label="KoTH 상태" disabled={busy || limited} /></div>
      </div>
      {back && <p className={ui.callout} data-tone="bad">{form.status === "ACTIVE" ? "종료한 문제를 다시 엽니다 다음 구간부터 채점이 다시 쌓입니다" : "진행 중인 문제를 공개 예정으로 되돌립니다 참가자 접속이 막히고 채점이 멈춥니다"}</p>}
      <div className={styles.scheduleRow}>
        <div className={ui.field}>
          <label htmlFor="koth-opened" className={ui.fieldLabel}>여는 시각 <small>KST</small></label>
          <input id="koth-opened" type="datetime-local" className={ui.input} value={form.opened_at} onChange={(event) => edit("opened_at", event.target.value)} />
        </div>
        <div className={ui.field}>
          <label htmlFor="koth-closed" className={ui.fieldLabel}>닫는 시각 <small>KST</small></label>
          <input id="koth-closed" type="datetime-local" className={ui.input} value={form.closed_at} onChange={(event) => edit("closed_at", event.target.value)} />
        </div>
        <div className={pickerStyles.chips} role="group" aria-label="닫는 시각 빠른 선택">
          {[2, 4].map((hours) => <button key={hours} type="button" className={pickerStyles.chip} disabled={busy || limited || !form.opened_at}
            onClick={() => edit("closed_at", shiftKstInput(form.opened_at, hours * 60))}>여는 시각부터 {hours}시간</button>)}
        </div>
      </div>
      <section className={styles.connection} aria-label="문제 서버 연결">
        <div className={styles.connectionFields}>
          <label className={ui.field}><span className={ui.fieldLabel}>참가자 접속 주소 <small>진행 중일 때만 참가자에게 보입니다</small></span>
            <input className={`${ui.input} ${ui.inputMono}`} value={form.challenge_url} placeholder="https://koth-example.msgctf.kr" onChange={(event) => edit("challenge_url", event.target.value)} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>채점 주소 <small>플랫폼만 부릅니다</small></span>
            <input className={`${ui.input} ${ui.inputMono}`} value={form.score_api_url} placeholder="http://koth-example:9090/internal/koth/scores" onChange={(event) => edit("score_api_url", event.target.value)} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>채점 토큰 환경 변수 <small>값이 아닌 이름</small></span>
            <input className={`${ui.input} ${ui.inputMono}`} value={form.score_api_token_env} placeholder="KOTH_EXAMPLE_TOKEN" onChange={(event) => edit("score_api_token_env", event.target.value.toUpperCase())} /></label>
        </div>
        <div className={styles.connectionCheck}>
          <button type="button" className={ui.button} disabled={checking || limited || (!form.challenge_url.trim() && !form.score_api_url.trim())} onClick={checkConnection}>
            {checking ? "확인 중" : "연결 확인"}</button>
          {check?.error && <p role="alert" className={ui.errorText}>{check.error}</p>}
          {check && !check.error && <div className={styles.checkList} role="status">
            <ConnectionResult label="참가자 접속" result={check.challenge} />
            <ConnectionResult label="채점 API" result={check.score_api} />
            {check.checked_at && <span className={styles.checkTime}>{formatAdminTime(check.checked_at)} 확인 · 저장 전 값으로 불렀습니다</span>}
          </div>}
        </div>
      </section>
      <div className={ui.field}>
        <div className={styles.descriptionHead}>
          <label htmlFor="koth-description" className={ui.fieldLabel}>지문 <small>{formatAdminNumber(form.description.length)}자</small></label>
          <AdminSegmented items={[{ key: "write", label: "쓰기" }, { key: "preview", label: "미리보기" }]} value={preview ? "preview" : "write"}
            onChange={(value) => setPreview(value === "preview")} label="지문 보기 방식" />
        </div>
        {preview
          ? <div className={styles.descriptionPreview} aria-label="지문 미리보기">{form.description || "지문이 비어 있습니다"}</div>
          : <textarea id="koth-description" className={`${ui.textarea} ${styles.description}`} rows={9} value={form.description} onChange={(event) => edit("description", event.target.value)} />}
      </div>
      <KothFileSummary challenge={challenge} limited={limited} onOpenFiles={onOpenFiles} />
      <AdminReasonField label="사유" note="운영 기록에 남습니다" value={form.reason} onChange={(value) => edit("reason", value)} presets={EDIT_REASONS} disabled={busy || limited} required />
    </fieldset>
    <div className={styles.editorFooter}>
      <p className={styles.changed} role={error ? "alert" : "status"} data-tone={error ? "bad" : saved ? "good" : undefined}>
        {error || saved || (changed.length ? `${changed.map((key) => FIELD_LABELS[key]).join(" · ")} 바뀜`
          : challenge.updated_at ? `마지막 저장 ${formatAdminTime(challenge.updated_at, { seconds: false })}${challenge.updated_by ? ` · ${challenge.updated_by}` : ""}` : "바뀐 내용이 없습니다")}
      </p>
      {changed.length > 0 && <button type="button" className={ui.button} disabled={busy} onClick={() => { setForm(kothEditForm(challenge)); onDraftUsed?.(); }}>되돌리기</button>}
      <button type="submit" className={ui.primary} disabled={busy || limited || changed.length === 0 || Boolean(invalid)} title={changed.length ? invalid : undefined}>{busy ? "저장 중" : "저장"}</button>
    </div>
  </form>;
}

// 저장소 연결: MSG-CTF/2026_MSG_CTF 의 koth-* 폴더와 플랫폼 문제를 잇고, 원하면 info.yaml 제목과 지문을 가져온다
export function KothRepositoryPanel({ challenge, limited, onLinked, onUseDraft }) {
  const repository = useAdminResource(getAdminKothRepository, [], "저장소 폴더를 불러오지 못했습니다");
  const folders = useMemo(() => repository.data?.challenges ?? [], [repository.data]);
  const linked = folders.find((folder) => folder.slug === challenge.repository?.slug);
  const suggestion = useMemo(() => suggestRepository(challenge, folders.filter((folder) => !folder.linked_koth_challenge_id || folder.linked_koth_challenge_id === challenge.koth_challenge_id)), [challenge, folders]);
  const [choosing, setChoosing] = useState(false);
  const [slug, setSlug] = useState("");
  const [apply, setApply] = useState({ title: false, description: true });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const picking = choosing || !challenge.repository;
  const chosen = slug || suggestion?.slug || "";
  const fresh = repositoryFreshness(challenge.repository);
  const resync = Boolean(challenge.repository && chosen === challenge.repository.slug);

  async function link() {
    if (busy || !chosen || !reason.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await linkAdminKothRepository(challenge.koth_challenge_id, { slug: chosen, apply: Object.keys(apply).filter((key) => apply[key]), reason: reason.trim() });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "연결하지 못했습니다");
      setChoosing(false);
      setReason("");
      await Promise.all([onLinked(response.data.data), repository.reload()]);
    } catch (failure) {
      setError(failure?.response?.data?.message || failure?.message || "연결하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (limited || repository.status === "unavailable") {
    return <p className={ui.quietNote}>저장소 연결은 관리자 KoTH API(GET /admin/koth/repository)가 백엔드에 반영되면 열립니다 출제 폴더는 MSG-CTF/2026_MSG_CTF 의 koth-* 폴더입니다</p>;
  }
  return <div className={styles.repository}>
    <AdminStatusMessage status={repository.status} error={repository.error} onRetry={repository.retry} hasData={Boolean(repository.data)} />
    {challenge.repository && !choosing && <section className={styles.linked} aria-label="연결된 저장소 폴더">
      <div className={styles.linkedHead}>
        <span className={ui.mono}>{challenge.repository.slug}</span>
        <AdminBadge tone={fresh.behind ? "orange" : "good"}>{fresh.behind ? "새 커밋 있음" : "최신"}</AdminBadge>
      </div>
      <dl className={styles.linkedFacts}>
        <div><dt>출제자</dt><dd>{challenge.repository.author || linked?.author || "-"}</dd></div>
        <div><dt>저장소 이름</dt><dd>{linked?.title ?? "-"}</dd></div>
        <div><dt>반영한 커밋</dt><dd><span className={ui.mono}>{challenge.repository.source_revision ?? "-"}</span>
          {fresh.committedAt && <span className={ui.secondary}>{formatAdminTime(fresh.committedAt, { seconds: false })} 커밋</span>}</dd></div>
        <div><dt>플랫폼 반영</dt><dd>{fresh.syncedAt ? formatAdminTime(fresh.syncedAt, { seconds: false }) : "-"}</dd></div>
        <div><dt>저장소 최신 커밋</dt><dd><span className={ui.mono}>{fresh.latest ?? linked?.last_commit?.revision ?? "-"}</span>
          {(fresh.latestAt || linked?.last_commit?.committed_at) && <span className={ui.secondary}>{formatAdminTime(fresh.latestAt ?? linked.last_commit.committed_at, { seconds: false })}{linked?.last_commit?.author ? ` · ${linked.last_commit.author}` : ""}</span>}</dd></div>
      </dl>
      {fresh.behind && <p className={ui.callout} data-tone="warn">저장소 main 에 반영하지 않은 커밋이 있습니다 지문과 제목은 최신 커밋 반영으로, 참가자 파일은 참가자 파일 탭에서 다시 묶어 맞춥니다</p>}
      <div className={styles.linkedActions}>
        {(challenge.repository.source_url || linked?.source_url) && <a className={ui.button} href={challenge.repository.source_url || linked.source_url} target="_blank" rel="noreferrer">GitHub에서 보기 ↗</a>}
        {linked && <button type="button" className={ui.button} onClick={() => onUseDraft({ title: linked.title, description: linked.description })}>저장소 지문 불러오기</button>}
        {fresh.behind && <button type="button" className={ui.primary} onClick={() => { setChoosing(true); setSlug(challenge.repository.slug); }}>최신 커밋 반영</button>}
        <button type="button" className={ui.button} onClick={() => { setChoosing(true); setSlug(challenge.repository.slug); }}>연결 바꾸기</button>
      </div>
    </section>}
    {picking && repository.data && <section className={styles.picker} aria-label="저장소 폴더 고르기">
      <p className={ui.quietNote}>{repository.data.repository} · {repository.data.ref} 의 KoTH 폴더 {folders.length}개</p>
      <ul className={styles.folderList} role="radiogroup" aria-label="저장소 폴더">
        {folders.map((folder) => {
          const elsewhere = folder.linked_koth_challenge_id && folder.linked_koth_challenge_id !== challenge.koth_challenge_id;
          return <li key={folder.slug}>
            <label className={styles.folder} data-disabled={elsewhere || undefined}>
              <input type="radio" name="koth-folder" value={folder.slug} checked={chosen === folder.slug} disabled={elsewhere || busy} onChange={() => setSlug(folder.slug)} />
              <span className={styles.folderText}>
                <strong>{folder.title}</strong>
                <span className={ui.mono}>{folder.slug}</span>
                <span>출제 {folder.author || "-"}{folder.last_commit?.revision ? ` · ${folder.last_commit.revision}` : ""}</span>
              </span>
              {suggestion?.slug === folder.slug && !elsewhere && <AdminBadge tone="blue">추천</AdminBadge>}
              {elsewhere && <AdminBadge>다른 문제에 연결됨</AdminBadge>}
            </label>
          </li>;
        })}
      </ul>
      <div className={styles.applyChoices} role="group" aria-label="저장소에서 가져올 내용">
        <label className={ui.check}><input type="checkbox" checked={apply.title} disabled={busy} onChange={(event) => setApply((current) => ({ ...current, title: event.target.checked }))} />제목을 저장소 이름으로</label>
        <label className={ui.check}><input type="checkbox" checked={apply.description} disabled={busy} onChange={(event) => setApply((current) => ({ ...current, description: event.target.checked }))} />지문을 info.yaml 내용으로</label>
      </div>
      <AdminReasonField label="사유" value={reason} onChange={setReason} presets={LINK_REASONS} disabled={busy} required />
      {error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={ui.formActions}>
        {challenge.repository && <button type="button" className={ui.button} disabled={busy} onClick={() => { setChoosing(false); setError(""); }}>취소</button>}
        <button type="button" className={ui.primary} disabled={busy || !chosen || !reason.trim()} onClick={link}>{busy ? "반영 중" : resync ? "최신 커밋 반영" : "이 폴더 연결"}</button>
      </div>
    </section>}
  </div>;
}
