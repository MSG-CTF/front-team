import LeaderboardChart from "./LeaderboardChart.jsx";
import LeaderboardArtwork, { LeaderboardTitle, LeaderboardMobilePaper, LeaderboardFooter } from "./LeaderboardArtwork.jsx";
import LeaderboardScoreGraph from "./LeaderboardScoreGraph.jsx";
import RankingTable from "./RankingTable.jsx";
import RankingToolbar from "./RankingToolbar.jsx";
import ScoreBoard from "./ScoreBoard.jsx";
import styles from "./LeaderboardScreen.module.css";

const BASE_URL = import.meta.env.BASE_URL;
const ASSET_BASE = `${BASE_URL}assets/leaderboard/`;

export default function LeaderboardScreen({
  teams,
  rankings,
  leaderboardStatus,
  rankingStatus,
  onBack,
  page = 1, pageCount = 1, onPageChange, refreshing, updatedAt, refreshError, onRefresh,
}) {
  const dataStatus = `leaderboard:${leaderboardStatus}; ranking:${rankingStatus}`;
  return (
    <>
      <main id="leaderboard-viewport" className={styles.page} data-leaderboard-source={dataStatus}>
        {/* 풍경은 페이지 전체에 이어지고, 모바일에서는 종이 안의 내용을 읽기 크기로 재배치한다. */}
        <div className={styles.stage}>
          <div className={styles.designCanvas}>
            <LeaderboardArtwork />

            <button type="button" className={styles.backButton} onClick={onBack} aria-label="이전 페이지">
              <span className={styles.backIcon}>
                <img src={`${ASSET_BASE}icon-back.svg`} alt="" aria-hidden="true" />
              </span>
            </button>

            <h1 className={`${styles.srOnly} ${styles.responsiveTitle}`}><span className={styles.srOnly}>SCOREBOARD</span><LeaderboardTitle /></h1>
            <div className={styles.responsivePaper}>
              <LeaderboardMobilePaper />
              <ScoreBoard
                staticAssetSrc={`${ASSET_BASE}score.png`}
                dynamicGraph={
                  <LeaderboardScoreGraph teams={teams} status={leaderboardStatus} />
                }
              />
              <LeaderboardChart teams={teams} status={leaderboardStatus} />
              <section className={styles.rankingPanel} aria-label="팀 순위">
                <RankingToolbar page={page} pageCount={pageCount} onPageChange={onPageChange}
                  refreshing={refreshing} updatedAt={updatedAt} onRefresh={onRefresh} />
                <p className={styles.mobileTableHint}>좌우로 밀어 모든 분야의 점수를 확인하세요</p>
                <RankingTable rankings={rankings} status={rankingStatus} />
              </section>
              {refreshError && <p className={styles.refreshNote} role="alert">
                {leaderboardStatus === "success" || leaderboardStatus === "empty"
                  ? "점수와 순위를 갱신하지 못했습니다 마지막으로 확인한 값을 표시합니다"
                  : "점수와 순위를 불러오지 못했습니다 새로고침으로 다시 시도해주세요"}
              </p>}
            </div>
            <LeaderboardFooter />
            <p className={styles.srOnly} aria-live="polite">
              {dataStatus}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
