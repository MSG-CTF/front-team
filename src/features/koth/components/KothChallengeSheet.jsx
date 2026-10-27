import { useEffect, useId, useRef } from "react";
import { toKst } from "../../../utils/time.js";
import KothCardArt from "./KothCardArt.jsx";
import KothFileButton from "./KothFileButton.jsx";
import { KothCrown, KothRoundRibbon } from "./KothMobileArtwork.jsx";
import { kothRound } from "../utils/kothChallengeState.js";
import styles from "./KothScreen.module.css";

const STATUS_LABELS = { ACTIVE: "진행 중", SCHEDULED: "열리기 전", CLOSED: "종료" };

function clock(value) {
  return value ? toKst(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
}

// 문제 상세 화면처럼 판 소제목은 영문 대문자로 보이고 화면 낭독기에는 한글로 읽힌다
function Label({ en, ko }) {
  return <><span aria-hidden="true">{en}</span><span className="sr-only">{ko}</span></>;
}

// 문제 상세 화면처럼 설명 속 숫자는 따로 싸서 본문과 같은 숫자 모양으로 맞춘다
function descriptionDigits(text) {
  return text.split(/([0-9]+)/g).map((part, index) =>
    /^[0-9]+$/.test(part) ? <span key={index} className={styles.descriptionDigits}>{part}</span> : part);
}

// 문제별 누적 순위: 판 안에서만 스크롤하고, 1위에는 지도의 왕관을 달고, 우리 팀 줄은 밝히고 아래로 밀려나면 아래 끝에 붙여 둔다
function KothRanking({ ranking, teamId }) {
  if (ranking.status === "loading" || ranking.status === "idle") return <p className={styles.rankingState} role="status">순위 조회 중</p>;
  if (ranking.status === "unauthenticated") return <p className={styles.rankingState}>로그인 후 순위를 확인할 수 있습니다</p>;
  if (ranking.status === "error") return <p className={styles.rankingState} role="alert">{ranking.error} <button type="button" onClick={ranking.retry}>다시 시도</button></p>;
  const rows = ranking.data.leaderboard;
  if (rows.length === 0) return <p className={styles.rankingState}>아직 득점한 팀이 없습니다</p>;
  return <div className={styles.rankingScroll} tabIndex={0} aria-label="문제별 누적 순위 목록">
    <table className={styles.rankingTable}>
      <colgroup><col className={styles.rankColumn} /><col /><col className={styles.scoreColumn} /></colgroup>
      <thead><tr><th scope="col">순위</th><th scope="col">팀</th><th scope="col">점수</th></tr></thead>
      <tbody>{rows.map((row) => {
        const mine = teamId != null && row.team_id === teamId;
        return <tr key={row.team_id} data-mine={mine || undefined} data-top={row.rank <= 3 || undefined}>
          <td>{row.rank}</td>
          <td><span className={styles.rankingName}>
            {row.rank === 1 && <KothCrown className={styles.rankCrown} />}
            <span title={row.team_name}>{row.team_name}</span>
            {mine && <span className={styles.mineTag}>우리 팀</span>}
          </span></td>
          <td>{row.earned_score}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export default function KothChallengeSheet({ challenge, connection, detail, ranking, stale, authenticated, teamId, onClose, downloadFile }) {
  const sheet = useRef(null);
  const ids = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(sheet.current.querySelectorAll("a[href], button:not(:disabled), [tabindex='0']"));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const detailReady = detail.status === "success";
  const round = kothRound(challenge);
  const opened = clock(challenge.openedAt);
  const ownerIsMine = teamId != null && challenge.currentOwnerTeamId === teamId;
  const firstScore = clock(challenge.solvedAt);
  const waiting = challenge.collection === "pending";
  const failed = challenge.collection === "failed";
  const routeMessage = !detailReady ? "최신 상태 확인 후 접속할 수 있습니다"
    : stale ? "목록 갱신 후 접속할 수 있습니다"
      : challenge.status === "ACTIVE" ? "접속 주소 준비 중" : "현재 접속할 수 없는 문제입니다";
  const rows = ranking.status === "success" ? ranking.data.leaderboard.length : 0;
  const file = detailReady && challenge.status !== "SCHEDULED" ? challenge.file : null;

  return (
    <div className={styles.sheetBackdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={sheet}
        className={styles.challengeSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}title`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="선택한 문제 정보 닫기">
          <img src="/assets/board/icon-close-round.png" alt="" />
        </button>

        {/* 왼쪽: 지도에서 고른 우표 카드를 크게 두고 그 아래에 접속과 파일을 둔다 */}
        <div className={styles.sheetCard}>
          <KothCardArt challenge={challenge} className={styles.sheetStamp} />
          <div className={styles.sheetConnect}>
            {connection
              ? <a href={connection} target="_blank" rel="noopener noreferrer" className={styles.connectButton} aria-label="문제 접속 새 창으로 열기">CONNECT</a>
              : <span className={styles.connectButton} data-disabled="true" aria-hidden="true">CONNECT</span>}
            <p className={styles.endpoint} data-empty={!connection || undefined}>{connection ? connection.replace(/^https?:\/\//, "") : routeMessage}</p>
            {detail.status === "loading" && <p className={styles.detailFeedback} role="status">최신 문제 정보를 확인하는 중</p>}
            {detail.status === "error" && <p className={styles.detailFeedback} role="alert">{detail.error} <button type="button" onClick={detail.retry}>다시 확인</button></p>}
          </div>
          <div className={styles.sheetFiles}>
            <h3 className={styles.sheetLabel}>
              <Label en="ATTACHMENTS" ko="첨부파일" />
              <span className={styles.attachCount}>{file ? 1 : 0}</span>
            </h3>
            {file
              ? <KothFileButton challengeId={challenge.kothChallengeId} file={file} download={downloadFile} />
              : <p className={styles.attachmentEmpty}>{detailReady ? "이 문제에는 첨부파일이 없습니다" : "파일 정보를 확인하는 중"}</p>}
          </div>
        </div>

        {/* 가운데: 동아리와 제목, 지도의 라운드 리본, 왕좌를 차지한 팀과 우리 팀, 설명 */}
        <div className={styles.sheetMain}>
          <div className={styles.sheetHeading}>
            <p className={styles.sheetEyebrow}>{challenge.clubName}</p>
            <h2 id={`${ids}title`} className={styles.sheetTitle}>{challenge.title}</h2>
            <p className={styles.sheetMeta}>
              <KothRoundRibbon round={round} className={styles.roundRibbon} />
              <span className="sr-only">ROUND {round}</span>
              {opened && <span className={styles.sheetTime}>{opened} OPEN</span>}
              <span className={styles.statusBadge} data-status={challenge.status}><i aria-hidden="true" />{STATUS_LABELS[challenge.status] ?? "확인 중"}</span>
            </p>
          </div>
          <dl className={styles.sheetStanding}>
            <div>
              <dt><KothCrown className={styles.kingCrown} /><Label en="KING" ko="현재 점령 팀" /></dt>
              <dd>
                {detailReady && challenge.currentOwnerTeamName
                  ? <><span className={styles.standingName} title={challenge.currentOwnerTeamName}>{challenge.currentOwnerTeamName}</span>{ownerIsMine && <span className={styles.mineTag}>우리 팀</span>}</>
                  : <span className={styles.standingEmpty}>{detailReady ? "아직 없음" : "-"}</span>}
                {detailReady && challenge.currentScore != null && <span className={styles.standingScore} data-tone="gold">{challenge.currentScore}</span>}
              </dd>
            </div>
            <div>
              <dt><Label en="MY TEAM" ko="우리 팀" /></dt>
              <dd>
                <span className={styles.standingName}>{!authenticated ? "순위 없음" : waiting ? "집계 대기" : failed ? "수집 실패" : challenge.rank != null ? `${challenge.rank}위` : challenge.earnedScore === 0 ? "—" : "순위 없음"}</span>
                <span className={styles.standingScore}>{authenticated && !waiting && !failed && challenge.earnedScore != null ? challenge.earnedScore : "-"}</span>
              </dd>
              <dd className={styles.standingNote}>{!authenticated ? "로그인 후 확인" : failed ? "점수 수집에 실패했습니다 잠시 후 다시 확인해주세요" : waiting ? "점수를 아직 수집하지 못했습니다" : challenge.collection === "stale" ? "마지막으로 수집한 점수입니다" : firstScore ? `${firstScore} 첫 득점` : challenge.earnedScore === 0 ? "수집 결과 0점" : "아직 득점 전"}</dd>
            </div>
          </dl>
          <section className={styles.sheetDescription} aria-labelledby={`${ids}description`}>
            <h3 id={`${ids}description`} className={styles.sheetLabel}><Label en="DESCRIPTION" ko="문제 설명" /></h3>
            <div className={styles.descriptionText} tabIndex={0} aria-label="문제 설명 본문">
              {challenge.description ? descriptionDigits(challenge.description) : <span className={styles.descriptionEmpty}>등록된 설명이 없습니다</span>}
            </div>
          </section>
        </div>

        {/* 오른쪽: 순위 판 하나만 금테를 두른다 */}
        <section className={styles.sheetRanking} aria-labelledby={`${ids}ranking`}>
          <h3 id={`${ids}ranking`} className={styles.sheetLabel}>
            <Label en="LEADERBOARD" ko="문제별 누적 순위" />
            {rows > 0 && <span className={styles.attachCount}>{rows}</span>}
          </h3>
          <KothRanking ranking={ranking} teamId={teamId} />
        </section>
      </section>
    </div>
  );
}
