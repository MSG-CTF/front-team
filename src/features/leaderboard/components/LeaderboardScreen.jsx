import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import LeaderboardChart from "./LeaderboardChart.jsx";
import RankingTable from "./RankingTable.jsx";
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
}) {
  const dataStatus = `leaderboard:${leaderboardStatus}; ranking:${rankingStatus}`;

  return (
    <main className={styles.page} data-leaderboard-source={dataStatus}>
      <FixedAspectStage className={styles.stage}>
        <div className={styles.designCanvas}>
          <img
            src={`${ASSET_BASE}leaderboard.png`}
            alt=""
            aria-hidden="true"
            className={styles.leaderboardArtwork}
          />

          <button type="button" className={styles.backButton} onClick={onBack} aria-label="이전 페이지">
            <span className={styles.backIcon}>
              <img src={`${ASSET_BASE}icon-back.svg`} alt="" aria-hidden="true" />
            </span>
          </button>

          <ScoreBoard staticAssetSrc={`${ASSET_BASE}score.png`} />
          <LeaderboardChart teams={teams} status={leaderboardStatus} />
          <RankingTable rankings={rankings} status={rankingStatus} />

          <p className={styles.srOnly} aria-live="polite">
            {dataStatus}
          </p>
        </div>
      </FixedAspectStage>
    </main>
  );
}
