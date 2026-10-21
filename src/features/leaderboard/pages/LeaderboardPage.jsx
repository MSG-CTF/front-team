import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard, getRankings } from "../../../api/leaderboard.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import LeaderboardScreen from "../components/LeaderboardScreen.jsx";
import { LEADERBOARD_PREVIEW_TEAMS, RANKING_PREVIEW_ROWS } from "../data/leaderboardPreview.js";
import { mergeSolveCounts } from "../utils/leaderboardData.js";
import { updateLeaderboardSnapshot } from "../utils/leaderboardSnapshot.js";

const USE_PREVIEW_DATA = import.meta.env.DEV && import.meta.env.VITE_LEADERBOARD_PREVIEW === "true";
const initialResource = (data) => USE_PREVIEW_DATA
  ? { status: "preview", data, error: false }
  : { status: "loading", data: [], error: false };

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => ({
    leaderboard: initialResource(LEADERBOARD_PREVIEW_TEAMS), ranking: initialResource(RANKING_PREVIEW_ROWS),
    page: 1, pageCount: USE_PREVIEW_DATA ? Math.ceil(RANKING_PREVIEW_ROWS.length / 6) : 1, updatedAt: null,
  }));
  const { leaderboard, ranking, pageCount, updatedAt } = snapshot;
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (USE_PREVIEW_DATA) return;
    let cancelled = false;
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    async function load() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getLeaderboard(config),
        getRankings({ page, size: 6 }, config),
      ]);
      if (cancelled) return;
      setSnapshot((current) => updateLeaderboardSnapshot(current, results, page, new Date().toISOString()));
      setRefreshing(false);
    }
    const stopPolling = startVisiblePolling(load);
    return () => {
      stopPolling();
      cancelled = true;
      controller.abort();
    };
  }, [page, revision]);

  useEffect(() => {
    if (!ranking.error && snapshot.page > pageCount) setPage(pageCount);
  }, [snapshot.page, pageCount, ranking.error]);

  const rankingRows = useMemo(() => USE_PREVIEW_DATA
    ? ranking.data.slice((page - 1) * 6, page * 6)
    : mergeSolveCounts(ranking.data, leaderboard.data, leaderboard.status === "success"),
  [ranking.data, leaderboard.data, leaderboard.status, page]);

  return <LeaderboardScreen
    teams={leaderboard.data} rankings={rankingRows}
    leaderboardStatus={leaderboard.status} rankingStatus={ranking.status}
    page={USE_PREVIEW_DATA ? page : snapshot.page} pageCount={pageCount}
    onPageChange={(value) => { setPage(value); setRevision((current) => current + 1); }}
    refreshing={refreshing} updatedAt={updatedAt}
    refreshError={leaderboard.error || ranking.error}
    onRefresh={() => setRevision((value) => value + 1)}
    onBack={() => navigate(ROUTES.board)}
  />;
}
