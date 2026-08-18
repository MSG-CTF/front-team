import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import BackButton from "./BackButton.jsx";
import ChallengeHeaderPanel from "./ChallengeHeaderPanel.jsx";
import ChallengeDescriptionPanel from "./ChallengeDescriptionPanel.jsx";
import InstancePanel from "./InstancePanel.jsx";
import FlagSubmitPanel from "./FlagSubmitPanel.jsx";

// Figma node 104:459 "킹힐(=King of the Hill/KOTH) 문제풀이" — bg-1920x1080.png는
// 배경(뷰포트에 자유롭게 반응형으로 채워짐, object-cover)으로만 쓰고, 카드
// 안쪽의 실제 패널(header/description/instance/flag)들만 FixedAspectStage의
// 무대(항상 정확한 16:9) 위에서 그 자체로 반응형인 "프레임 컴포넌트"로 그린다.
// bg 이미지를 무대 안에 한 번 더 선명하게 겹치면(= foregroundSrc) 두 레이어의
// 축소 비율이 서로 달라 카드 그림이 두 겹으로 겹쳐 보이므로 쓰지 않는다.
export default function ChallengeDetailScreen({
  challenge,
  instance,
  flagValue,
  onFlagChange,
  onSubmitFlag,
  onBack,
  submitDisabled,
}) {
  return (
    <FixedAspectStage backdropSrc="/assets/challenge-detail/bg-1920x1080.png">
      <BackButton onClick={onBack} />
      <ChallengeHeaderPanel challenge={challenge} />
      <ChallengeDescriptionPanel description={challenge.description} attachments={challenge.attachments} />
      <InstancePanel instance={instance} />
      <FlagSubmitPanel
        value={flagValue}
        onChange={onFlagChange}
        onSubmit={onSubmitFlag}
        disabled={submitDisabled}
      />
    </FixedAspectStage>
  );
}
