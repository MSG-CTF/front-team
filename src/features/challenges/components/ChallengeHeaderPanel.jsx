import styles from "./ChallengeDetailScene.module.css";

const formatMetric = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("ko-KR")
    : "—";

export default function ChallengeHeaderPanel({ challenge }) {
  const {
    title,
    category,
    clubName,
    difficulty,
    solved,
    points,
    solves,
    accessStatus,
  } = challenge;
  const cleared = solved || accessStatus === "CLEARED";
  return (
    <header className={styles.header}>
      {clubName && <p className={styles.eyebrow}>{clubName}</p>}
      <h1 className={styles.title} title={title}>
        {title}
      </h1>
      <div className={styles.badges}>
        {category && (
          <span className={`${styles.pill} ${styles.pillCategory}`}>
            {category}
          </span>
        )}
        {difficulty && (
          <span className={`${styles.pill} ${styles.pillDifficulty}`}>
            {difficulty}
          </span>
        )}
        {cleared && (
          <span className={`${styles.pill} ${styles.pillSolved}`}>
            <span aria-hidden="true">SOLVED</span>
            <span className={styles.srOnly}>풀이 완료</span>
          </span>
        )}
        {!solved && accessStatus === "OPENED" && (
          <span className={`${styles.pill} ${styles.pillOpen}`}>
            <span aria-hidden="true">OPEN</span>
            <span className={styles.srOnly}>풀이 가능</span>
          </span>
        )}
      </div>
      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt className={styles.bakedLabel}>현재 배점</dt>
          <dd className={styles.points}>{formatMetric(points)}</dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.bakedLabel}>해결한 팀</dt>
          <dd>{formatMetric(solves)}</dd>
        </div>
      </dl>
    </header>
  );
}
