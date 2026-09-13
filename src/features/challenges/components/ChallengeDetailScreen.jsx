import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import BackButton from "./BackButton.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import InstanceControls from "./InstanceControls.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";
import { formatRemaining, getChallengeDeadline, toKst } from "../../../utils/time.js";

// Figma node 95:360 "ChallengeDetailPage" (1920x1080).
// bg-1920x1080.png = 뒤 배경(Background 193:16)만 담은 프레임 없는 그림이고,
// 카드 프레임(board_panel 193:62)은 panel-board.png로 분리해 무대(children) 안에서
// 그린다. 배경은 뷰포트를 object-cover로 자유롭게 채우지만 카드 프레임과 안쪽
// 패널들은 같은 16:9 무대 위 % 좌표를 쓰므로, 창 비율이 16:9가 아니어도 프레임이
// 패널들과 함께 축소되며 항상 패널들을 감싼다.
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
    <FixedAspectStage backdropSrc="/assets/challenge-detail/bg-1920x1080.png">
      {/* board_panel 193:62 - 카드 프레임 (canvas 100/114/1720/870) */}
      <div
        aria-hidden="true"
        className="absolute left-[5.208%] top-[10.556%] w-[89.583%] h-[80.556%]"
      >
        <img
          src="/assets/challenge-detail/panel-board.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      </div>
      <BackButton onClick={onBack} />

      {loading && (
        <section
          className="absolute left-[34%] top-[39%] z-10 w-[32%] border border-auth-text/50 bg-[#ead3a8]/95 px-[2cqw] py-[1.4cqw] text-center font-im-fell text-[1.3cqw] text-auth-text shadow-xl"
          role="status"
        >
          문제 정보를 불러오는 중입니다.
        </section>
      )}

      {pageError && (
        <section
          className="absolute left-[34%] top-[36%] z-10 w-[32%] border border-auth-text/50 bg-[#ead3a8]/95 px-[2cqw] py-[1.4cqw] text-center font-im-fell text-auth-text shadow-xl"
          role="alert"
        >
          <p className="m-0 text-[1.3cqw]">{pageError.message}</p>
          <p className="mt-[0.4cqw] font-kode-mono text-[0.75cqw]">{pageError.code}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-[0.9cqw] border border-auth-text bg-auth-text px-[1.1cqw] py-[0.45cqw] font-kode-mono text-[0.75cqw] text-[#ead3a8]"
          >
            다시 시도
          </button>
        </section>
      )}

      {challenge && !loading && !pageError && (
        <>
          <ChallengeHeaderPanel challenge={challenge} />
          <ChallengeDescriptionPanel
            description={challenge.description}
            attachments={challenge.attachments}
          />
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
          <FlagSubmitPanel
            value={flagValue}
            onChange={onFlagChange}
            onSubmit={onSubmitFlag}
            disabled={submitDisabled}
            inputDisabled={actionPending || submission.blocked}
          />

          <div className="absolute left-[61.77%] top-[72%] w-[28%] font-kode-mono text-[0.75cqw] leading-tight text-auth-text">
            {challenge.accessStatus === "OPENED" && <span>OPENED (진행 중) </span>}
            {submission.isCleared && <span>CLEARED (완료) </span>}
            {submission.remainingSeconds != null && (
              <span title={`개방: ${toKst(challenge.openedAt)} / 마감: ${toKst(getChallengeDeadline(challenge.openedAt))} (KST)`}>
                추가 주사위 보상 {formatRemaining(submission.remainingSeconds)}
                {submission.expired && " (보상 종료, 제출 가능)"}
              </span>
            )}
          </div>

          {retrySeconds > 0 && (
            <p role="status" className="absolute left-[61.77%] top-[85%] font-kode-mono text-[0.75cqw] text-auth-text">재제출까지 {retrySeconds}초</p>
          )}

          {(instanceError || feedback) && (
            <div
              className="absolute left-[59.32%] top-[88.1%] z-10 w-[33.33%] font-kode-mono text-[0.7cqw] leading-tight text-auth-text"
              role={instanceError || feedback?.type === "error" ? "alert" : "status"}
            >
              {instanceError && (
                <p className="m-0">
                  {instanceError.message} ({instanceError.code})
                </p>
              )}
              {feedback && (
                <p className="m-0">
                  {feedback.message} ({feedback.code})
                </p>
              )}
            </div>
          )}
        </>
      )}
    </FixedAspectStage>
  );
}
