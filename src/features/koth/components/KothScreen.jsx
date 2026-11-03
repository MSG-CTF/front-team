import { getKothConnection } from "../utils/kothChallengeState.js";
import KothChallengeButton from "./KothChallengeButton.jsx";
import KothChallengeSheet from "./KothChallengeSheet.jsx";
import { KothMobileHeading, KothRoundArtwork, KothMapFooter, KothMapFrame } from "./KothMobileArtwork.jsx";
import PanelTexture from "../../../components/common/PanelTexture.jsx";
import KothTeamTokenPanel from "./KothTeamTokenPanel.jsx";
import MainNavigationButton from "./MainNavigationButton.jsx";
import LoadingRing from "../../../components/common/LoadingRing.jsx";
import SkeletonBar from "../../../components/common/SkeletonBar.jsx";
import { KOTH_CHALLENGE_VISUALS } from "../config/kothVisualConfig.js";
import styles from "./KothScreen.module.css";

// 우표 카드 그림과 자리는 정해져 있어 KoTH 정보를 받는 동안에도 먼저 깔아 둔다 두 장씩 한 라운드다
const PENDING_ROUNDS = [0, 2, 4].map((start) => KOTH_CHALLENGE_VISUALS.slice(start, start + 2));

function formatValue(value) {
  return value == null ? "-" : String(value);
}

function PendingChallengeCard({ visual }) {
  return (
    <span
      className={`${styles.challengeButton} ${styles.challengePending}`}
      aria-hidden="true"
      style={{
        "--card-left": visual.position.left,
        "--card-top": visual.position.top,
        "--card-width": visual.position.width,
        "--card-height": visual.position.height,
      }}
    >
      <span className={styles.challengeCaption}><SkeletonBar className={styles.captionSkeleton} /></span>
      <span className={styles.challengeArtwork}>
        <img src={visual.imageSrc} alt="" className={styles.layerImage} />
      </span>
    </span>
  );
}

export default function KothScreen({
  requestStatus,
  requestError,
  authenticated, clubsStale, problemRanking,
  progressError,
  challenges,
  isEmpty,
  unmappedChallengeCount,
  teamId,
  teamName,
  totalKothScore,
  selectedChallenge,
  clubDetail,
  isTeamTokenOpen,
  teamToken,
  onRetry,
  onSelectChallenge,
  onCloseChallenge,
  onOpenTeamToken,
  onRetryTeamToken,
  onCloseTeamToken,
  downloadFile,
}) {
  const detailReady = clubDetail.status === "success";
  const connection = clubsStale || !detailReady ? null : getKothConnection(selectedChallenge);
  const rounds = Array.from({ length: Math.ceil(challenges.length / 2) }, (_, index) => challenges.slice(index * 2, index * 2 + 2));
  return (
    <main className={styles.page} aria-label="King of the Hill 문제 선택">
      <div className={styles.stage}>
        <PanelTexture material="map" responsive="width" />
        <KothMapFrame />
        <img
          src="/assets/koth/koth-trail-background.webp"
          alt=""
          aria-hidden="true"
          className={styles.background}
        />

        <KothMobileHeading />

        {requestStatus === "success" && (
          <aside className={styles.teamSummary} aria-label="내 팀 KoTH 점수">
            <p className={styles.teamScore}>
              <strong>{formatValue(teamName || null)}</strong>
              <span><small>KoTH</small> <b>{formatValue(totalKothScore)}</b> <small>pts</small></span>
            </p>
            <div className={styles.teamActions}>
              <button type="button" className={styles.summaryAction} data-tone="quiet" onClick={onRetry}>새로고침</button>
            </div>
            {!authenticated && <span className={styles.summaryNote}>로그인 후 팀 점수와 토큰 확인</span>}
          </aside>
        )}

        {/* 그림 위에 상자를 띄우지 않고, 다 받으면 팀 점수가 놓일 자리에 안내를 둔다 */}
        {requestStatus === "loading" && (
          <aside className={styles.teamSummary} role="status">
            <LoadingRing>KoTH 정보를 불러오는 중</LoadingRing>
          </aside>
        )}

        {requestStatus === "error" && (
          <section className={styles.dataState} role="alert">
            <p>{requestError}</p>
            <button type="button" onClick={onRetry}>다시 시도</button>
          </section>
        )}

        {requestStatus === "success" && requestError && <p className={styles.mappingWarning} role="alert">{requestError} <button type="button" onClick={onRetry}>다시 시도</button></p>}

        {isEmpty && (
          <section className={styles.dataState}>
            <p>현재 공개된 KoTH 문제가 없습니다</p>
          </section>
        )}

        <div className={styles.challengeGrid}>
          {requestStatus === "loading" && PENDING_ROUNDS.map((round, index) => <div className={styles.challengeRound} key={round[0].visualKey} aria-hidden="true">
            <KothRoundArtwork round={index + 1} />
            {round.map((visual) => <PendingChallengeCard key={visual.visualKey} visual={visual} />)}
          </div>)}
          {requestStatus === "success" && rounds.map((round, index) => <div className={styles.challengeRound} key={round[0].kothChallengeId}>
            <KothRoundArtwork round={index + 1} />
            {round.map(challenge => (
              <KothChallengeButton
                key={challenge.kothChallengeId}
                stale={clubsStale}
                challenge={{
                  ...challenge,
                  selected: challenge.kothChallengeId === selectedChallenge?.kothChallengeId,
                }}
                onSelect={onSelectChallenge}
              />
            ))}
          </div>)}
        </div>
        <KothMapFooter />

        {requestStatus === "success" && unmappedChallengeCount > 0 && (
          <p className={styles.mappingWarning} role="status">
            아직 지도에 올리지 않은 KoTH 문제가 {unmappedChallengeCount}개 있습니다
          </p>
        )}

        <MainNavigationButton />
      </div>

      {selectedChallenge && (
        <KothChallengeSheet
          challenge={selectedChallenge}
          connection={connection}
          detail={clubDetail}
          ranking={problemRanking}
          stale={clubsStale}
          authenticated={authenticated}
          progressError={progressError}
          teamId={teamId}
          onOpenTeamToken={onOpenTeamToken}
          onClose={onCloseChallenge}
          downloadFile={downloadFile}
        />
      )}

      {isTeamTokenOpen && (
        <KothTeamTokenPanel
          status={teamToken.status}
          data={teamToken.data}
          error={teamToken.error}
          teamName={teamName}
          onRetry={onRetryTeamToken}
          onClose={onCloseTeamToken}
        />
      )}
    </main>
  );
}
