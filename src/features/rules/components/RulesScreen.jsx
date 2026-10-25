import MainNavigationButton from "./MainNavigationButton.jsx";
import RulesPanel from "./RulesPanel.jsx";
import styles from "./RulesScreen.module.css";
import PanelTexture from "../../../components/common/PanelTexture.jsx";

export default function RulesScreen({ rules, onNavigateMain }) {
  return (
    <main className={styles.page} aria-label="게임 규칙 안내">
      <div className={styles.stage}>
        <PanelTexture material="paper" responsive="width" />
        {/* 풍경은 .page의 메인 배경 한 장만 쓰고, 무대에는 누끼 딴 베이지 보드(모서리 마커 없음)만 올린다 */}
        <img
          src="/assets/challenge-detail/panel-board.webp"
          loading="lazy"
          alt=""
          aria-hidden="true"
          className={styles.background}
        />

        <img
          src="/assets/rules/msg-ctf-logo.webp"
          alt="MSG CTF"
          className={styles.logo}
        />

        <RulesPanel rules={rules} />
        <MainNavigationButton onClick={onNavigateMain} />
      </div>
    </main>
  );
}
