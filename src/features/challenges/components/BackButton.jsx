import styles from "./ChallengeDetailScene.module.css";

export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로가기"
      title="문제 목록"
      className={styles.backButton}
    >
      <img src="/assets/challenge-detail/icon-back.svg" alt="" aria-hidden="true" />
      <span className={styles.srOnly}>문제 목록</span>
    </button>
  );
}
