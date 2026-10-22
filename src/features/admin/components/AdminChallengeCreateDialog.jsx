import { useRef, useState } from "react";
import { registerAdminChallenge } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import AdminDialog from "./AdminDialog.jsx";
import { ADMIN_CHALLENGE_CATEGORIES, getAdminRequestError, validateAdminChallenge } from "../utils/adminValidation.js";
import ui from "./AdminWorkspace.module.css";

const INITIAL = {
  challengeSlug: "",
  title: "",
  category: "WEB",
  difficulty: "UNASSIGNED",
  description: "",
  flag: "",
  initialScore: "1000",
  minimumScore: "100",
  decay: "70",
};

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
    <AdminDialog title="문제 등록" subtitle="등록한 문제는 비공개 상태로 생성됩니다" onClose={onClose} busy={busy} wide>
      <form onSubmit={submit} className={ui.formStack}>
        <fieldset disabled={busy} className={ui.formStack}>
          <div className={`${ui.formGrid} ${ui.formGrid3}`}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>문제 식별자</span>
              <input required maxLength={100} value={form.challengeSlug} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="소문자, 숫자, 하이픈" onChange={(event) => update("challengeSlug", event.target.value)} className={ui.input}/>
            </label>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>제목</span>
              <input required maxLength={400} value={form.title} onChange={(event) => update("title", event.target.value)} className={ui.input}/>
            </label>
            {/* 분야와 난이도는 한 칸을 나눠 써서 아래 점수 세 칸과 세로 줄을 맞춘다 */}
            <div className={ui.formPair}>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>분야</span>
                <select value={form.category} onChange={(event) => update("category", event.target.value)} className={ui.select}>
                  {ADMIN_CHALLENGE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className={ui.field}>
                <span className={ui.fieldLabel}>난이도</span>
                <select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)} className={ui.select}>
                  <option value="UNASSIGNED">미정</option>
                  {["EASY", "MEDIUM", "HARD"].map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
                </select>
              </label>
            </div>
          </div>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>설명</span>
            <textarea value={form.description} rows={3} onChange={(event) => update("description", event.target.value)} className={ui.textarea}/>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>정답 플래그</span>
            <input required type="password" autoComplete="new-password" value={form.flag} onChange={(event) => update("flag", event.target.value)} className={ui.input}/>
          </label>
          <div className={`${ui.formGrid} ${ui.formGrid3}`}>
            {[["initialScore", "초기 점수", 0, "0.01"], ["minimumScore", "최소 점수", 0, "0.01"], ["decay", "점수 감소 계수", 1, "1"]].map(([key, label, min, step]) => (
              <label key={key} className={ui.field}>
                <span className={ui.fieldLabel}>{label}</span>
                <input required type="number" min={min} step={step} value={form[key]}
                  onChange={(event) => update(key, event.target.value)} className={ui.input}/>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={ui.formActions}>
          <div className={ui.formFeedback}>
            {form.title && form.challengeSlug && validationError && <p className={ui.fieldHint}>{validationError}</p>}
            {error && <p role="alert" className={ui.errorText}>{error}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className={ui.button}>취소</button>
          <button type="submit" disabled={busy || Boolean(validationError)} className={ui.primary}>
            {busy ? "등록 중" : "문제 등록"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
