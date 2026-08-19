import MainNavigationButton from "./MainNavigationButton.jsx";
import RulesPanel from "./RulesPanel.jsx";
import styles from "./RulesScreen.module.css";

export default function RulesScreen({ rules, onNavigateMain }) {
  return (
    <main className={styles.page} aria-label="게임 규칙 안내">
      <div className={styles.stage}>
        <img
          src="/assets/rules/rules-background.png"
          alt=""
          aria-hidden="true"
          className={styles.background}
        />

        <img
          src="/assets/rules/msg-ctf-logo.png"
          alt="MSG CTF"
          className={styles.logo}
        />

        <RulesPanel rules={rules} />
        <MainNavigationButton onClick={onNavigateMain} />
      </div>
    </main>
  );
}
