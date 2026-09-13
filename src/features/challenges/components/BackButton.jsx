import styles from "./ChallengeDetailScreen.module.css";

export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로가기"
      className={styles.backButton}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="m10 5-7 7 7 7M3 12h18" />
      </svg>
      문제 목록
    </button>
  );
}
