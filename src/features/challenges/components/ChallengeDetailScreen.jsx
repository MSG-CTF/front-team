import BackButton from "./BackButton.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import InstanceControls from "./InstanceControls.jsx";
import InstanceActionDialog from "./InstanceActionDialog.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";
import RequestFeedback from "./RequestFeedback.jsx";
import { formatRemaining } from "../../../utils/time.js";
import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeDetailScreen({
  loading,
  pageError,
  refreshError,
  refreshing,
  instanceError,
  challenge,
  submission,
  instance,
  otherInstance,
  controls,
  flagValue,
  onFlagChange,
  onSubmitFlag,
  onBack,
  onInstanceAction,
  retrySeconds,
  flagFeedback,
  instanceFeedback,
  pendingAction,
  submitDisabled,
  instanceUnavailable,
  confirmation,
  onConfirmAction,
  onCancelAction,
  onRetry,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <BackButton onClick={onBack} />
        <span className={styles.pageLocation}>문제 상세</span>
      </div>
      <main className={styles.board} aria-label="문제 상세">
        {loading && (
          <div className={styles.loadingState} role="status" aria-busy="true">
            <div className={styles.skeletonTitle} aria-hidden="true" />
            <div className={styles.skeletonBody} aria-hidden="true" />
            <p>문제 정보를 불러오는 중입니다</p>
          </div>
        )}
        {pageError && (
          <section className={styles.pageMessage} role="alert">
            <p className={styles.eyebrow}>CHALLENGE</p>
            <h1>
              {pageError.code === "CHALLENGE_LOCKED"
                ? "아직 열리지 않은 문제입니다"
                : "문제를 불러오지 못했습니다"}
            </h1>
            <p>{pageError.message}</p>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={refreshing}
              onClick={onRetry}
            >
              {refreshing ? "확인 중…" : "다시 시도"}
            </button>
          </section>
        )}
        {challenge && !loading && !pageError && (
          <>
            <ChallengeHeaderPanel challenge={challenge} />
            <nav className={styles.sectionNav} aria-label="문제 상세 바로가기">
              <a href="#challenge-description">문제 설명</a>
              <a href="#challenge-instance">인스턴스</a>
              <a href="#challenge-flag">플래그 제출</a>
            </nav>
            {refreshError && (
              <div className={styles.refreshNotice} role="status">
                <p>
                  최신 상태를 불러오지 못해 마지막으로 확인한 문제를 표시하고
                  있습니다
                  <br />
                  <span>
                    다시 확인할 때까지 제출과 인스턴스 작업이 잠시 대기합니다
                  </span>
                </p>
                <button
                  type="button"
                  disabled={refreshing}
                  className={styles.secondaryButton}
                  onClick={onRetry}
                >
                  {refreshing ? "확인 중…" : "다시 확인"}
                </button>
              </div>
            )}
            <div className={styles.contentGrid}>
              <ChallengeDescriptionPanel
                description={challenge.description}
                attachments={challenge.attachments}
              />
              <div className={styles.actionColumn}>
                <InstancePanel
                  instance={instance}
                  otherInstance={otherInstance}
                  error={instanceError}
                >
                  <InstanceControls
                    instance={instance}
                    otherInstance={otherInstance}
                    controls={controls}
                    unavailable={instanceUnavailable}
                    pendingAction={pendingAction}
                    onAction={onInstanceAction}
                  />
                  {instanceError && (
                    <div className={styles.instanceError}>
                      <p role="alert">{instanceError.message}</p>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={onRetry}
                        disabled={refreshing}
                      >
                        {refreshing ? "확인 중…" : "다시 조회"}
                      </button>
                    </div>
                  )}
                  <RequestFeedback feedback={instanceFeedback} />
                </InstancePanel>
                <FlagSubmitPanel
                  value={flagValue}
                  onChange={onFlagChange}
                  onSubmit={onSubmitFlag}
                  disabled={submitDisabled}
                  inputDisabled={
                    pendingAction === "submit-flag" || submission.blocked
                  }
                  busy={pendingAction === "submit-flag"}
                  retrySeconds={retrySeconds}
                  solved={submission.blocked}
                  feedback={flagFeedback}
                >
                  {submission.remainingSeconds != null &&
                    !submission.blocked && (
                      <div className={styles.bonusNotice}>
                        <div>
                          <span>개방 후 보상 시간</span>
                          <strong>
                            {submission.expired
                              ? "종료"
                              : formatRemaining(submission.remainingSeconds)}
                          </strong>
                        </div>
                        <p>
                          {submission.expired
                            ? "시간이 지나도 정답 제출과 점수·마일리지 획득은 가능합니다"
                            : "현재 진행 중인 문제를 15분 안에 해결하면 추가 주사위를 받습니다"}
                        </p>
                      </div>
                    )}
                </FlagSubmitPanel>
              </div>
            </div>
          </>
        )}
      </main>
      {confirmation && (
        <InstanceActionDialog
          returnFocusTo={confirmation.trigger}
          action={confirmation.action}
          otherInstance={otherInstance}
          onConfirm={onConfirmAction}
          onCancel={onCancelAction}
          disabled={instanceUnavailable || pendingAction != null}
        />
      )}
    </div>
  );
}
