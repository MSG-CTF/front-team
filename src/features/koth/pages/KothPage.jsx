import { useEffect, useMemo, useState } from "react";
import KothScreen from "../components/KothScreen.jsx";
import { KOTH_CHALLENGE_VISUALS } from "../config/kothVisualConfig.js";
import {
  useKothData,
  useKothTeamToken,
  useKothLeaderboard,
  useKothClubDetail,
} from "../hooks/useKothData.js";
import {
  createKothChallengeViewModels,
  flattenKothChallenges,
  getUnmappedKothChallenges,
  applyKothClubDetail,
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
  const selectedListChallenge = challenges.find(
    (challenge) => challenge.kothChallengeId === selectedChallengeId,
  ) ?? null;
  const clubDetail = useKothClubDetail(selectedListChallenge?.clubId, selectedChallengeId);
  const selectedChallenge = applyKothClubDetail(selectedListChallenge, clubDetail.data) ?? selectedListChallenge;

  const problemRanking = useKothLeaderboard(selectedChallengeId, kothData.authenticated);

  const { clearTeamToken, requestTeamToken } = teamToken;

  // 문제를 바꾸거나 닫으면 이전 문제의 토큰 표시와 진행 중인 요청을 버린다
  useEffect(() => {
    setIsTeamTokenOpen(false);
    clearTeamToken();
  }, [selectedChallengeId, clearTeamToken]);

  const handleOpenTeamToken = () => {
    if (!selectedChallengeId) return;
    setIsTeamTokenOpen(true);
    requestTeamToken(selectedChallengeId);
  };

  const handleRetryTeamToken = () => requestTeamToken(selectedChallengeId);

  const handleCloseTeamToken = () => {
    setIsTeamTokenOpen(false);
    clearTeamToken();
  };

  const handleSelectChallenge = (challenge) => {
    setSelectedChallengeId(challenge.kothChallengeId);
  };

  return (
    <KothScreen
      requestStatus={kothData.status}
      requestError={kothData.error}
      authenticated={kothData.authenticated}
      clubsStale={kothData.clubsStale}
      progressError={kothData.progressError}
      problemRanking={problemRanking}
      challenges={challenges}
      isEmpty={kothData.status === "success" && allChallenges.length === 0}
      unmappedChallengeCount={unmappedChallengeCount}
      teamId={kothData.progressData?.team_id ?? null}
      teamName={kothData.progressData?.team_name ?? ""}
      totalKothScore={kothData.progressData?.total_koth_score ?? null}
      selectedChallenge={selectedChallenge}
      clubDetail={clubDetail}
      isTeamTokenOpen={isTeamTokenOpen}
      teamToken={teamToken}
      onRetry={kothData.retry}
      onSelectChallenge={handleSelectChallenge}
      onCloseChallenge={() => setSelectedChallengeId(null)}
      onOpenTeamToken={handleOpenTeamToken}
      onRetryTeamToken={handleRetryTeamToken}
      onCloseTeamToken={handleCloseTeamToken}
    />
  );
}
