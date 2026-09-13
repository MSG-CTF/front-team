import BackButton from "./BackButton.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import InstanceControls from "./InstanceControls.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";
import {
  formatRemaining,
  getChallengeDeadline,
  toKst,
} from "../../../utils/time.js";
import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeDetailScreen({
  loading,
  pageError,
  instanceError,
  challenge,
  submission,
  instance,
  flagValue,
  onFlagChange,
  onSubmitFlag,
  onBack,
  onCreateInstance,
  onExtendInstance,
  onRestartInstance,
  onStopInstance,
  retrySeconds,
  feedback,
  actionPending,
  submitDisabled,
  onRetry,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <BackButton onClick={onBack} />
      </div>
      <main className={styles.board} aria-label="문제 상세">
        {loading && (
          <p className={styles.pageMessage} role="status">
            문제 정보를 불러오는 중입니다
          </p>
        )}
        {pageError && (
          <section className={styles.pageMessage} role="alert">
            <p>{pageError.message}</p>
            <p className={styles.errorCode}>{pageError.code}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onRetry}
            >
              다시 시도
            </button>
          </section>
        )}
        {challenge && !loading && !pageError && (
          <>
            <ChallengeHeaderPanel challenge={challenge} />
            <div className={styles.contentGrid}>
              <ChallengeDescriptionPanel
                description={challenge.description}
                attachments={challenge.attachments}
              />
              <div className={styles.actionColumn}>
                <div>
                  <InstancePanel instance={instance} error={instanceError} />
                  <InstanceControls
                    instance={instance}
                    unavailable={Boolean(instanceError)}
                    busy={actionPending}
                    onCreate={onCreateInstance}
                    onExtend={onExtendInstance}
                    onRestart={onRestartInstance}
                    onStop={onStopInstance}
                  />
                  {instanceError && (
                    <p className={styles.errorMessage} role="alert">
                      {instanceError.message}
                    </p>
                  )}
                </div>
                <FlagSubmitPanel
                  value={flagValue}
                  onChange={onFlagChange}
                  onSubmit={onSubmitFlag}
                  disabled={submitDisabled}
                  inputDisabled={actionPending || submission.blocked}
                >
                  <div className={styles.submissionStatus}>
                    {challenge.accessStatus === "OPENED" &&
                      !submission.blocked && (
                        <span className={styles.accessBadge}>진행 중</span>
                      )}
                    {(submission.isCleared || challenge.solved) && (
                      <span className={styles.solvedBadge}>풀이 완료</span>
                    )}
                    {submission.remainingSeconds != null &&
                      !submission.blocked && (
                        <span
                          title={
                            "개방: " +
                            toKst(challenge.openedAt) +
                            " / 보상 종료: " +
                            toKst(getChallengeDeadline(challenge.openedAt)) +
                            " (KST)"
                          }
                        >
                          {submission.expired
                            ? "추가 주사위 보상 종료 · 플래그 제출 가능"
                            : "추가 주사위 보상 " +
                              formatRemaining(submission.remainingSeconds)}
                        </span>
                      )}
                  </div>
                </FlagSubmitPanel>
                {retrySeconds > 0 && (
                  <p className={styles.notice} role="status">
                    재제출까지 {retrySeconds}초
                  </p>
                )}
                {feedback && (
                  <p
                    className={
                      feedback.type === "error"
                        ? styles.errorMessage
                        : styles.notice
                    }
                    role={feedback.type === "error" ? "alert" : "status"}
                  >
                    {feedback.message}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
