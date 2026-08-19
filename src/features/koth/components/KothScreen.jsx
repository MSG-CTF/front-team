import KothChallengeButton from "./KothChallengeButton.jsx";
import KothCompletionStamp from "./KothCompletionStamp.jsx";
import MainNavigationButton from "./MainNavigationButton.jsx";
import { KOTH_COMPLETION_STAMPS } from "../config/kothVisualConfig.js";
import styles from "./KothScreen.module.css";

export default function KothScreen({
  challenges,
  stampVisibility,
  onSelectChallenge,
  onNavigateMain,
}) {
  return (
    <main className={styles.page} aria-label="King of the Hill 문제 선택">
      <div className={styles.stage}>
        <img
          src="/assets/koth/koth-trail-background.png"
          alt=""
          aria-hidden="true"
          className={styles.background}
        />

        {challenges.map((challenge) => (
          <KothChallengeButton
            key={challenge.visualKey}
            challenge={challenge}
            onSelect={onSelectChallenge}
          />
        ))}

        {KOTH_COMPLETION_STAMPS.map((stamp) => (
          <KothCompletionStamp
            key={stamp.stampKey}
            stamp={stamp}
            visible={stampVisibility[stamp.stampKey]}
          />
        ))}

        <MainNavigationButton onClick={onNavigateMain} />
      </div>
    </main>
  );
}
