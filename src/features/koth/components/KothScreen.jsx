import { getKothConnection } from "../utils/kothChallengeState.js";
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
  authenticated, clubsStale, problemRanking,
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
  const connection = clubsStale ? null : getKothConnection(selectedChallenge);
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
            <button type="button" onClick={onOpenTeamToken} disabled={!authenticated}>
              팀 토큰 확인
            </button>
            <button type="button" onClick={onRetry}>새로고침</button>
            {!authenticated && <span>로그인 후 팀 점수와 토큰 확인</span>}
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

        {requestStatus === "success" && requestError && <p className={styles.mappingWarning} role="alert">{requestError} <button type="button" onClick={onRetry}>다시 시도</button></p>}

        {isEmpty && (
          <section className={styles.dataState}>
            <p>현재 공개된 KOTH 문제가 없습니다.</p>
          </section>
        )}

        {["14%", "45.8%", "77.4%"].map((left) => <span key={left} className={styles.scheduleNotice} style={{ left }}>공개 상태는 각 문제에 표시</span>)}

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
                <dt>최초 득점 (KST)</dt>
                <dd>{selectedChallenge.solvedAt ? toKst(selectedChallenge.solvedAt) : "—"}</dd>
              </div>
            </dl>
            <div className={styles.routeNotice}>
              {connection ? <a href={connection} target="_blank" rel="noopener noreferrer" className={styles.connectButton}>문제 접속</a>
                : <span>{clubsStale ? "목록 갱신 후 접속할 수 있습니다" : selectedChallenge.status === "ACTIVE" ? "접속 주소 준비 중" : "현재 접속할 수 없는 문제입니다"}</span>}
            </div>
            <section className={styles.problemRanking} aria-label="문제별 팀 순위">
              <h3>문제별 누적 순위</h3>
              {problemRanking.status === "loading" && <p role="status">순위 조회 중</p>}
              {problemRanking.status === "unauthenticated" && <p>로그인 후 순위를 확인할 수 있습니다</p>}
              {problemRanking.status === "error" && <p role="alert">{problemRanking.error} <button type="button" onClick={problemRanking.retry}>다시 시도</button></p>}
              {problemRanking.status === "success" && <table>
                <thead><tr><th>순위</th><th>팀</th><th>점수</th></tr></thead>
                <tbody>{problemRanking.data.leaderboard.map((row) => <tr key={row.team_id}><td>{row.rank}</td><td>{row.team_name}</td><td>{row.earned_score}</td></tr>)}</tbody>
              </table>}
              {problemRanking.status === "success" && problemRanking.data.leaderboard.length === 0 && <p>아직 득점한 팀이 없습니다</p>}
            </section>
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
