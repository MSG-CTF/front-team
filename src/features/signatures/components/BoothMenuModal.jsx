import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { toKst } from "../../../utils/time.js";
import styles from "./BoothMenuModal.module.css";

// 메뉴판 아래 종이 띠에서 바로 플래그를 낸다 상세 풀이 페이지를 한 번 더 거치지 않는다
// 관리자와 개발 미리보기는 flag 없이 preview 로 같은 모양을 잠근 채 보인다
function BoothFlagForm({ flag, preview, challenge }) {
  const inputId = useId();
  const feedback = flag?.feedback;
  const solved = flag ? flag.solved : challenge?.is_solved === true;
  if (solved) {
    return (
      <div className={styles.flagDone} role="status">
        <strong><span aria-hidden="true">✓ </span>풀이 완료</strong>
        <span>{feedback?.type === "success" ? feedback.message : challenge?.solved_at ? `${toKst(challenge.solved_at)} KST` : "팀 기록에 반영됐습니다"}</span>
      </div>
    );
  }
  const retry = flag?.retrySeconds ?? 0;
  const invalid = feedback?.code === "INCORRECT_FLAG" || feedback?.code === "INVALID_REQUEST";
  const locked = preview || !flag;
  return (
    <form className={styles.flag} aria-label="플래그 제출" aria-busy={flag?.busy || undefined}
      onSubmit={(event) => { event.preventDefault(); if (!locked && !flag.disabled) flag.onSubmit(); }}>
      <div className={styles.flagRow}>
        <label className="sr-only" htmlFor={inputId}>플래그</label>
        <input id={inputId} name="flag" type="text" placeholder="MSG{...}" autoComplete="off" autoCapitalize="off" spellCheck={false}
          maxLength={512} value={flag?.value ?? ""} disabled={locked || flag.busy} onChange={(event) => flag?.onChange(event.target.value)}
          aria-invalid={invalid || undefined} aria-describedby={`${inputId}-note${feedback ? ` ${inputId}-feedback` : ""}`} />
        <button type="submit" disabled={locked || flag.disabled}>{flag?.busy ? "확인 중" : retry > 0 ? `${retry}초` : "제출"}</button>
      </div>
      {feedback && <p id={`${inputId}-feedback`} className={styles.flagFeedback} data-tone={feedback.type}
        role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
      {retry > 0 && <p className={styles.flagFeedback}>{retry}초 후 다시 제출할 수 있습니다</p>}
      <p id={`${inputId}-note`} className={styles.flagNote}>
        {preview ? "미리보기에서는 제출하지 않습니다" : "팀 점수에만 반영됩니다 마일리지와 추가 주사위는 지급되지 않습니다"}
      </p>
    </form>
  );
}

export default function BoothMenuModal({ club, challenge, status, error, onRetry, onClose, problems, selectedId, onSelect, flag, flagPreview = false, initialFocus = "close" }) {
  const titleId = useId();
  const panel = useRef(null);
  const hasMenus = problems?.length > 1 && Boolean(onSelect);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 부스 안에서 다른 메뉴로 바꾸면 고른 메뉴 단추에 초점을 둔다
    const target = initialFocus === "menu" ? panel.current?.querySelector("[data-menu-tab][aria-pressed='true']") : null;
    (target ?? panel.current?.querySelector("button"))?.focus();
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = [...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],[tabindex="0"]')];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus(); };
  }, [onClose, initialFocus]);
  const content = <div className={styles.overlay} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.menu}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="부스 안내 닫기">×</button>
        <div className={styles.content} role="region" aria-label="부스 안내 내용" tabIndex={0}>
          <header className={styles.header}>
            <p className={styles.brand}>MSG CTF</p>
            <p className={styles.festival}>CLUB FESTIVAL</p>
            <h2 id={titleId}>{club?.name || "동아리 부스"}</h2>
            {club?.university && <p className={styles.school}>{club.university}</p>}
          </header>
          {/* 한 부스에 문제가 여럿이면 MENU 자리에서 메뉴를 고른다 푼 메뉴는 체크로 보이고, 바꾸는 동안에도 자리를 지킨다 */}
          {hasMenus && (
            <div className={styles.menuTabs} role="group" aria-label="부스 문제 고르기">
              {problems.map((problem, index) => (
                <button key={problem.signature_id} type="button" data-menu-tab aria-pressed={problem.signature_id === selectedId}
                  onClick={() => onSelect(problem.signature_id)}>
                  {`메뉴 ${index + 1}`}{problem.is_solved && <span aria-hidden="true"> ✓</span>}
                  <span className="sr-only">{` ${problem.title}${problem.is_solved ? ", 풀이 완료" : ""}`}</span>
                </button>
              ))}
            </div>
          )}
          {status === "loading" && <p className={styles.notice} role="status">문제 안내를 불러오는 중입니다</p>}
          {status === "error" && <div className={styles.notice} role="alert"><p>{error}</p><button type="button" onClick={onRetry}>다시 확인</button></div>}
          {status === "empty" && <p className={styles.notice}>공개된 문제가 없습니다</p>}
          {status === "success" && challenge && <>
            <div className={styles.heading}>
              {!hasMenus && <p className={styles.kicker}>MENU</p>}
              <h3>{challenge.title}</h3>
            </div>
            <div className={styles.score} aria-label={`포인트 ${challenge.score}`}><span aria-hidden="true">❧</span><strong>{challenge.score.toLocaleString("ko-KR")}</strong><span>포인트</span></div>
            <section className={styles.description} aria-label="문제 소개">
              <h4>DESCRIPTION</h4>
              <div className={styles.body}>{challenge.description || "등록된 설명이 없습니다"}</div>
            </section>
          </>}
        </div>
      </div>
      {/* 제출 띠는 지문 길이와 상관없이 보이게 메뉴판 아래에 둔다 */}
      {status === "success" && challenge && (flag || flagPreview) && <BoothFlagForm flag={flag} preview={flagPreview} challenge={challenge} />}
    </section>
  </div>;
  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
