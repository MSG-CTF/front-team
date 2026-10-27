import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { formatNumber } from "../utils/myPageData.js";
import MileageHistoryTable from "./MileageHistoryTable.jsx";
import SolveHistoryTable from "./SolveHistoryTable.jsx";
import TeamInfoCard from "./TeamInfoCard.jsx";
import styles from "./MyPageScene.module.css";
import PanelTexture from "../../../components/common/PanelTexture.jsx";

function profileText(state, field) {
  if (state.status === "loading") return "LOADING";
  if (state.status === "error") return "ERROR";
  return state.status === "success" ? formatNumber(state.data[field]) : "-";
}

function statusMessage({ profileData, noTeam, hasScore, scoreRefreshError, refreshError, logoutError }) {
  if (logoutError) return { text: logoutError, alert: true };
  if (noTeam) return { text: "소속된 팀이 없습니다 운영자에게 문의해주세요", alert: false };
  if (profileData.isBanned) return { text: "활동 정지: " + (profileData.banReason || "운영자에게 문의하세요"), alert: true };
  if (scoreRefreshError) return { text: hasScore
    ? "점수와 순위를 갱신하지 못했습니다 마지막으로 확인한 값을 표시합니다"
    : "점수와 순위를 불러오지 못했습니다 새로고침으로 다시 시도해주세요", alert: true };
  if (refreshError) return { text: "일부 정보를 갱신하지 못했습니다 다시 시도하세요", alert: true };
  return { text: "30초마다 갱신 · 표시 시간 KST", alert: false };
}

// Figma 28:94 MyPage. 데스크톱은 1920×1080 무대 한 화면(스크롤 없음), 좁은 화면은 세로로 쌓인다
export default function MyPageScreen({
  profile,
  mileageHistory,
  solveHistory,
  memberRanking,
  onLogout,
  isLoggingOut,
  logoutError,
  qrState,
  onIssueQr,
  qrDisabled,
  onRefresh,
  refreshing,
  refreshError,
  scoreRefreshError,
}) {
  const navigate = useNavigate();
  const profileData = profile.status === "success" ? profile.data : {};
  const status = statusMessage({ profileData, noTeam: profile.status === "noTeam", hasScore: profile.status === "success", scoreRefreshError, refreshError, logoutError });
  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.boardFrame} aria-hidden="true" />
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(ROUTES.board)}
          aria-label="보드로 돌아가기"
          title="보드로 돌아가기"
        >
          <img src="/assets/mypage/icon-back.svg" alt="" aria-hidden="true" />
        </button>
        <main className={styles.board} aria-label="마이 페이지">
          <PanelTexture material="paper" />
          <div className={styles.statusBar}>
            <p className={status.alert ? styles.statusAlert : undefined} role={status.alert ? "alert" : undefined}>
              {status.text}
            </p>
            <div className={styles.statusActions}>
              <button type="button" className={styles.refreshButton} disabled={refreshing} onClick={onRefresh}>
                새로고침
              </button>
              {/* 보드 화면 오른쪽 위에서 쓰는 로그아웃 동전을 그대로 가져왔다 */}
              <button type="button" className={styles.logoutCoin} onClick={onLogout} disabled={isLoggingOut} aria-label="로그아웃" title="로그아웃">
                <svg viewBox="69 29 96 94" aria-hidden="true" focusable="false">
                  <image href="/assets/board/nav-logout.webp" width="235" height="157" />
                </svg>
              </button>
            </div>
          </div>
          <TeamInfoCard
            profile={profile}
            memberRanking={memberRanking}
            qrState={qrState}
            onIssueQr={onIssueQr}
            qrDisabled={qrDisabled}
          />
          <section className={`${styles.metricPanel} ${styles.scorePanel}`} aria-label="팀 점수">
            <PanelTexture />
            <h2 className={styles.bakedLabel}>CURRENT SCORE</h2>
            <p className={styles.metricValue}>{profileText(profile, "score")}</p>
            <p className={styles.breakdown}>
              <span>JEOPARDY {formatNumber(profileData.jeopardyScore)}</span>
              <span>KoTH {formatNumber(profileData.kothScore)}</span>
              <span>SIGNATURE {formatNumber(profileData.signatureScore)}</span>
              <span>LINE {formatNumber(profileData.lineScore)}</span>
            </p>
            <p className={styles.rank}>
              RANK<strong>{profile.status === "success" ? formatNumber(profileData.rank) : "-"}</strong>
            </p>
          </section>
          <section className={`${styles.metricPanel} ${styles.mileagePanel}`} aria-label="마일리지 잔액">
            <PanelTexture />
            <h2 className={styles.bakedLabel}>MILEAGE</h2>
            <p className={styles.metricValue}>{profileText(profile, "mileage")}</p>
            <span className={styles.unit}>MI</span>
          </section>
          <MileageHistoryTable state={mileageHistory} />
          <SolveHistoryTable state={solveHistory} />
        </main>
      </div>
    </div>
  );
}
