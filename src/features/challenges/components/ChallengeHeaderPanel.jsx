import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeHeaderPanel({ challenge }) {
  const { title, category, difficulty, solved, points, solves } = challenge;
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <p className={styles.eyebrow}>CHALLENGE</p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.badges}>
          {category && <span className={styles.categoryBadge}>{category}</span>}
          {difficulty && (
            <span className={styles.difficultyBadge}>{difficulty}</span>
          )}
          {solved && <span className={styles.solvedBadge}>SOLVED</span>}
        </div>
      </div>
      <dl className={styles.metrics}>
        <div>
          <dt>POINTS</dt>
          <dd className={styles.points}>{points ?? "—"}</dd>
        </div>
        <div>
          <dt>SOLVES</dt>
          <dd>{solves ?? "—"}</dd>
        </div>
      </dl>
    </header>
  );
}
