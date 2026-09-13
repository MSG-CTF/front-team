import { toKst } from "../../../utils/time.js";
import styles from "./OpenChallengesScreen.module.css";

export default function OpenChallengeCard({
  challenge,
  hasInstance,
  onSelect,
}) {
  const score =
    typeof challenge.score === "number" && Number.isFinite(challenge.score)
      ? challenge.score.toLocaleString("ko-KR")
      : "-";
  const solvedTime =
    challenge.solvedAt && Number.isFinite(Date.parse(challenge.solvedAt))
      ? toKst(challenge.solvedAt, {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;
  return (
    <li>
      <button
        type="button"
        className={[
          styles.challengeCard,
          challenge.isSolved ? styles.solvedCard : "",
          hasInstance ? styles.currentCard : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onSelect(challenge.challengeId)}
      >
        <span className={styles.cardMeta}>
          <span className={styles.category}>
            {challenge.category || "분야 미정"}
          </span>
          {hasInstance && (
            <span className={styles.instanceMark}>내 인스턴스</span>
          )}
          {challenge.isSolved && (
            <span className={styles.solvedMark}>
              <span aria-hidden="true">✓</span> 풀이 완료
            </span>
          )}
        </span>
        <strong className={styles.cardTitle}>{challenge.title}</strong>
        {challenge.clubName && (
          <span className={styles.clubName}>{challenge.clubName}</span>
        )}
        <span className={styles.cardFooter}>
          <span
            className={styles.cardScore}
            aria-label={
              score === "-" ? "현재 배점 정보 없음" : `현재 배점 ${score}점`
            }
          >
            {score}
            <small> pts</small>
          </span>
          {challenge.isSolved && solvedTime ? (
            <time className={styles.solvedTime} dateTime={challenge.solvedAt}>
              {solvedTime} KST
            </time>
          ) : (
            <span className={styles.cardArrow} aria-hidden="true">
              ↗
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
