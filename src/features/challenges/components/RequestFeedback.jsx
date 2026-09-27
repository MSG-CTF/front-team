import styles from "./ChallengeDetailScreen.module.css";

export default function RequestFeedback({ feedback, id, rewards = false }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  const data = feedback.data;
  const hasNumber = (key) =>
    typeof data?.[key] === "number" && Number.isFinite(data[key]);
  return (
    <div
      id={id}
      className={isError ? styles.errorMessage : styles.notice}
      role={isError ? "alert" : "status"}
    >
      <p>{feedback.message}</p>
      {rewards && !isError && data && (
        <dl className={styles.rewards}>
          {hasNumber("earned_score") && (
            <div>
              <dt>획득 점수</dt>
              <dd>+{data.earned_score.toLocaleString("ko-KR")}</dd>
            </div>
          )}
          {hasNumber("earned_mileage") && (
            <div>
              <dt>획득 마일리지</dt>
              <dd>+{data.earned_mileage.toLocaleString("ko-KR")}</dd>
            </div>
          )}
          {data.is_extra_dice_granted === true && (
            <div>
              <dt>추가 주사위</dt>
              <dd>+1</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
