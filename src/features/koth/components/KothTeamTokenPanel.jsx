import { useEffect, useRef, useState } from "react";
import { toKst } from "../../../utils/time.js";
import styles from "./KothScreen.module.css";

// 팀 토큰 창: 문제 상세 화면의 플래그 제출 판처럼 금테 판에 소제목, 토큰 칸, 안내, COPY 명판을 둔다
export default function KothTeamTokenPanel({
  status,
  data,
  error,
  teamName,
  challengeTitle,
  onRetry,
  onClose,
}) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [copyStatus, setCopyStatus] = useState("idle");

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    setCopyStatus("idle");
  }, [data?.team_token]);

  const handleCopy = async () => {
    if (!data?.team_token || !navigator.clipboard) {
      setCopyStatus("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(data.team_token);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  function handleKeyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panel.current.querySelectorAll("button:not(:disabled), input"));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const ready = status === "success" && data;
  const issuedAt = ready && data.issued_at
    ? toKst(data.issued_at, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : "";
  const owner = (ready ? data.team_name : teamName) || "내 팀";

  return (
    <div className={styles.sheetBackdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        className={styles.tokenSheet}
        ref={panel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="koth-token-title"
      >
        <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="KOTH 팀 토큰 닫기">
          <img src="/assets/board/icon-close-round.png" alt="" />
        </button>
        <p className={styles.tokenLabel} aria-hidden="true">TEAM TOKEN</p>
        <h2 id="koth-token-title" className={styles.tokenTeam}>{owner}<span className="sr-only"> KoTH 팀 토큰</span></h2>
        {challengeTitle && <p>선택한 문제: {challengeTitle}</p>}

        {status === "error" ? (
          <p className={styles.tokenError} role="alert">{error}</p>
        ) : (
          <>
            <label htmlFor="koth-team-token" className="sr-only">팀 토큰</label>
            <input
              id="koth-team-token"
              className={styles.tokenInput}
              type="text"
              readOnly
              value={ready ? data.team_token : ""}
              placeholder={ready ? "" : "팀 토큰을 불러오는 중입니다"}
              spellCheck="false"
              onFocus={(event) => event.target.select()}
            />
          </>
        )}
        <p className={styles.tokenHint}>KoTH 문제 서버에 접속할 때 입력하는 우리 팀 전용 토큰입니다</p>

        <div className={styles.tokenFoot}>
          <p className={styles.tokenMeta}>{issuedAt && <span>발급 {issuedAt}</span>}</p>
          {status === "error"
            ? <button type="button" className={styles.copyButton} onClick={onRetry} aria-label="다시 시도">RETRY</button>
            : <button type="button" className={styles.copyButton} onClick={handleCopy} disabled={!ready} aria-label="토큰 복사">COPY</button>}
        </div>
        {copyStatus === "success" && <p className={styles.tokenStatus} role="status">복사했습니다</p>}
        {copyStatus === "error" && (
          <p className={styles.tokenStatus} role="alert" data-tone="alert">자동 복사에 실패했습니다 토큰을 직접 선택해 복사해주세요</p>
        )}
      </section>
    </div>
  );
}
