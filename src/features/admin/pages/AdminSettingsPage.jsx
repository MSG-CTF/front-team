import { useEffect, useRef, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
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

// 대회 설정 - README.md "8. 관리자 페이지 > 설정"(백엔드: 논의).
export default function AdminSettingsPage() {
  const settings = useAdminResource(getAdminSettings, [], "설정을 불러오지 못했습니다.");
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
        throw new Error(response.data?.message || "설정 저장에 실패했습니다.");
      }
      const refreshed = await settings.reload();
      setSaved(refreshed);
      if (!refreshed) setSaveError("저장은 처리됐지만 최신 설정을 조회하지 못했습니다");
    } catch (error) {
      setSaveError(error.response?.data?.message || error.message || "설정 저장에 실패했습니다.");
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
        <div className={`${ui.stack} ${ui.formCard}`}>
          <section className={ui.card} aria-labelledby="settings-contest">
            <header className={ui.cardHeader}>
              <h2 id="settings-contest" className={ui.cardTitle}><span className={ui.eyebrow}>CONTEST</span>대회 시각</h2>
              <span className={ui.cardMeta}>읽기 전용 · 타이머 기준</span>
            </header>
            <dl className={ui.dl}>
              <div>
                <dt>상태</dt>
                <dd>{contest?.status ?? "-"}</dd>
              </div>
              <div>
                <dt>시작 (KST)</dt>
                <dd className={ui.text}>{formatAdminTime(contest?.started_at, { year: true, seconds: false })}</dd>
              </div>
              <div>
                <dt>종료 (KST)</dt>
                <dd className={ui.text}>{formatAdminTime(contest?.ends_at, { year: true, seconds: false })}</dd>
              </div>
            </dl>
          </section>

          {form && (
            <form onSubmit={handleSave} className={ui.card} aria-label="대회 규칙">
              <fieldset disabled={isSaving} className={ui.settingsFieldset}>
                <header className={ui.cardHeader}>
                  <h2 className={ui.cardTitle}><span className={ui.eyebrow}>BOARD</span>보드 · 주사위</h2>
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
                <header className={`${ui.cardHeader} ${ui.cardHeaderDivided}`}>
                  <h2 className={ui.cardTitle}><span className={ui.eyebrow}>FLAG</span>플래그 제출</h2>
                </header>
                <div className={ui.cardBody}>
                  <div className={`${ui.formGrid} ${ui.formGrid3}`}>
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
