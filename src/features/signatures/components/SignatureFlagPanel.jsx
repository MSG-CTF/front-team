import shared from "../../challenges/components/ChallengeDetailScreen.module.css";

// 문제 상세의 FlagSubmitPanel은 1920 장면 전용 CSS(절대 좌표, --u)로 바뀌어
// 기존 공용 CSS로 배치하는 부스 상세에서는 제출 칸이 한 글자 폭으로 접힌다
// 부스 상세가 쓰는 공용 CSS의 원래 제출 패널 구조를 그대로 둔다
function SubmitFeedback({ feedback }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  const data = feedback.data;
  const hasNumber = (key) =>
    typeof data?.[key] === "number" && Number.isFinite(data[key]);
  return (
    <div
      id="flag-feedback"
      className={isError ? shared.errorMessage : shared.notice}
      role={isError ? "alert" : "status"}
    >
      <p>{feedback.message}</p>
      {!isError && hasNumber("earned_score") && (
        <dl className={shared.rewards}>
          <div>
            <dt>획득 점수</dt>
            <dd>+{data.earned_score.toLocaleString("ko-KR")}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export default function SignatureFlagPanel({
  value,
  onChange,
  onSubmit,
  disabled,
  inputDisabled,
  busy,
  retrySeconds,
  solved,
  feedback,
  maxLength,
  children,
}) {
  const invalid =
    feedback?.code === "INCORRECT_FLAG" || feedback?.code === "INVALID_REQUEST";
  return (
    <form
      id="challenge-flag"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit();
      }}
      className={shared.flagPanel}
      aria-labelledby="flag-heading"
      aria-busy={busy}
      tabIndex={-1}
    >
      <div className={shared.sectionIntro}>
        <span className={shared.sectionNumber} aria-hidden="true">
          02
        </span>
        <h2 id="flag-heading" className={shared.sectionHeading}>
          플래그 제출
        </h2>
      </div>
      <p id="flag-hint" className={shared.formHint}>
        {solved
          ? "이미 해결한 문제입니다 제출한 정답이 팀 기록에 반영됐습니다"
          : "문제에서 찾은 플래그를 입력해주세요"}
      </p>
      <label htmlFor="flag" className={shared.fieldLabel}>
        플래그
      </label>
      <input
        id="flag"
        name="flag"
        type="text"
        placeholder="MSG{...}"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        maxLength={maxLength}
        disabled={inputDisabled}
        onChange={(event) => onChange(event.target.value)}
        className={shared.flagInput}
        aria-invalid={invalid || undefined}
        aria-describedby={
          "flag-hint" +
          (feedback ? " flag-feedback" : "") +
          (retrySeconds > 0 ? " flag-retry" : "")
        }
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="플래그 제출"
        className={shared.submitButton}
      >
        {busy
          ? "정답 확인 중…"
          : solved
            ? "풀이 완료"
            : retrySeconds > 0
              ? "재제출 대기"
              : "플래그 제출"}
        <span aria-hidden="true">{solved ? "✓" : "→"}</span>
      </button>
      {retrySeconds > 0 && (
        <p id="flag-retry" className={shared.retryNotice}>
          <strong>{retrySeconds}초</strong> 후 다시 제출할 수 있습니다
        </p>
      )}
      <SubmitFeedback feedback={feedback} />
      {children}
    </form>
  );
}
