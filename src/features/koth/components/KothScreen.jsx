import { useState } from "react";
import { getKothConnection } from "../utils/kothChallengeState.js";
import KothChallengeButton from "./KothChallengeButton.jsx";
import KothFileButton from "./KothFileButton.jsx";
import { KothMobileHeading, KothRoundArtwork, KothMapFooter, KothMapFrame } from "./KothMobileArtwork.jsx";
import PanelTexture from "../../../components/common/PanelTexture.jsx";
import KothTeamTokenPanel from "./KothTeamTokenPanel.jsx";
import MainNavigationButton from "./MainNavigationButton.jsx";
import { toKst } from "../../../utils/time.js";
import styles from "./KothScreen.module.css";

function formatValue(value) {
  return value == null ? "-" : String(value);
}

const RANKING_ROWS = 10;

// 문제별 누적 순위: 득점 팀이 많아도 패널이 끝없이 길어지지 않게 열 팀까지 보이고 나머지는 눌러서 연다
function KothRankingTable({ rows }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, RANKING_ROWS);
  return <>
    <table>
      <thead><tr><th>순위</th><th>팀</th><th>점수</th></tr></thead>
      <tbody>{shown.map((row) => <tr key={row.team_id}><td>{row.rank}</td><td>{row.team_name}</td><td>{row.earned_score}</td></tr>)}</tbody>
    </table>
    {rows.length > RANKING_ROWS && <button type="button" className={styles.rankingMore} onClick={() => setAll((value) => !value)}>
      {all ? `상위 ${RANKING_ROWS}팀만 보기` : `전체 ${rows.length}팀 보기`}</button>}
  </>;
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
  clubDetail,
  isTeamTokenOpen,
  teamToken,
  onRetry,
  onSelectChallenge,
  onCloseChallenge,
  onOpenTeamToken,
  onCloseTeamToken,
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
            <strong>{formatValue(teamName || null)}</strong>
            <span>KoTH {formatValue(totalKothScore)} pts</span>
            <button type="button" onClick={onOpenTeamToken} disabled={!authenticated}>
              팀 토큰
            </button>
            <button type="button" onClick={onRetry}>새로고침</button>
            {!authenticated && <span>로그인 후 팀 점수와 토큰 확인</span>}
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

        {selectedChallenge && (
          <section className={styles.challengeDetail} aria-label="선택한 KoTH 문제 정보">
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
            {selectedChallenge.description && <p className={styles.challengeDescription}>{selectedChallenge.description}</p>}
            <div className={styles.routeNotice}>
              {connection ? <a href={connection} target="_blank" rel="noopener noreferrer" className={styles.connectButton}>문제 접속</a>
                : <span>{!detailReady ? "최신 상태 확인 후 접속할 수 있습니다" : clubsStale ? "목록 갱신 후 접속할 수 있습니다" : selectedChallenge.status === "ACTIVE" ? "접속 주소 준비 중" : "현재 접속할 수 없는 문제입니다"}</span>}
              {detailReady && selectedChallenge.file && selectedChallenge.status !== "SCHEDULED"
                && <KothFileButton challengeId={selectedChallenge.kothChallengeId} file={selectedChallenge.file} />}
            </div>
            {detailReady && <dl>
              <div><dt>현재 점령 팀</dt><dd>{formatValue(selectedChallenge.currentOwnerTeamName)}</dd></div>
              <div><dt>현재 점수</dt><dd>{formatValue(selectedChallenge.currentScore)}</dd></div>
              <div><dt>우리 팀 점수</dt><dd>{formatValue(selectedChallenge.earnedScore)}</dd></div>
              <div><dt>우리 팀 순위</dt><dd>{formatValue(selectedChallenge.rank)}</dd></div>
              <div>
                <dt>최초 득점 (KST)</dt>
                <dd>{selectedChallenge.solvedAt ? toKst(selectedChallenge.solvedAt) : "-"}</dd>
              </div>
            </dl>}
            {clubDetail.status === "loading" && <p className={styles.detailFeedback} role="status">최신 문제 정보를 확인하는 중</p>}
            {clubDetail.status === "error" && <p className={styles.detailFeedback} role="alert">{clubDetail.error} <button type="button" onClick={clubDetail.retry}>다시 확인</button></p>}
            <section className={styles.problemRanking} aria-label="문제별 팀 순위">
              <h3>문제별 누적 순위</h3>
              {problemRanking.status === "loading" && <p role="status">순위 조회 중</p>}
              {problemRanking.status === "unauthenticated" && <p>로그인 후 순위를 확인할 수 있습니다</p>}
              {problemRanking.status === "error" && <p role="alert">{problemRanking.error} <button type="button" onClick={problemRanking.retry}>다시 시도</button></p>}
              {problemRanking.status === "success" && <KothRankingTable key={selectedChallenge.kothChallengeId} rows={problemRanking.data.leaderboard} />}
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
