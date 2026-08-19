import styles from "./KothScreen.module.css";

export default function KothChallengeButton({ challenge, onSelect }) {
  const isIdentified = Boolean(challenge.kothChallengeId);

  return (
    <button
      type="button"
      className={styles.challengeButton}
      style={challenge.position}
      aria-label={`${challenge.title} KOTH 문제 풀기`}
      aria-disabled={!isIdentified}
      onClick={() => {
        if (isIdentified) onSelect(challenge);
      }}
    >
      <img
        src={challenge.imageSrc}
        alt=""
        aria-hidden="true"
        className={styles.layerImage}
      />
    </button>
  );
}
