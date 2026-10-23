import { useEffect } from "react";
import styles from "./ChallengeDetailScene.module.css";

export default function FlagResultModal({ feedback, onClose }) {
  useEffect(() => {
    if (!feedback) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedback, onClose]);

  if (!feedback) return null;
  const isError = feedback.type === "error";
  const data = feedback.data;
  const hasNumber = (key) =>
    typeof data?.[key] === "number" && Number.isFinite(data[key]);

  return (
    <div className={styles.resultOverlay} onClick={onClose}>
      <div
        id="flag-feedback"
        className={`${styles.resultModal} ${
          isError ? styles.resultModalError : styles.resultModalSuccess
        }`}
        role={isError ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="flag-result-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.resultClose}
          aria-label="닫기"
          onClick={onClose}
          autoFocus
        >
          ×
        </button>
        <p className={styles.resultEyebrow}>{isError ? "WRONG" : "CORRECT"}</p>
        <h2 id="flag-result-title" className={styles.resultTitle}>
          {isError ? "오답입니다" : "정답입니다"}
        </h2>
        <p className={styles.resultMessage}>{feedback.message}</p>
        {!isError && data && (
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
        <button type="button" className={styles.primaryButton} onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
