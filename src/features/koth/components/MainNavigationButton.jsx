import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import styles from "./KothScreen.module.css";

export default function MainNavigationButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={styles.mainNavigationButton}
      aria-label="보드 페이지로 이동"
      onClick={() => navigate(ROUTES.board)}
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
