import styles from "./KothScreen.module.css";

export default function MainNavigationButton({ onClick }) {
  return (
    <button
      type="button"
      className={styles.mainNavigationButton}
      onClick={onClick}
      aria-label="메인 페이지로 이동"
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
