import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import BackButton from "./BackButton.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import InstanceControls from "./InstanceControls.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";

// Figma node 95:360 "ChallengeDetailPage" (1920x1080). bg-1920x1080.png = 뒤 배경
// (Background 193:16) + 카드 프레임(board_panel 193:62)을 합성한 것. 뷰포트에
// object-cover로 채우고, 카드 안쪽 패널들만 정확한 16:9 무대 위에서 % 좌표로 그린다.
export default function ChallengeDetailScreen({
  challenge,
  instance,
  flagValue,
  onFlagChange,
  onSubmitFlag,
  onBack,
  onCreateInstance,
  onExtendInstance,
  onRestartInstance,
  submitDisabled,
}) {
  return (
    <FixedAspectStage backdropSrc="/assets/challenge-detail/bg-1920x1080.png">
      <BackButton onClick={onBack} />
      <ChallengeHeaderPanel challenge={challenge} />
      <ChallengeDescriptionPanel
        description={challenge.description}
        attachments={challenge.attachments}
      />
      <InstancePanel instance={instance} />
      <InstanceControls
        instance={instance}
        onCreate={onCreateInstance}
        onExtend={onExtendInstance}
        onRestart={onRestartInstance}
      />
      <FlagSubmitPanel
        value={flagValue}
        onChange={onFlagChange}
        onSubmit={onSubmitFlag}
        disabled={submitDisabled}
      />
    </FixedAspectStage>
  );
}
