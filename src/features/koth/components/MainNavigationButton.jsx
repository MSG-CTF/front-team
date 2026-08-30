import styles from "./KothScreen.module.css";

export default function MainNavigationButton() {
  return (
    <button
      type="button"
      className={styles.mainNavigationButton}
      aria-label="메인 페이지 이동 경로 미확정"
      aria-disabled="true"
    >
      <img
        src="/assets/koth/main-navigation-button.png"
        alt=""
        aria-hidden="true"
        className={styles.layerImage}
      />
    </button>
  );
}
