import { useEffect, useRef, useState } from "react";
import { toKst } from "../../../utils/time.js";
import styles from "./KothScreen.module.css";

export default function KothTeamTokenPanel({
  status,
  data,
  error,
  onRetry,
  onClose,
}) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    return () => previous?.focus();
  }, []);
  const [copyStatus, setCopyStatus] = useState("idle");

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

  return (
    <div className={styles.tokenBackdrop} role="presentation">
      <section
        className={styles.tokenPanel}
        ref={panel}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); onClose(); }
          if (event.key === "Tab") {
            const controls = Array.from(panel.current.querySelectorAll("button:not(:disabled), input"));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="koth-token-title"
      >
        <button
          type="button"
          className={styles.panelCloseButton}
          onClick={onClose}
          aria-label="KOTH 팀 토큰 닫기"
        >
          ×
        </button>
        <h2 id="koth-token-title">KOTH TEAM TOKEN</h2>

        {status === "loading" && <p>팀 토큰을 불러오는 중입니다.</p>}

        {status === "error" && (
          <div className={styles.tokenState}>
            <p>{error}</p>
            <button type="button" onClick={onRetry}>다시 시도</button>
          </div>
        )}

        {status === "success" && data && (
          <div className={styles.tokenContent}>
            <p className={styles.tokenTeamName}>{data.team_name}</p>
            <label htmlFor="koth-team-token">외부 KOTH 문제 서버용 토큰</label>
            <input
              id="koth-team-token"
              type="text"
              readOnly
              value={data.team_token}
              spellCheck="false"
            />
            <button type="button" onClick={handleCopy}>토큰 복사</button>
            {copyStatus === "success" && <p role="status">복사했습니다.</p>}
            {copyStatus === "error" && (
              <p role="alert">자동 복사에 실패했습니다. 토큰을 직접 선택해 복사해주세요.</p>
            )}
            {data.issued_at && (
              <p className={styles.tokenIssuedAt}>
                발급 시각: {toKst(data.issued_at)}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
