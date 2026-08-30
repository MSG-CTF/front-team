import KothChallengeButton from "./KothChallengeButton.jsx";
import KothTeamTokenPanel from "./KothTeamTokenPanel.jsx";
import MainNavigationButton from "./MainNavigationButton.jsx";
import { toKst } from "../../../utils/time.js";
import styles from "./KothScreen.module.css";

function formatValue(value) {
  return value == null ? "—" : String(value);
}

export default function KothScreen({
  requestStatus,
  requestError,
  challenges,
  isEmpty,
  unmappedChallengeCount,
  teamName,
  totalKothScore,
  selectedChallenge,
  isTeamTokenOpen,
  teamToken,
  onRetry,
  onSelectChallenge,
  onCloseChallenge,
  onOpenTeamToken,
  onCloseTeamToken,
}) {
  return (
    <main className={styles.page} aria-label="King of the Hill 문제 선택">
      <div className={styles.stage}>
        <img
          src="/assets/koth/koth-trail-background.png"
          alt=""
          aria-hidden="true"
          className={styles.background}
        />

        {requestStatus === "success" && (
          <aside className={styles.teamSummary} aria-label="내 팀 KOTH 점수">
            <strong>{formatValue(teamName || null)}</strong>
            <span>TOTAL KOTH SCORE {formatValue(totalKothScore)}</span>
            <button type="button" onClick={onOpenTeamToken}>
              팀 토큰 확인
            </button>
          </aside>
        )}

        {requestStatus === "loading" && (
          <section className={styles.dataState} role="status">
            KOTH 정보를 불러오는 중입니다.
          </section>
        )}

        {requestStatus === "error" && (
          <section className={styles.dataState} role="alert">
            <p>{requestError}</p>
            <button type="button" onClick={onRetry}>다시 시도</button>
          </section>
        )}

        {isEmpty && (
          <section className={styles.dataState}>
            <p>현재 공개된 KOTH 문제가 없습니다.</p>
          </section>
        )}

        {requestStatus === "success" && challenges.map((challenge) => (
          <KothChallengeButton
            key={challenge.kothChallengeId}
            challenge={{
              ...challenge,
              selected: challenge.kothChallengeId === selectedChallenge?.kothChallengeId,
            }}
            onSelect={onSelectChallenge}
          />
        ))}

        {requestStatus === "success" && unmappedChallengeCount > 0 && (
          <p className={styles.mappingWarning} role="alert">
            표시 위치가 확정되지 않은 KOTH 문제 {unmappedChallengeCount}개가 있습니다.
          </p>
        )}

        {selectedChallenge && (
          <section className={styles.challengeDetail} aria-label="선택한 KOTH 문제 정보">
            <button
              type="button"
              className={styles.panelCloseButton}
              onClick={onCloseChallenge}
              aria-label="선택한 문제 정보 닫기"
            >
              ×
            </button>
            <p className={styles.challengeClub}>{selectedChallenge.clubName}</p>
            <h2>{selectedChallenge.title}</h2>
            <dl>
              <div><dt>STATUS</dt><dd>{selectedChallenge.status}</dd></div>
              <div><dt>OPEN GROUP</dt><dd>{selectedChallenge.openGroup}</dd></div>
              <div><dt>OWNER</dt><dd>{formatValue(selectedChallenge.currentOwnerTeamName)}</dd></div>
              <div><dt>CURRENT SCORE</dt><dd>{formatValue(selectedChallenge.currentScore)}</dd></div>
              <div><dt>MY SCORE</dt><dd>{formatValue(selectedChallenge.earnedScore)}</dd></div>
              <div><dt>MY RANK</dt><dd>{formatValue(selectedChallenge.rank)}</dd></div>
              <div>
                <dt>SOLVED AT</dt>
                <dd>{selectedChallenge.solvedAt ? toKst(selectedChallenge.solvedAt) : "—"}</dd>
              </div>
            </dl>
            <p className={styles.routeNotice}>
              문제 접속 경로는 아직 프론트 route와 API에 제공되지 않았습니다.
            </p>
          </section>
        )}

        <MainNavigationButton />

        {isTeamTokenOpen && (
          <KothTeamTokenPanel
            status={teamToken.status}
            data={teamToken.data}
            error={teamToken.error}
            onRetry={teamToken.requestTeamToken}
            onClose={onCloseTeamToken}
          />
        )}
      </div>
    </main>
  );
}
