import { useMemo, useState } from "react";
import KothScreen from "../components/KothScreen.jsx";
import { KOTH_CHALLENGE_VISUALS } from "../config/kothVisualConfig.js";
import {
  useKothData,
  useKothTeamToken,
} from "../hooks/useKothData.js";
import {
  createKothChallengeViewModels,
  flattenKothChallenges,
  getUnmappedKothChallenges,
} from "../utils/kothChallengeState.js";

export default function KothPage() {
  const kothData = useKothData();
  const teamToken = useKothTeamToken();
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [isTeamTokenOpen, setIsTeamTokenOpen] = useState(false);

  const clubs = kothData.clubsData?.clubs ?? [];
  const teamChallenges = kothData.progressData?.challenges ?? [];
  const allChallenges = useMemo(
    () => flattenKothChallenges(clubs),
    [clubs],
  );
  const challenges = useMemo(
    () => createKothChallengeViewModels(
      KOTH_CHALLENGE_VISUALS,
      clubs,
      teamChallenges,
    ),
    [clubs, teamChallenges],
  );
  const unmappedChallengeCount = useMemo(
    () => getUnmappedKothChallenges(KOTH_CHALLENGE_VISUALS, clubs).length,
    [clubs],
  );
  const selectedChallenge = challenges.find(
    (challenge) => challenge.kothChallengeId === selectedChallengeId,
  ) ?? null;

  const handleOpenTeamToken = () => {
    setIsTeamTokenOpen(true);
    teamToken.requestTeamToken();
  };

  const handleCloseTeamToken = () => {
    setIsTeamTokenOpen(false);
    teamToken.clearTeamToken();
  };

  const handleSelectChallenge = (challenge) => {
    setSelectedChallengeId(challenge.kothChallengeId);
  };

  return (
    <KothScreen
      requestStatus={kothData.status}
      requestError={kothData.error}
      challenges={challenges}
      isEmpty={kothData.status === "success" && allChallenges.length === 0}
      unmappedChallengeCount={unmappedChallengeCount}
      teamName={kothData.progressData?.team_name ?? ""}
      totalKothScore={kothData.progressData?.total_koth_score ?? null}
      selectedChallenge={selectedChallenge}
      isTeamTokenOpen={isTeamTokenOpen}
      teamToken={teamToken}
      onRetry={kothData.retry}
      onSelectChallenge={handleSelectChallenge}
      onCloseChallenge={() => setSelectedChallengeId(null)}
      onOpenTeamToken={handleOpenTeamToken}
      onCloseTeamToken={handleCloseTeamToken}
    />
  );
}
