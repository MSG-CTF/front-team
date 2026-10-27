import { getKothConnection } from "../utils/kothChallengeState.js";
import KothChallengeButton from "./KothChallengeButton.jsx";
import KothChallengeSheet from "./KothChallengeSheet.jsx";
import { KothMobileHeading, KothRoundArtwork, KothMapFooter, KothMapFrame } from "./KothMobileArtwork.jsx";
import PanelTexture from "../../../components/common/PanelTexture.jsx";
import KothTeamTokenPanel from "./KothTeamTokenPanel.jsx";
import MainNavigationButton from "./MainNavigationButton.jsx";
import styles from "./KothScreen.module.css";

function formatValue(value) {
  return value == null ? "-" : String(value);
}

export default function KothScreen({
  requestStatus,
  requestError,
  authenticated, clubsStale, problemRanking,
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
              <button type="button" className={styles.summaryAction} onClick={onOpenTeamToken} disabled={!authenticated}>
                팀 토큰
              </button>
              <button type="button" className={styles.summaryAction} data-tone="quiet" onClick={onRetry}>새로고침</button>
            </div>
            {!authenticated && <span className={styles.summaryNote}>로그인 후 팀 점수와 토큰 확인</span>}
          </aside>
        )}

        {requestStatus === "loading" && (
          <section className={styles.dataState} role="status">
            KoTH 정보를 불러오는 중
          </section>
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
          <p className={styles.mappingWarning} role="alert">
            표시 위치가 확정되지 않은 KoTH 문제 {unmappedChallengeCount}개가 있습니다
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
          teamId={teamId}
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
          onRetry={teamToken.requestTeamToken}
          onClose={onCloseTeamToken}
        />
      )}
    </main>
  );
}
