import RequestFeedback from "./RequestFeedback.jsx";
import styles from "./ChallengeDetailScreen.module.css";

export default function FlagSubmitPanel({
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
      className={styles.flagPanel}
      aria-labelledby="flag-heading"
      aria-busy={busy}
      tabIndex={-1}
    >
      <div className={styles.sectionIntro}>
        <span className={styles.sectionNumber} aria-hidden="true">
          02
        </span>
        <h2 id="flag-heading" className={styles.sectionHeading}>
          플래그 제출
        </h2>
      </div>
      <p id="flag-hint" className={styles.formHint}>
        {solved
          ? "이미 해결한 문제입니다. 제출한 정답이 팀 기록에 반영됐습니다"
          : "문제에서 찾은 플래그를 입력해주세요"}
      </p>
      <label htmlFor="flag" className={styles.fieldLabel}>
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
        className={styles.flagInput}
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
        className={styles.submitButton}
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
        <p id="flag-retry" className={styles.retryNotice}>
          <strong>{retrySeconds}초</strong> 후 다시 제출할 수 있습니다
        </p>
      )}
      <RequestFeedback id="flag-feedback" feedback={feedback} rewards />
      {children}
    </form>
  );
}
