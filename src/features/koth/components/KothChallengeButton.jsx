import KothCompletionStamp from "./KothCompletionStamp.jsx";
import styles from "./KothScreen.module.css";

export default function KothChallengeButton({ challenge, onSelect }) {
  const statusClassName = styles[`status${challenge.status}`] ?? styles.statusUnknown;

  return (
    <button
      type="button"
      className={styles.challengeButton}
      style={challenge.position}
      aria-label={`${challenge.title} KOTH 문제 정보`}
      aria-pressed={challenge.selected}
      onClick={() => onSelect(challenge)}
    >
      <span className={styles.challengeCaption}><strong>{challenge.clubName}</strong><span>{challenge.title}</span></span>
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
      {challenge.earnedScore != null && <span className={styles.challengeScore}>내 점수 {challenge.earnedScore}</span>}
      {challenge.solved && (
        <span className="sr-only">최초 득점 완료</span>
      )}
    </button>
  );
}
