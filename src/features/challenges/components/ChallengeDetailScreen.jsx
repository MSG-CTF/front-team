import { useState } from "react";
import BackButton from "./BackButton.jsx";
import FlagResultModal from "./FlagResultModal.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import InstanceControls from "./InstanceControls.jsx";
import InstanceActionDialog from "./InstanceActionDialog.jsx";
import RemoteRunPanel from "./RemoteRunPanel.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";
import RequestFeedback from "./RequestFeedback.jsx";
import { formatRemaining } from "../../../utils/time.js";
import styles from "./ChallengeDetailScene.module.css";
import PanelTexture from "../../../components/common/PanelTexture.jsx";

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
  readOnly = false,
  downloadFile,
  remoteRun,
}) {
  const [dismissedFeedback, setDismissedFeedback] = useState(null);
  const showBonus =submission.remainingSeconds != null && !submission.blocked;
  // 파일을 내서 운영 VM에서 돌리는 문제는 인스턴스 대신 원격 실행 칸을 같은 자리에 둔다
  const showRemoteRun = Boolean(challenge?.remoteRun);
  const showInstance = !showRemoteRun && (challenge?.requiresInstance || instance != null);
  const showDock =
    challenge &&
    !loading &&
    !pageError &&
    (refreshError ||
      instanceError ||
      instanceFeedback ||
      retrySeconds > 0 ||
      showBonus);
  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.boardFrame} aria-hidden="true" />
        <BackButton onClick={onBack} />
        <main className={styles.board} aria-label="문제 상세">
          <PanelTexture material="paper" />
          {loading && (
            <div className={styles.stateBox} role="status" aria-busy="true">
              <div className={styles.skeletonTitle} aria-hidden="true" />
              <div className={styles.skeletonBody} aria-hidden="true" />
              <p>문제 정보를 불러오는 중입니다</p>
            </div>
          )}
          {pageError && (
            <section className={styles.stateBox} role="alert">
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
                {showInstance && <a href="#challenge-instance">인스턴스</a>}
                {showRemoteRun && <a href="#challenge-remote-run">원격 실행</a>}
                <a href="#challenge-flag">플래그 제출</a>
              </nav>
              <div className={styles.contentGrid}>
                <ChallengeDescriptionPanel
                  description={challenge.description}
                  attachments={challenge.attachments}
                  downloadFile={downloadFile}
                />
                <div className={styles.actionColumn}>
                  {showRemoteRun && (
                    <RemoteRunPanel
                      config={challenge.remoteRun}
                      {...remoteRun}
                      solved={submission.blocked}
                      preview={readOnly}
                      disabled={readOnly || Boolean(refreshError) || !remoteRun?.onSubmit}
                    />
                  )}
                  {showInstance && (
                    <>
                      <InstancePanel
                        instance={instance}
                        otherInstance={otherInstance}
                        error={instanceError}
                        pendingAction={pendingAction}
                      />
                      <InstanceControls
                        instance={instance}
                        otherInstance={otherInstance}
                        controls={controls}
                        unavailable={readOnly || instanceUnavailable}
                        pendingAction={pendingAction}
                        onAction={onInstanceAction}
                      />
                    </>
                  )}
                  <FlagSubmitPanel
                    value={flagValue}
                    onChange={onFlagChange}
                    onSubmit={onSubmitFlag}
                    disabled={readOnly || submitDisabled}
                    inputDisabled={
                      readOnly || pendingAction === "submit-flag" || submission.blocked
                    }
                    busy={pendingAction === "submit-flag"}
                    retrySeconds={retrySeconds}
                    solved={submission.blocked}
                    feedback={flagFeedback}
                  />
                </div>
              </div>
              {showDock && (
                <div className={styles.dock}>
                  {refreshError && (
                    <div className={styles.refreshNotice} role="status">
                      <p>
                        최신 상태를 불러오지 못해 마지막으로 확인한 문제를
                        표시하고 있습니다
                        <br />
                        <span>
                          다시 확인할 때까지 제출과 인스턴스 작업이 잠시
                          대기합니다
                        </span>
                      </p>
                      <button
                        type="button"
                        disabled={refreshing}
                        className={styles.noticeButton}
                        onClick={onRetry}
                      >
                        {refreshing ? "확인 중…" : "다시 확인"}
                      </button>
                    </div>
                  )}
                  {instanceError && (
                    <div className={styles.errorMessage}>
                      <p role="alert">{instanceError.message}</p>
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
                  <RequestFeedback feedback={instanceFeedback} />
                  {retrySeconds > 0 && (
                    <p id="flag-retry" className={styles.retryNotice}>
                      <strong>{retrySeconds}초</strong> 후 다시 제출할 수
                      있습니다
                    </p>
                  )}
                  {showBonus && (
                    <div className={styles.bonusNotice}>
                      <div>
                        <span>개방 후 보상 시간 </span>
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
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {flagFeedback && flagFeedback !== dismissedFeedback && (
        <FlagResultModal
          feedback={flagFeedback}
          onClose={() => setDismissedFeedback(flagFeedback)}
        />
      )}
      {!readOnly && confirmation && (
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
