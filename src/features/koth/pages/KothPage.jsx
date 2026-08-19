import { useMemo, useState } from "react";
import KothScreen from "../components/KothScreen.jsx";
import {
  EMPTY_KOTH_DATA,
  KOTH_CHALLENGE_VISUALS,
  KOTH_COMPLETION_STAMPS,
} from "../config/kothVisualConfig.js";
import {
  createKothChallengeViewModels,
  getKothStampVisibility,
} from "../utils/kothChallengeState.js";

export default function KothPage() {
  // 백엔드 연결 전 1차 UI 상태. 추후 /koth/clubs와 /koth/me의 data를 그대로
  // 이 state에 넣으면 view model과 도장 조건만 갱신되도록 화면과 분리한다.
  const [kothData] = useState(EMPTY_KOTH_DATA);

  const challenges = useMemo(
    () => createKothChallengeViewModels(
      KOTH_CHALLENGE_VISUALS,
      kothData.clubs,
      kothData.teamChallenges,
    ),
    [kothData],
  );

  // TODO(koth): 도장 ↔ koth_challenge_id 매핑이 확정되면 /koth/me의
  // solved_at을 isKothChallengeSolved로 해석해 stamp key별 값만 전달한다.
  const stampVisibility = useMemo(
    () => getKothStampVisibility(KOTH_COMPLETION_STAMPS),
    [],
  );

  const handleSelectChallenge = (selectedChallenge) => {
    if (!selectedChallenge.kothChallengeId) return;

    // TODO(koth): KOTH Problem Solve Page route가 구현되면
    // selectedChallenge.kothChallengeId와 selectedChallenge.clubId를 전달한다.
    // 일반 /challenges/:challengeId와 동일한 페이지라고 가정하지 않는다.
  };

  const handleNavigateMain = () => {
    // TODO(koth): 별도 Main Page route가 구현되면 이 handler에서 연결한다.
    // 현재 /board를 Main Page로 간주하지 않는다.
  };

  return (
    <KothScreen
      challenges={challenges}
      stampVisibility={stampVisibility}
      onSelectChallenge={handleSelectChallenge}
      onNavigateMain={handleNavigateMain}
    />
  );
}
