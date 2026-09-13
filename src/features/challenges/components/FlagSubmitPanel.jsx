import styles from "./ChallengeDetailScreen.module.css";

export default function FlagSubmitPanel({
  value,
  onChange,
  onSubmit,
  disabled,
  inputDisabled,
  children,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (disabled) return;
    onSubmit();
  };
  return (
    <form
      onSubmit={handleSubmit}
      className={styles.flagPanel}
      aria-labelledby="flag-heading"
    >
      <h2 id="flag-heading" className={styles.sectionHeading}>
        플래그 제출
      </h2>
      {children}
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
        disabled={inputDisabled}
        onChange={(event) => onChange(event.target.value)}
        className={styles.flagInput}
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="플래그 제출"
        className={styles.submitButton}
      >
        제출하기 <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
