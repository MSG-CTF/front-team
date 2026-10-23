import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatNumber } from "../utils/myPageData.js";
import styles from "./MyPageScene.module.css";

function QrSlot({ qrState, onIssueQr, qrDisabled }) {
  const showQr =
    qrState.status === "success" &&
    Boolean(qrState.paymentToken) &&
    Boolean(qrState.expiresAt) &&
    qrState.remainingSeconds > 0;
  return (
    <div className={styles.qrBlock}>
      {/* Figma의 원형 틀을 사각형 QR 틀로 바꿨다. 발급·만료·재발급 흐름은 그대로 */}
      <section
        className={styles.qrSlot}
        aria-label={showQr ? "결제 QR 코드, " + qrState.remainingSeconds + "초 후 만료" : "결제 QR 코드"}
      >
        {showQr && <QRCodeSVG value={qrState.paymentToken} size={160} marginSize={2} className={styles.qrCode} />}
        {qrState.status === "loading" && <p className={styles.qrLoading} role="status">QR 발급 중</p>}
        {!showQr && qrState.status !== "loading" && (
          <button type="button" className={styles.qrIssueButton} onClick={onIssueQr} disabled={qrDisabled}>
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3h10v10H3zM19 3h10v10H19zM3 19h10v10H3zM19 19h4v4h6v6h-6M19 25v4M29 19v2M7 7h2v2H7zM23 7h2v2h-2zM7 23h2v2H7z" />
            </svg>
            <span>{qrState.status === "idle" ? "결제 QR 발급" : "QR 다시 발급"}</span>
          </button>
        )}
      </section>
      <p className={`${styles.qrStatus} ${qrState.status === "error" ? styles.qrError : ""}`} role={qrState.status === "error" ? "alert" : undefined}>
        {showQr && <><strong>{qrState.remainingSeconds}초</strong> 후 만료</>}
        {qrState.status === "error" && qrState.error}
        {qrState.status === "expired" && "QR이 만료되었습니다"}
        {qrState.status === "idle" && "결제할 때 QR을 발급하세요"}
      </p>
    </div>
  );
}

function PersonalRank({ memberRanking }) {
  return (
    <section className={styles.personalRank} aria-label="내 개인 순위">
      <h2>
        PERSONAL RANK
        {memberRanking?.status === "success" && <span> · {memberRanking.data.nickname}</span>}
      </h2>
      {memberRanking?.status === "success" && (
        <dl className={styles.personalStats}>
          <div><dt className={styles.srOnly}>순위</dt><dd>{formatNumber(memberRanking.data.rank)}<small> 위</small></dd></div>
          <div><dt className={styles.srOnly}>개인 점수</dt><dd>{formatNumber(memberRanking.data.score)}<small> pts</small></dd></div>
          <div><dt className={styles.srOnly}>해결</dt><dd>{formatNumber(memberRanking.data.solvedCount)}<small> 문제</small></dd></div>
        </dl>
      )}
      {memberRanking?.status === "loading" && <p className={styles.personalMessage} role="status">개인 순위를 불러오는 중</p>}
      {memberRanking?.status === "error" && <p className={styles.personalMessage} role="alert">개인 순위를 확인하지 못했습니다 새로고침으로 다시 확인해주세요</p>}
      {memberRanking?.status === "empty" && <p className={styles.personalMessage}>아직 집계된 개인 순위가 없습니다</p>}
      {memberRanking?.status === "noTeam" && <p className={styles.personalMessage}>소속 팀이 없어 개인 순위가 없습니다</p>}
    </section>
  );
}

// 넓은 화면 카드 그림에는 팀원 글머리표가 두 줄만 있다 셋째 팀원부터는 접어 두고 "외 N명"으로 펼친다
// 좁은 화면은 카드가 길어지므로 모두 보이고 펼치기 단추는 감춘다
const CARD_MEMBER_ROWS = 2;

// Figma 309:306 — TEAM 리본, 구분선, MEMBERS, MSG CTF는 카드 그림에 그려져 있다
export default function TeamInfoCard({ profile, memberRanking, qrState, onIssueQr, qrDisabled, onLogout, isLoggingOut }) {
  const membersId = useId();
  const [showAllMembers, setShowAllMembers] = useState(false);
  let teamName = profile.data?.teamName || "-";
  if (profile.status === "loading") teamName = "LOADING";
  if (profile.status === "error") teamName = "UNAVAILABLE";
  if (profile.status === "noTeam") teamName = "NO TEAM";
  const members = profile.status === "success" ? profile.data.members ?? [] : [];
  const foldedMembers = members.length - CARD_MEMBER_ROWS;
  return (
    <section className={styles.teamCard} aria-label="팀 정보">
      <p className={styles.bakedLabel}>TEAM</p>
      <h1 className={styles.teamName} title={teamName}>{teamName}</h1>
      <QrSlot qrState={qrState} onIssueQr={onIssueQr} qrDisabled={qrDisabled} />
      <button type="button" className={styles.logoutButton} onClick={onLogout} disabled={isLoggingOut}>
        로그아웃
      </button>
      <h2 className={styles.srOnly}>MEMBERS</h2>
      <ul id={membersId} className={styles.members} data-expanded={showAllMembers || undefined}>
        {members.map((member, index) => (
          <li key={member + index} title={member}>{member}</li>
        ))}
      </ul>
      {foldedMembers > 0 && (
        <button type="button" className={styles.moreMembers} aria-expanded={showAllMembers} aria-controls={membersId}
          onClick={() => setShowAllMembers((value) => !value)}>
          {showAllMembers ? "접기" : `외 ${foldedMembers}명`}
        </button>
      )}
      <PersonalRank memberRanking={memberRanking} />
    </section>
  );
}
