import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard, getRankings } from "../../../api/leaderboard.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import LeaderboardScreen from "../components/LeaderboardScreen.jsx";
import { LEADERBOARD_PREVIEW_TEAMS, RANKING_PREVIEW_ROWS } from "../data/leaderboardPreview.js";
import { adaptLeaderboardTeams, adaptRankingRows, mergeSolveCounts } from "../utils/leaderboardData.js";

const USE_PREVIEW_DATA = import.meta.env.DEV && import.meta.env.VITE_LEADERBOARD_PREVIEW === "true";
const initialResource = (data) => USE_PREVIEW_DATA
  ? { status: "preview", data, error: false }
  : { status: "loading", data: [], error: false };

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState(() => initialResource(LEADERBOARD_PREVIEW_TEAMS));
  const [ranking, setRanking] = useState(() => initialResource(RANKING_PREVIEW_ROWS));
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    if (USE_PREVIEW_DATA) return;
    let cancelled = false;
    let timer;
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    setRanking({ status: "loading", data: [], error: false });
    async function load() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getLeaderboard(config),
        getRankings({ page, size: 6 }, config),
      ]);
      if (cancelled) return;
      let allSucceeded = true;
      results.forEach((result, index) => {
        const setter = index === 0 ? setLeaderboard : setRanking;
        const envelope = result.status === "fulfilled" ? result.value.data : null;
        const arrayKey = index === 0 ? "teams" : "rankings";
        if (isSuccess(envelope) && Array.isArray(envelope.data?.[arrayKey])) {
          const data = index === 0 ? adaptLeaderboardTeams(envelope.data) : adaptRankingRows(envelope.data);
          setter({ status: data.length ? "success" : "empty", data, error: false });
          if (index === 1) {
            const count = Math.max(1, Math.ceil((envelope.data.total_count || 0) / 6));
            setPageCount(count);
            if (page > count) setPage(count);
          }
        } else {
          allSucceeded = false;
          setter((current) => ({
            ...current, status: current.data.length ? "success" : "error", error: true,
          }));
        }
      });
      if (allSucceeded) setUpdatedAt(new Date().toISOString());
      setRefreshing(false);
      timer = window.setTimeout(load, 30000);
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [page, revision]);

  const rankingRows = useMemo(() => mergeSolveCounts(
    ranking.data, leaderboard.data, leaderboard.status === "success",
  ), [ranking.data, leaderboard.data, leaderboard.status]);

  return <LeaderboardScreen
    teams={leaderboard.data} rankings={rankingRows}
    leaderboardStatus={leaderboard.status} rankingStatus={ranking.status}
    page={page} pageCount={pageCount} onPageChange={setPage}
    refreshing={refreshing} updatedAt={updatedAt}
    refreshError={leaderboard.error || ranking.error}
    onRefresh={() => setRevision((value) => value + 1)}
    onBack={() => navigate(ROUTES.board)}
  />;
}
