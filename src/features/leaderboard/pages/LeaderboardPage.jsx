import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard, getRankings } from "../../../api/leaderboard.js";
import { isSuccess } from "../../../utils/response.js";
import LeaderboardScreen from "../components/LeaderboardScreen.jsx";
import {
  LEADERBOARD_PREVIEW_TEAMS,
  RANKING_PREVIEW_ROWS,
} from "../data/leaderboardPreview.js";
import {
  adaptLeaderboardTeams,
  adaptRankingRows,
  mergeSolveCounts,
} from "../utils/leaderboardData.js";

const USE_PREVIEW_DATA = import.meta.env.VITE_LEADERBOARD_PREVIEW === "true";

const initialResource = (previewData) =>
  USE_PREVIEW_DATA
    ? { status: "preview", data: previewData }
    : { status: "loading", data: [] };

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState(() =>
    initialResource(LEADERBOARD_PREVIEW_TEAMS),
  );
  const [ranking, setRanking] = useState(() => initialResource(RANKING_PREVIEW_ROWS));

  useEffect(() => {
    if (USE_PREVIEW_DATA) return undefined;

    let cancelled = false;

    async function loadLeaderboard() {
      const [leaderboardResult, rankingResult] = await Promise.allSettled([
        getLeaderboard(),
        getRankings({ page: 1, size: 6 }),
      ]);

      if (cancelled) return;

      if (
        leaderboardResult.status === "fulfilled" &&
        isSuccess(leaderboardResult.value.data)
      ) {
        const teams = adaptLeaderboardTeams(leaderboardResult.value.data.data);
        setLeaderboard({ status: teams.length ? "success" : "empty", data: teams });
      } else {
        setLeaderboard({ status: "error", data: [] });
      }

      if (
        rankingResult.status === "fulfilled" &&
        isSuccess(rankingResult.value.data)
      ) {
        const rankings = adaptRankingRows(rankingResult.value.data.data);
        setRanking({ status: rankings.length ? "success" : "empty", data: rankings });
      } else {
        setRanking({ status: "error", data: [] });
      }
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const rankingRows = useMemo(
    () =>
      mergeSolveCounts(
        ranking.data,
        leaderboard.data,
        leaderboard.status === "success",
      ),
    [ranking.data, leaderboard.data, leaderboard.status],
  );

  return (
    <LeaderboardScreen
      teams={leaderboard.data}
      rankings={rankingRows}
      leaderboardStatus={leaderboard.status}
      rankingStatus={ranking.status}
      onBack={() => navigate(-1)}
    />
  );
}
