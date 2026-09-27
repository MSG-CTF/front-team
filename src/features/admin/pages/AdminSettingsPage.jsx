import { useEffect, useRef, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import { validateAdminSettings } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";

function Field({ label, value, onChange, min, max }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-admin-muted">{label}</span>
      <input
        type="number"
        required
        step={1}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-40 rounded border border-admin-divider bg-white/30 px-2 py-1.5"
      />
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

  return (
    <AdminLayout title="대회 설정">
      <AdminStatusMessage status={settings.status} error={settings.error} onRetry={settings.retry} />

      {settings.status === "success" && settings.data && (
        <section className="mb-6 rounded-lg border border-admin-divider bg-white/30 p-4 text-sm">
          <h2 className="m-0 mb-2 text-sm font-bold text-admin-muted">대회 시각(읽기 전용, 타이머 도메인 기준)</h2>
          <p className="m-0">
            상태 {settings.data.contest?.status ?? "-"} / 시작{" "}
            {settings.data.contest?.started_at ? toKst(settings.data.contest.started_at) : "-"} / 종료{" "}
            {settings.data.contest?.ends_at ? toKst(settings.data.contest.ends_at) : "-"}
          </p>
        </section>
      )}

      {saveError && <p role="alert" className="mb-3 text-admin-failed">{saveError}</p>}
      {saved && <p role="status" className="mb-3 text-admin-running">저장했습니다</p>}
      {settings.status === "success" && form && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-lg border border-admin-divider bg-white/30 p-4">
          <fieldset disabled={isSaving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label="주사위 충전 개수"
              min={1}
              max={20}
              value={form.dice_rolls_per_reset}
              onChange={(value) => setForm({ ...form, dice_rolls_per_reset: value })}
            />
            <Field
              label="충전 주기(분)"
              min={1}
              max={1440}
              value={form.dice_reset_interval_minutes}
              onChange={(value) => setForm({ ...form, dice_reset_interval_minutes: value })}
            />
            <Field
              label="추가 주사위 보상 기간(분)"
              min={1}
              max={180}
              value={form.solve_deadline_minutes}
              onChange={(value) => setForm({ ...form, solve_deadline_minutes: value })}
            />
            <Field
              label="오답 허용 횟수"
              min={1}
              max={10}
              value={form.max_attempts}
              onChange={(value) => setForm({ ...form, max_attempts: value })}
            />
            <Field
              label="오답 락 시간(초)"
              min={1}
              max={3600}
              value={form.lock_seconds}
              onChange={(value) => setForm({ ...form, lock_seconds: value })}
            />
          </fieldset>

          <button
            type="submit"
            disabled={isSaving || !validateAdminSettings(form)}
            className="w-fit rounded border border-admin-divider px-4 py-1.5 text-sm disabled:opacity-50"
          >
            저장
          </button>
        </form>
      )}
    </AdminLayout>
  );
}
