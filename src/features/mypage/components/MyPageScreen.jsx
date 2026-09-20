import { ROUTES } from "../../../routes/routePaths.js";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { formatNumber } from "../utils/myPageData.js";
import MileageHistoryTable from "./MileageHistoryTable.jsx";
import SolveHistoryTable from "./SolveHistoryTable.jsx";
import TeamInfoCard from "./TeamInfoCard.jsx";
import styles from "./MyPageScreen.module.css";

const ASSET_BASE = import.meta.env.BASE_URL + "assets/mypage/";

function profileText(state, field) {
  if (state.status === "loading") return "LOADING";
  if (state.status === "error") return "ERROR";
  return state.status === "success" ? formatNumber(state.data[field]) : "—";
}

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
  const showQr =
    qrState.status === "success" &&
    Boolean(qrState.paymentToken) &&
    Boolean(qrState.expiresAt) &&
    qrState.remainingSeconds > 0;
  return (
    <div className={styles.page}>
      <main className={styles.board} aria-label="마이 페이지">
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(ROUTES.board)}
          aria-label="이전 페이지로 이동"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="m10 5-7 7 7 7M3 12h18" />
          </svg>
          보드로 돌아가기
        </button>
        <div className={styles.layout}>
          <TeamInfoCard
            panelSrc={ASSET_BASE + "team-info-card.png"}
            teamName={profileData.teamName}
            members={profileData.members ?? []}
            status={profile.status}
            footer={
              <div className={styles.teamFooter}>
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={onLogout}
                  disabled={isLoggingOut}
                >
                  로그아웃
                </button>
                {logoutError && (
                  <p className={styles.logoutError} role="alert">
                    {logoutError}
                  </p>
                )}
              </div>
            }
          >
            <section
              className={styles.qrSlot}
              aria-label={
                showQr
                  ? "결제 QR 코드, " + qrState.remainingSeconds + "초 후 만료"
                  : "결제 QR 코드"
              }
            >
              {showQr && (
                <QRCodeSVG
                  value={qrState.paymentToken}
                  size={160}
                  marginSize={4}
                  className={styles.qrCode}
                />
              )}
              {qrState.status === "loading" && (
                <p className={styles.qrStatus}>QR 발급 중</p>
              )}
              {!showQr && qrState.status !== "loading" && (
                <button
                  type="button"
                  className={styles.qrIssueButton}
                  onClick={onIssueQr}
                  disabled={qrDisabled}
                >
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M3 3h10v10H3zM19 3h10v10H19zM3 19h10v10H3zM19 19h4v4h6v6h-6M19 25v4M29 19v2M7 7h2v2H7zM23 7h2v2h-2zM7 23h2v2H7z" />
                  </svg>
                  <span>
                    {qrState.status === "idle"
                      ? "결제 QR 발급"
                      : "QR 다시 발급"}
                  </span>
                </button>
              )}
            </section>
            <div className={styles.qrActions}>
              {showQr && <span>{qrState.remainingSeconds}초 후 만료</span>}
              {qrState.status === "error" && (
                <p className={styles.qrStatus} role="alert">
                  {qrState.error}
                </p>
              )}
              {qrState.status === "expired" && <span>QR이 만료되었습니다</span>}
              {qrState.status === "idle" && (
                <span>결제할 때 QR을 발급하세요</span>
              )}
            </div>
          </TeamInfoCard>
          <div className={styles.contentColumn}>
            <div className={styles.metrics}>
              <section className={styles.metricPanel} aria-label="팀 점수">
                <h2>TEAM SCORE</h2>
                <div className={styles.metricLine}>
                  <p className={styles.metricValue}>
                    {profileText(profile, "score")}
                  </p>
                  <p className={styles.rank}>
                    RANK{" "}
                    <strong>
                      {profile.status === "success"
                        ? formatNumber(profileData.rank)
                        : "—"}
                    </strong>
                  </p>
                </div>
                <p className={styles.scoreBreakdown}>
                  JEOPARDY {formatNumber(profileData.jeopardyScore)} / KoTH{" "}
                  {formatNumber(profileData.kothScore)} / SIGNATURE{" "}
                  {formatNumber(profileData.signatureScore)}
                </p>
              </section>
              <section
                className={styles.metricPanel}
                aria-label="마일리지 잔액"
              >
                <h2>MILEAGE</h2>
                <div className={styles.metricLine}>
                  <p className={styles.metricValue}>
                    {profileText(profile, "mileage")}
                  </p>
                  <span className={styles.unit}>MI</span>
                </div>
              </section>
            </div>
            <section className={styles.memberRanking} aria-label="내 개인 순위">
              <div className={styles.memberHeading}><h2>PERSONAL RANK</h2><span>본인이 푼 JEOPARDY 기준</span></div>
              {memberRanking?.status === "success" && <>
                <strong className={styles.memberNickname}>{memberRanking.data.nickname}</strong>
                <dl className={styles.memberStats}>
                  <div><dt>순위</dt><dd>{formatNumber(memberRanking.data.rank)}<small> 위</small></dd></div>
                  <div><dt>개인 점수</dt><dd>{formatNumber(memberRanking.data.score)}<small> pts</small></dd></div>
                  <div><dt>해결</dt><dd>{formatNumber(memberRanking.data.solvedCount)}<small> 문제</small></dd></div>
                </dl>
              </>}
              {memberRanking?.status === "loading" && <p role="status">개인 순위를 불러오는 중</p>}
              {memberRanking?.status === "error" && <p role="alert">개인 순위를 확인하지 못했습니다 새로고침으로 다시 확인해주세요</p>}
              {memberRanking?.status === "empty" && <p>아직 집계된 개인 순위가 없습니다</p>}
            </section>
            <div className={styles.refreshBar}>
              <span
                role={
                  refreshError || profileData.isBanned ? "alert" : undefined
                }
              >
                {profileData.isBanned
                  ? "활동 정지: " +
                    (profileData.banReason || "운영자에게 문의하세요")
                  : refreshError
                    ? "일부 정보를 갱신하지 못했습니다. 다시 시도하세요"
                    : "30초마다 갱신 · 표시 시간 KST"}
              </span>
              <button type="button" disabled={refreshing} onClick={onRefresh}>
                새로고침
              </button>
            </div>
            <MileageHistoryTable
              panelSrc={ASSET_BASE + "mileage-history-panel.png"}
              state={mileageHistory}
            />
            <SolveHistoryTable
              panelSrc={ASSET_BASE + "solve-history-panel.png"}
              state={solveHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
