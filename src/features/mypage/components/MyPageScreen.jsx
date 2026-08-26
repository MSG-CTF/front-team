import { useNavigate } from "react-router-dom";
import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import { formatNumber } from "../utils/myPageData.js";
import MileageHistoryTable from "./MileageHistoryTable.jsx";
import SolveHistoryTable from "./SolveHistoryTable.jsx";
import TeamInfoCard from "./TeamInfoCard.jsx";
import styles from "./MyPageScreen.module.css";

const BASE_URL = import.meta.env.BASE_URL;
const ASSET_BASE = `${BASE_URL}assets/mypage/`;

const ASSETS = Object.freeze({
  background: `${ASSET_BASE}background.png`,
  teamPanel: `${ASSET_BASE}team-info-card.png`,
  teamCleanSource: `${ASSET_BASE}team-cleared-source.png`,
  scorePanel: `${ASSET_BASE}panel-score.png`,
  mileagePanel: `${ASSET_BASE}panel-mileage.png`,
  mileageHistoryPanel: `${ASSET_BASE}mileage-history-panel.png`,
  solveHistoryPanel: `${ASSET_BASE}solve-history-panel.png`,
  backIcon: `${ASSET_BASE}icon-back.svg`,
});

function profileText(state, field) {
  if (state.status === "loading") return "LOADING";
  if (state.status === "error") return "ERROR";
  if (state.status !== "success") return "—";
  return formatNumber(state.data[field]);
}

export default function MyPageScreen({ profile, mileageHistory, solveHistory }) {
  const navigate = useNavigate();
  const profileData = profile.status === "success" ? profile.data : {};

  return (
    <FixedAspectStage backdropSrc={ASSETS.background} className={styles.stageViewport}>
      <main className={styles.canvas} aria-label="마이 페이지">
        <img
          src={ASSETS.scorePanel}
          alt=""
          aria-hidden="true"
          className={styles.scorePanel}
        />
        <img
          src={ASSETS.mileagePanel}
          alt=""
          aria-hidden="true"
          className={styles.mileagePanel}
        />

        <TeamInfoCard
          panelSrc={ASSETS.teamPanel}
          cleanTeamSourceSrc={ASSETS.teamCleanSource}
          teamName={profileData.teamName}
          members={profileData.members ?? []}
          status={profile.status}
        />

        <p className={`${styles.metricValue} ${styles.scoreValue}`}>
          {profileText(profile, "score")}
        </p>
        <p className={`${styles.metricValue} ${styles.mileageValue}`}>
          {profileText(profile, "mileage")}
        </p>
        <p className={styles.rankLabel}>RANK</p>
        <p className={styles.rankValue}>
          {profile.status === "success" ? formatNumber(profileData.rank) : "—"}
        </p>

        <MileageHistoryTable panelSrc={ASSETS.mileageHistoryPanel} state={mileageHistory} />
        <SolveHistoryTable panelSrc={ASSETS.solveHistoryPanel} state={solveHistory} />

        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="이전 페이지로 이동"
        >
          <img src={ASSETS.backIcon} alt="" aria-hidden="true" className={styles.backIcon} />
        </button>
      </main>
    </FixedAspectStage>
  );
}
