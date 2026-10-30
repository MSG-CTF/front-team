import { useEffect, useState } from "react";
import RequestFeedback from "./RequestFeedback.jsx";
import styles from "./ChallengeDetailScene.module.css";

// PC에서는 인스턴스 판 아래쪽을 덮으니 성공 알림은 잠깐만 보이고 오류는 다시 시도할 때까지 남긴다
const SUCCESS_NOTICE_MS = 4000;

export default function InstanceNotice({ feedback, error, refreshing, onRetry }) {
  const [hidden, setHidden] = useState(null);
  useEffect(() => {
    if (feedback?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setHidden(feedback), SUCCESS_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const shown = feedback !== hidden ? feedback : null;
  if (!error && !shown) return null;
  return (
    <div className={styles.instanceNotices}>
      {error && (
        <div className={styles.errorMessage}>
          <p role="alert">{error.message}</p>
          <button
            type="button"
            className={styles.noticeButton}
            onClick={onRetry}
            disabled={refreshing}
          >
            {refreshing ? "확인 중…" : "다시 조회"}
          </button>
        </div>
      )}
      <RequestFeedback feedback={shown} />
    </div>
  );
}
