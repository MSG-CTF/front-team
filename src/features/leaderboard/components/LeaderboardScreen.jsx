import { toKst } from "../../../utils/time.js";
import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import LeaderboardChart from "./LeaderboardChart.jsx";
import LeaderboardScoreGraph from "./LeaderboardScoreGraph.jsx";
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
  page = 1, pageCount = 1, onPageChange, refreshing, updatedAt, refreshError, onRefresh,
}) {
  const dataStatus = `leaderboard:${leaderboardStatus}; ranking:${rankingStatus}`;
  const isPreview = leaderboardStatus === "preview";

  return (
    <main className={styles.page} data-leaderboard-source={dataStatus}>
      {/* backdropSrc 없이는 뷰포트가 정확히 16:9가 아닐 때(초광폭/좁은 창) 무대
          양옆(또는 위아래)에 .page의 배경색이 그대로 비쳐 흰 여백처럼 보인다.
          BoardScreen과 동일하게 같은 그림을 배경으로도 깔아 그 틈을 채운다 -
          이 그림은 로그인 카드처럼 딱 맞는 테두리가 있는 그림이 아니라 화면
          전체를 덮는 풍경이라 두 레이어가 서로 다르게 잘려도 자연스럽다. */}
      <FixedAspectStage backdropSrc={`${ASSET_BASE}leaderboard.png`} className={styles.stage}>
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

          <ScoreBoard
            staticAssetSrc={`${ASSET_BASE}score.png`}
            dynamicGraph={
              isPreview ? null : (
                <LeaderboardScoreGraph teams={teams} status={leaderboardStatus} />
              )
            }
          />
          <LeaderboardChart teams={teams} status={leaderboardStatus} />
          <RankingTable rankings={rankings} status={rankingStatus} />

          <div className={styles.pagination} aria-label="순위 페이지">
            <button type="button" disabled={refreshing || page <= 1} onClick={() => onPageChange(page - 1)}>이전</button>
            <span>{page} / {pageCount}</span>
            <button type="button" disabled={refreshing || page >= pageCount} onClick={() => onPageChange(page + 1)}>다음</button>
            <button type="button" disabled={refreshing} onClick={onRefresh}>새로고침</button>
            <span>{updatedAt ? `조회 ${toKst(updatedAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" })} KST` : ""}</span>
          </div>
          <p className={styles.refreshNote} role={refreshError ? "alert" : undefined}>
            {refreshError ? "일부 정보를 갱신하지 못했습니다. 새로고침으로 다시 시도하세요" : "점수는 조회 시점 기준이며 30초마다 갱신됩니다"}
          </p>
          <p className={styles.srOnly} aria-live="polite">
            {dataStatus}
          </p>
        </div>
      </FixedAspectStage>
    </main>
  );
}
