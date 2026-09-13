import { useRef, useState } from "react";
import { registerAdminChallenge } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import AdminDialog from "./AdminDialog.jsx";
import { ADMIN_CHALLENGE_CATEGORIES, getAdminRequestError, validateAdminChallenge } from "../utils/adminValidation.js";

const INITIAL = {
  challengeSlug: "",
  title: "",
  category: "WEB",
  difficulty: "EASY",
  description: "",
  flag: "",
  initialScore: "1000",
  minimumScore: "600",
  decay: "70",
};
const INPUT = "rounded border border-admin-divider bg-white/60 px-3 py-2";

export default function AdminChallengeCreateDialog({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const validationError = validateAdminChallenge(form);
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (pending.current || validationError) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await registerAdminChallenge({
        challengeSlug: form.challengeSlug.trim(),
        title: form.title.trim(),
        category: form.category,
        difficulty: form.difficulty,
        description: form.description,
        flag: form.flag,
        initialScore: Number(form.initialScore),
        minimumScore: Number(form.minimumScore),
        decay: Number(form.decay),
      });
      if (!isSuccess(response.data)) {
        throw new Error(response.data?.message || "문제 등록에 실패했습니다");
      }
      setForm(INITIAL);
      onCreated(response.data.data);
      onClose();
    } catch (requestError) {
      setError(getAdminRequestError(requestError, "문제 등록에 실패했습니다").error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <AdminDialog title="문제 등록" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="flex flex-col gap-4 font-song-myung text-sm">
        <p>등록한 문제는 비공개 상태로 생성됩니다</p>
        <fieldset disabled={busy} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            문제 식별자
            <input required maxLength={100} value={form.challengeSlug} pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="소문자, 숫자, 하이픈" onChange={(event) => update("challengeSlug", event.target.value)} className={INPUT}/>
          </label>
          <label className="flex flex-col gap-1">
            제목
            <input required maxLength={400} value={form.title} onChange={(event) => update("title", event.target.value)} className={INPUT}/>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              분야
              <select value={form.category} onChange={(event) => update("category", event.target.value)} className={INPUT}>
                {ADMIN_CHALLENGE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              난이도
              <select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)} className={INPUT}>
                {["EASY", "MEDIUM", "HARD"].map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            설명
            <textarea value={form.description} rows={3} onChange={(event) => update("description", event.target.value)} className={INPUT}/>
          </label>
          <label className="flex flex-col gap-1">
            정답 플래그
            <input required type="password" autoComplete="new-password" value={form.flag} onChange={(event) => update("flag", event.target.value)} className={INPUT}/>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["initialScore", "초기 점수", 0, "0.01"], ["minimumScore", "최소 점수", 0, "0.01"], ["decay", "점수 감소 계수", 1, "1"]].map(([key, label, min, step]) => (
              <label key={key} className="flex min-w-0 flex-col gap-1">
                {label}
                <input required type="number" min={min} step={step} value={form[key]}
                  onChange={(event) => update(key, event.target.value)} className={INPUT + " w-full"}/>
              </label>
            ))}
          </div>
        </fieldset>
        {form.title && form.challengeSlug && validationError && (
          <p className="text-admin-muted">{validationError}</p>
        )}
        {error && <p role="alert" className="text-admin-failed">{error}</p>}
        <button type="submit" disabled={busy || Boolean(validationError)}
          className="self-end rounded border border-admin-ink px-4 py-1.5 disabled:opacity-50">
          {busy ? "등록 중" : "문제 등록"}
        </button>
      </form>
    </AdminDialog>
  );
}
