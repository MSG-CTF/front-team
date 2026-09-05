import KothCompletionStamp from "./KothCompletionStamp.jsx";
import styles from "./KothScreen.module.css";

export default function KothChallengeButton({ challenge, onSelect }) {
  const statusClassName = styles[`status${challenge.status}`] ?? styles.statusUnknown;

  return (
    <button
      type="button"
      className={styles.challengeButton}
      style={challenge.position}
      aria-label={`${challenge.title} KOTH 문제 풀기`}
      aria-pressed={challenge.selected}
      onClick={() => onSelect(challenge)}
    >
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
      <span className={`${styles.challengeStatus} ${statusClassName}`}>
        {challenge.status}
      </span>
      {challenge.solved && (
        <span className="sr-only">SOLVED</span>
      )}
    </button>
  );
}
