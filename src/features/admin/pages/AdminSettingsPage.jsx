import { useEffect, useMemo, useRef, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import AdminDialog from "../components/AdminDialog.jsx";
import { buildContestPatch, contestStarted, describeDuration, kstInputFromIso, shiftKstInput } from "../utils/adminContestTime.js";
import pickerStyles from "../components/AdminPicker.module.css";
import contestStyles from "./AdminSettingsPage.module.css";
import { validateAdminSettings } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";
import ui from "../components/AdminWorkspace.module.css";

function Field({ label, unit, value, onChange, min, max }) {
  return (
    <label className={ui.field}>
      <span className={ui.fieldLabel}>{label}</span>
      <span className={ui.unitInput}>
        <input
          type="number"
          required
          step={1}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={ui.input}
        />
        {unit && <span aria-hidden="true">{unit}</span>}
      </span>
      <span className={ui.fieldHint}>{min}~{max}{unit ? ` ${unit}` : ""}</span>
    </label>
  );
}

const CONTEST_STATUS = { BEFORE: ["시작 전", "neutral"], RUNNING: ["진행 중", "good"], ENDED: ["종료", "bad"] };
const END_SHIFTS = [{ minutes: -30, label: "−30분" }, { minutes: 30, label: "+30분" }, { minutes: 60, label: "+1시간" }];
const START_SHIFTS = [{ minutes: -30, label: "−30분" }, { minutes: 30, label: "+30분" }];
const at = (iso) => formatAdminTime(iso, { year: true, seconds: false });

// 대회 시각: PATCH /admin/settings 의 contest { started_at, ends_at } (백엔드 구현 완료)
// 시작 전에는 시작과 종료를 다 바꾸고, 시작한 뒤에는 종료만 늘리거나 줄인다 바꾼 값은 확인 창에서 한 번 더 본다
function ContestTimeCard({ contest, onSaved }) {
  const initial = useMemo(() => ({ start: kstInputFromIso(contest?.started_at), end: kstInputFromIso(contest?.ends_at) }),
    [contest?.started_at, contest?.ends_at]);
  const [form, setForm] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setForm(initial); }, [initial]);
  const started = contestStarted(contest);
  const patch = buildContestPatch(contest, form, Date.now(), { allowStarted: true });
  const dirty = form.start !== initial.start || form.end !== initial.end;
  const [statusLabel, statusTone] = CONTEST_STATUS[String(contest?.status ?? "").toUpperCase()] ?? [contest?.status ?? "-", "neutral"];

  function edit(key, value) { setForm((current) => ({ ...current, [key]: value })); setSaved(false); setError(""); }

  async function save() {
    if (saving || patch.error || !patch.changed) return;
    setSaving(true);
    setError("");
    try {
      const response = await updateAdminSettings({ contest: patch.body });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "대회 시각을 저장하지 못했습니다");
      setConfirming(false);
      setSaved(true);
      await onSaved();
    } catch (failure) {
      const code = failure?.response?.data?.code;
      const message = failure?.response?.data?.message || failure?.message || "대회 시각을 저장하지 못했습니다";
      // 지금 백엔드는 시작 후 시작 시각 변경을 409 로 막고 force 를 모르는 값으로 거부한다 (README 요청 반영 전)
      setError(patch.startedChange && (code === "CONTEST_ALREADY_STARTED" || /force/.test(message))
        ? "백엔드가 아직 시작한 대회의 시작 시각 변경을 막고 있습니다 종료 시각은 따로 바꿀 수 있습니다" : message);
    } finally {
      setSaving(false);
    }
  }

  if (!contest) {
    return <section className={ui.card} aria-labelledby="settings-contest">
      <header className={ui.cardHeader}><h2 id="settings-contest" className={ui.cardTitle}>대회 시각</h2></header>
      <div className={ui.cardBody}><p className={ui.quietNote}>활성화된 대회가 없습니다 대회를 먼저 만들어야 시각을 정할 수 있습니다</p></div>
    </section>;
  }

  return <section className={ui.card} aria-labelledby="settings-contest">
    <header className={ui.cardHeader}>
      <h2 id="settings-contest" className={ui.cardTitle}>대회 시각<AdminBadge tone={statusTone}>{statusLabel}</AdminBadge></h2>
      <span className={ui.cardMeta}>참가자 타이머와 보드가 이 시각을 따릅니다</span>
    </header>
    <div className={`${ui.cardBody} ${contestStyles.contest}`}>
      <div className={ui.field}>
        <label htmlFor="contest-start" className={ui.fieldLabel}>시작 <small>KST</small></label>
        <input id="contest-start" type="datetime-local" className={ui.input} value={form.start} disabled={saving}
          onChange={(event) => edit("start", event.target.value)} />
        <div className={pickerStyles.chips} role="group" aria-label="시작 시각 옮기기">
          {START_SHIFTS.map((shift) => <button key={shift.minutes} type="button" className={pickerStyles.chip} disabled={saving}
            onClick={() => edit("start", shiftKstInput(form.start, shift.minutes))}>{shift.label}</button>)}
        </div>
        {started && <span className={ui.fieldHint}>시작한 뒤에도 바꿀 수 있습니다 참가자 타이머와 대시보드 진행률이 새 시각을 따릅니다</span>}
      </div>
      <div className={ui.field}>
        <label htmlFor="contest-end" className={ui.fieldLabel}>종료 <small>KST</small></label>
        <input id="contest-end" type="datetime-local" className={ui.input} value={form.end} disabled={saving}
          onChange={(event) => edit("end", event.target.value)} />
        <div className={pickerStyles.chips} role="group" aria-label="종료 시각 옮기기">
          {END_SHIFTS.map((shift) => <button key={shift.minutes} type="button" className={pickerStyles.chip} disabled={saving}
            onClick={() => edit("end", shiftKstInput(form.end, shift.minutes))}>{shift.label}</button>)}
        </div>
      </div>
      <div className={contestStyles.duration}>
        <span>대회 길이</span>
        <strong>{describeDuration(form.start, form.end) || "-"}</strong>
      </div>
    </div>
    <div className={ui.cardFooter}>
      <div className={ui.formFeedback}>
        {(error || (dirty && patch.error)) && <p role="alert" className={ui.errorText}>{error || patch.error}</p>}
        {!error && saved && !dirty && <p role="status" className={ui.successText}>저장했습니다</p>}
      </div>
      <div className={ui.formActions}>
        {dirty && <button type="button" className={ui.button} disabled={saving} onClick={() => { setForm(initial); setError(""); }}>되돌리기</button>}
        <button type="button" className={ui.primary} disabled={saving || !dirty || Boolean(patch.error) || !patch.changed} onClick={() => setConfirming(true)}>대회 시각 저장</button>
      </div>
    </div>
    {confirming && <AdminDialog title="대회 시각 바꾸기" onClose={() => setConfirming(false)} busy={saving}>
      <p className={ui.dialogLead}>{patch.startedChange ? "이미 시작한 대회의 시작 시각을 바꿉니다" : started ? "진행 중인 대회의 시각을 바꿉니다 참가자 타이머가 바로 바뀝니다" : "대회 시작과 종료 시각을 바꿉니다"}</p>
      {patch.startedChange && <p className={ui.callout} data-tone="bad">참가자 타이머와 대시보드 진행률이 새 시작 시각을 따릅니다 주사위 충전과 문제 제한 시간은 팀별 시각을 쓰므로 바뀌지 않습니다 공지와 함께 바꿔주세요</p>}
      <dl className={contestStyles.changes}>
        {patch.body.started_at && <div><dt>시작</dt><dd><span>{at(contest.started_at)}</span><span aria-hidden="true">›</span><strong>{at(patch.body.started_at)}</strong></dd></div>}
        {patch.body.ends_at && <div><dt>종료</dt><dd><span>{at(contest.ends_at)}</span><span aria-hidden="true">›</span><strong>{at(patch.body.ends_at)}</strong></dd></div>}
      </dl>
      {error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={ui.formActions}>
        <button type="button" className={ui.button} disabled={saving} onClick={() => setConfirming(false)}>취소</button>
        <button type="button" className={ui.primary} disabled={saving} onClick={save}>{saving ? "바꾸는 중" : "바꾸기"}</button>
      </div>
    </AdminDialog>}
  </section>;
}

// 대회 설정 - README.md "8. 관리자 페이지 > 설정"(백엔드: 논의).
export default function AdminSettingsPage() {
  const settings = useAdminResource(getAdminSettings, [], "설정을 불러오지 못했습니다");
  const [form, setForm] = useState(null);
  const pending = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setForm({
        dice_rolls_per_reset: settings.data.board?.dice_rolls_per_reset ?? "",
        dice_reset_interval_minutes: settings.data.board?.dice_reset_interval_minutes ?? "",
        solve_deadline_minutes: settings.data.board?.solve_deadline_minutes ?? "",
        max_attempts: settings.data.flag?.max_attempts ?? "",
        lock_seconds: settings.data.flag?.lock_seconds ?? "",
      });
    }
  }, [settings.data]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (pending.current || !validateAdminSettings(form)) return;
    pending.current = true;
    setIsSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const response = await updateAdminSettings({
        board: {
          dice_rolls_per_reset: Number(form.dice_rolls_per_reset),
          dice_reset_interval_minutes: Number(form.dice_reset_interval_minutes),
          solve_deadline_minutes: Number(form.solve_deadline_minutes),
        },
        flag: {
          max_attempts: Number(form.max_attempts),
          lock_seconds: Number(form.lock_seconds),
        },
      });
      if (!isSuccess(response.data)) {
        throw new Error(response.data?.message || "설정 저장에 실패했습니다");
      }
      const refreshed = await settings.reload();
      setSaved(refreshed);
      if (!refreshed) setSaveError("저장은 처리됐지만 최신 설정을 조회하지 못했습니다");
    } catch (error) {
      setSaveError(error.response?.data?.message || error.message || "설정 저장에 실패했습니다");
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  };

  const contest = settings.data?.contest;

  return (
    <AdminLayout title="대회 설정">
      <AdminStatusMessage status={settings.status} error={settings.error} onRetry={settings.retry} hasData={Boolean(settings.data)} />

      {settings.data && (
        <div className={`${ui.stack} ${ui.settingsCard}`}>
          <ContestTimeCard contest={contest} onSaved={settings.reload} />

          {form && (
            <form onSubmit={handleSave} className={ui.card} aria-label="대회 규칙">
              <fieldset disabled={isSaving} className={`${ui.settingsFieldset} ${ui.settingsSplit}`}>
                <div className={ui.settingsGroup}>
                <header className={ui.cardHeader}>
                  <h2 className={ui.cardTitle}>보드 · 주사위</h2>
                </header>
                <div className={`${ui.cardBody} ${ui.formStack}`}>
                  <div className={`${ui.formGrid} ${ui.formGrid3}`}>
                    <Field
                      label="주사위 최대 보유 수"
                      unit="개"
                      min={1}
                      max={20}
                      value={form.dice_rolls_per_reset}
                      onChange={(value) => setForm({ ...form, dice_rolls_per_reset: value })}
                    />
                    <Field
                      label="충전 주기"
                      unit="분"
                      min={1}
                      max={1440}
                      value={form.dice_reset_interval_minutes}
                      onChange={(value) => setForm({ ...form, dice_reset_interval_minutes: value })}
                    />
                    <Field
                      label="추가 주사위 보상 기간"
                      unit="분"
                      min={1}
                      max={180}
                      value={form.solve_deadline_minutes}
                      onChange={(value) => setForm({ ...form, solve_deadline_minutes: value })}
                    />
                  </div>
                  <p className={ui.fieldHint}>
                    새 팀은 최대 보유 수만큼 시작하며, 기존 팀은 남은 주사위를 유지하고 1개씩 충전합니다
                  </p>
                </div>
                </div>
                <div className={ui.settingsGroup}>
                <header className={ui.cardHeader}>
                  <h2 className={ui.cardTitle}>플래그 제출</h2>
                </header>
                <div className={ui.cardBody}>
                  <div className={`${ui.formGrid} ${ui.formGrid2}`}>
                    <Field
                      label="오답 허용 횟수"
                      unit="회"
                      min={1}
                      max={10}
                      value={form.max_attempts}
                      onChange={(value) => setForm({ ...form, max_attempts: value })}
                    />
                    <Field
                      label="오답 락 시간"
                      unit="초"
                      min={1}
                      max={3600}
                      value={form.lock_seconds}
                      onChange={(value) => setForm({ ...form, lock_seconds: value })}
                    />
                  </div>
                </div>
                </div>
              </fieldset>
              <div className={ui.cardFooter}>
                <div className={ui.formFeedback}>
                  {saveError && <p role="alert" className={ui.errorText}>{saveError}</p>}
                  {saved && <p role="status" className={ui.successText}>저장했습니다</p>}
                </div>
                <button
                  type="submit"
                  disabled={isSaving || !validateAdminSettings(form)}
                  className={ui.primary}
                >
                  {isSaving ? "저장 중" : "설정 저장"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
