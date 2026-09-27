import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import LeaderboardChart from "./LeaderboardChart.jsx";
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
    <main className={styles.page} data-leaderboard-source={dataStatus}>
      {/* 제목과 로고가 포함된 원화는 한 번만 그려 비율이 다른 화면에서도 중복되지 않게 한다 */}
      <FixedAspectStage className={styles.stage}>
        <div className={styles.designCanvas}>
          <img
            src={`${ASSET_BASE}leaderboard-layout.png`}
            alt=""
            aria-hidden="true"
            className={styles.leaderboardArtwork}
          />

          <button type="button" className={styles.backButton} onClick={onBack} aria-label="이전 페이지">
            <span className={styles.backIcon}>
              <img src={`${ASSET_BASE}icon-back.svg`} alt="" aria-hidden="true" />
            </span>
          </button>

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
            <RankingTable rankings={rankings} status={rankingStatus} />
          </section>
          {refreshError && <p className={styles.refreshNote} role="alert">
            일부 정보를 갱신하지 못했습니다 새로고침으로 다시 시도해주세요
          </p>}
          <p className={styles.srOnly} aria-live="polite">
            {dataStatus}
          </p>
        </div>
      </FixedAspectStage>
    </main>
  );
}
