import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { REMOTE_RUN_LABEL, REMOTE_RUN_NOTICE, formatRunDuration } from "../utils/remoteRun.js";
import styles from "./ChallengeDetailScene.module.css";

// 실행 결과 창은 원격 실행 판과 같은 어두운 판이다 제목 줄과 밑줄, 파인 출력 칸, 나무 단추까지 판의 짜임을 따른다
export default function RemoteRunResultModal({ run, number, onClose }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer.current);
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(run.stdout);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const facts = [
    run.exitCode != null ? `종료 코드 ${run.exitCode}` : null,
    formatRunDuration(run.durationMs),
  ].filter(Boolean).join(" · ");
  const notice = run.message || REMOTE_RUN_NOTICE[run.status] || "";

  const content = (
    <div className={styles.resultOverlay} onClick={onClose}>
      <div
        className={styles.runResult}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remote-run-result-title"
        data-status={run.status}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.runResultClose} aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <div className={styles.runResultBody}>
          <div className={styles.runResultHead}>
            <h2 id="remote-run-result-title" className={styles.runResultTitle}>
              {REMOTE_RUN_LABEL[run.status] ?? "확인 중"}
            </h2>
            <span className={styles.statusBadge} data-run={run.status}>
              <i aria-hidden="true" />
              {number}회차
            </span>
          </div>

          <div className={styles.runResultLabelRow}>
            <p className={styles.runLabel}>
              <span className={styles.runEn} aria-hidden="true">Output</span>
              <span className={styles.runKo}>실행 출력</span>
            </p>
            {facts && <p className={styles.runResultFacts}>{facts}</p>}
          </div>
          {notice && <p className={styles.runResultNotice}>{notice}</p>}
          {run.stdout ? (
            <pre className={styles.runResultOutput} tabIndex={0} aria-label={`실행 ${number} 출력`}>{run.stdout}</pre>
          ) : (
            <p className={`${styles.runResultOutput} ${styles.runResultNone}`}>출력이 없습니다</p>
          )}
          {run.stderr && (
            <details className={styles.runResultErr}>
              <summary>오류 출력</summary>
              <pre className={styles.runResultOutput} tabIndex={0} aria-label={`실행 ${number} 오류 출력`}>{run.stderr}</pre>
            </details>
          )}

          <div className={styles.runResultActions}>
            <button
              type="button"
              className={styles.runPlaque}
              onClick={copy}
              disabled={!run.stdout}
              aria-label={copied ? "출력을 복사했습니다" : "출력 복사"}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
            <button type="button" className={`${styles.runPlaque} ${styles.runPlaqueRun}`} onClick={onClose} aria-label="확인" autoFocus>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  // 플래그 결과 창처럼 무대 밖 페이지 바로 아래에 둔다 글꼴과 색 변수는 페이지에 있어 body 로 올리면 잃는다
  if (typeof document === "undefined") return content;
  return createPortal(content, document.querySelector(`.${styles.page}`) ?? document.body);
}
