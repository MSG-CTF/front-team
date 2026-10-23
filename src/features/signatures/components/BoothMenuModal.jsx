import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FlagResultModal from "../../challenges/components/FlagResultModal.jsx";
import styles from "./BoothMenuModal.module.css";

// submission: useSignatureDetail 결과. 없으면(미리보기) 제출 칸을 그리지 않는다
// problems, selectedId, onSelect: 한 부스에 문제가 여럿이면 메뉴 단추로 고른다
export default function BoothMenuModal({ club, challenge, status, error, onRetry, onClose, submission, problems, selectedId, onSelect, initialFocus = "close" }) {
  const titleId = useId();
  const hasMenus = problems?.length > 1 && Boolean(onSelect);
  const flagId = useId();
  const panel = useRef(null);
  // 정답·오답은 문제 상세와 같은 중앙 모달로 알린다. 닫은 피드백은 다시 띄우지 않는다
  const [dismissed, setDismissed] = useState(null);
  const result = submission?.feedback && submission.feedback !== dismissed ? submission.feedback : null;
  const resultOpen = useRef(false);
  resultOpen.current = Boolean(result);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 부스 안에서 다른 메뉴로 바꾸면 고른 메뉴 단추에 초점을 둔다
    const menu = initialFocus === "menu" ? panel.current?.querySelector("[data-menu-tab][aria-pressed='true']") : null;
    (menu ?? panel.current?.querySelector("button"))?.focus();
    const key = (event) => {
      if (event.key === "Escape" && !resultOpen.current) onClose();
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
    <section ref={panel} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} data-submit={submission ? "true" : undefined}>
      <div className={styles.menu}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="부스 안내 닫기">×</button>
        <div className={styles.content} role="region" aria-label="부스 안내 내용" tabIndex={0}>
          <header className={styles.header}>
            <p className={styles.brand}>MSG CTF</p>
            <p className={styles.festival}>CLUB FESTIVAL</p>
            <h2 id={titleId}>{club?.name || "동아리 부스"}</h2>
            {club?.university && <p className={styles.school}>{club.university}</p>}
          </header>
          {/* 메뉴 단추는 다른 메뉴를 불러오는 동안에도 자리를 지킨다 */}
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
            <div className={styles.heading}>{!hasMenus && <p className={styles.kicker}>MENU</p>}<h3>{challenge.title}</h3></div>
            <div className={styles.score} aria-label={`포인트 ${challenge.score}`}><span aria-hidden="true">❧</span><strong>{challenge.score.toLocaleString("ko-KR")}</strong><span>포인트</span></div>
            <section className={styles.description} aria-label="문제 소개">
              <h4>DESCRIPTION</h4>
              <div className={styles.body}>{challenge.description || "등록된 설명이 없습니다"}</div>
            </section>
          </>}
        </div>
      </div>
      {/* 제출 칸은 지문 길이와 상관없이 보이게 메뉴판 아래에 둔다 */}
      {status === "success" && challenge && submission && <form className={styles.submit} onSubmit={event => { event.preventDefault(); if (!submission.disabled) submission.submit(); }} aria-busy={submission.busy}>
        {submission.solved ? <p className={styles.solved} role="status">풀이 완료 ✓</p> : <>
          <label htmlFor={flagId}>플래그 제출</label>
          <div className={styles.row}>
            <input id={flagId} type="text" placeholder="MSG{...}" autoComplete="off" autoCapitalize="off" spellCheck={false}
              value={submission.flag} maxLength={512} disabled={submission.busy}
              onChange={event => submission.setFlag(event.target.value)}
              aria-invalid={["INCORRECT_FLAG", "INVALID_REQUEST"].includes(submission.feedback?.code) || undefined} />
            <button type="submit" disabled={submission.disabled}>{submission.busy ? "확인 중…" : submission.retrySeconds > 0 ? `${submission.retrySeconds}초` : "제출"}</button>
          </div>
        </>}
      </form>}
    </section>
  </div>;
  if (typeof document === "undefined") return content;
  // 오버레이의 backdrop-filter가 fixed 자식의 기준을 바꾸므로 결과 모달은 body로 따로 올린다
  return <>
    {createPortal(content, document.body)}
    {result && createPortal(<FlagResultModal feedback={result} onClose={() => setDismissed(result)} />, document.body)}
  </>;
}
