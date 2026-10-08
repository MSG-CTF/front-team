import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { formatNumber } from "../utils/myPageData.js";
import MileageHistoryTable from "./MileageHistoryTable.jsx";
import SolveHistoryTable from "./SolveHistoryTable.jsx";
import TeamInfoCard from "./TeamInfoCard.jsx";
import styles from "./MyPageScene.module.css";

function profileText(state, field) {
  if (state.status === "loading") return "LOADING";
  if (state.status === "error") return "ERROR";
  return state.status === "success" ? formatNumber(state.data[field]) : "—";
}

function statusMessage({ profileData, refreshError, logoutError }) {
  if (logoutError) return { text: logoutError, alert: true };
  if (profileData.isBanned) return { text: "활동 정지: " + (profileData.banReason || "운영자에게 문의하세요"), alert: true };
  if (refreshError) return { text: "일부 정보를 갱신하지 못했습니다. 다시 시도하세요", alert: true };
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
}) {
  const navigate = useNavigate();
  const profileData = profile.status === "success" ? profile.data : {};
  const status = statusMessage({ profileData, refreshError, logoutError });
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
          <div className={styles.statusBar}>
            <p className={status.alert ? styles.statusAlert : undefined} role={status.alert ? "alert" : undefined}>
              {status.text}
            </p>
            <button type="button" className={styles.refreshButton} disabled={refreshing} onClick={onRefresh}>
              새로고침
            </button>
          </div>
          <TeamInfoCard
            profile={profile}
            memberRanking={memberRanking}
            qrState={qrState}
            onIssueQr={onIssueQr}
            qrDisabled={qrDisabled}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
          />
          <section className={`${styles.metricPanel} ${styles.scorePanel}`} aria-label="팀 점수">
            <h2 className={styles.bakedLabel}>CURRENT SCORE</h2>
            <p className={styles.metricValue}>{profileText(profile, "score")}</p>
            <p className={styles.breakdown}>
              JEOPARDY {formatNumber(profileData.jeopardyScore)} · KoTH {formatNumber(profileData.kothScore)} · SIGNATURE {formatNumber(profileData.signatureScore)}
            </p>
            <p className={styles.rank}>
              RANK<strong>{profile.status === "success" ? formatNumber(profileData.rank) : "—"}</strong>
            </p>
          </section>
          <section className={`${styles.metricPanel} ${styles.mileagePanel}`} aria-label="마일리지 잔액">
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
