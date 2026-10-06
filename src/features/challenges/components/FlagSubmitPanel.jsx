import styles from "./ChallengeDetailScene.module.css";

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
      <h2 id="flag-heading" className={styles.bakedLabel}>
        플래그 제출
      </h2>
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
      <p id="flag-hint" className={styles.flagHint}>
        {solved
          ? "이미 해결한 문제입니다. 제출한 정답이 팀 기록에 반영됐습니다"
          : "문제에서 찾은 플래그를 입력해주세요"}
      </p>
      <button
        type="submit"
        disabled={disabled}
        aria-label="플래그 제출"
        className={styles.submitButton}
      >
        {busy
          ? "…"
          : solved
            ? "SOLVED"
            : retrySeconds > 0
              ? `WAIT ${retrySeconds}`
              : "SUBMIT"}
      </button>
    </form>
  );
}
