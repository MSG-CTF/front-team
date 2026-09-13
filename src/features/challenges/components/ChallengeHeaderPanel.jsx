import styles from "./ChallengeDetailScreen.module.css";

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
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <p className={styles.eyebrow}>
          CHALLENGE{clubName && <span> / {clubName}</span>}
        </p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.badges}>
          {category && <span className={styles.categoryBadge}>{category}</span>}
          {difficulty && (
            <span className={styles.difficultyBadge}>{difficulty}</span>
          )}
          {(solved || accessStatus === "CLEARED") && (
            <span className={styles.solvedBadge}>풀이 완료</span>
          )}
          {!solved && accessStatus === "OPENED" && (
            <span className={styles.accessBadge}>풀이 가능</span>
          )}
        </div>
      </div>
      <dl className={styles.metrics}>
        <div>
          <dt>현재 배점</dt>
          <dd className={styles.points}>
            {formatMetric(points)}
            <small> pts</small>
          </dd>
        </div>
        <div>
          <dt>해결한 팀</dt>
          <dd>
            {formatMetric(solves)}
            <small> 팀</small>
          </dd>
        </div>
      </dl>
    </header>
  );
}
