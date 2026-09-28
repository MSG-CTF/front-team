import KothCompletionStamp from "./KothCompletionStamp.jsx";
import { getKothCardAvailability } from "../utils/kothChallengeState.js";
import styles from "./KothScreen.module.css";

export default function KothChallengeButton({ challenge, stale, onSelect }) {
  const availability = getKothCardAvailability(challenge, stale);

  return (
    <button
      type="button"
      className={styles.challengeButton}
      style={{
        "--card-left": challenge.position?.left,
        "--card-top": challenge.position?.top,
        "--card-width": challenge.position?.width,
        "--card-height": challenge.position?.height,
      }}
      disabled={availability.disabled}
      aria-label={`${challenge.clubName} ${challenge.title} KoTH ${availability.label}`}
      title={`${challenge.title} / ${availability.label}`}
      aria-pressed={challenge.selected}
      onClick={() => { if (!availability.disabled) onSelect(challenge); }}
    >
      <span className={styles.challengeCaption}>{challenge.clubName}</span>
      <span className={styles.mobileChallengeTitle}>{challenge.title}</span>
      <img
        src={challenge.imageSrc}
        alt=""
        aria-hidden="true"
        className={styles.layerImage}
      />
      <KothCompletionStamp
        imageSrc={challenge.completionStampImageSrc}
        visible={challenge.solved}
      />
      {challenge.solved && (
        <span className="sr-only">최초 득점 완료</span>
      )}
    </button>
  );
}
