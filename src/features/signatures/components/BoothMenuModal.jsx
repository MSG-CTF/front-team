import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./BoothMenuModal.module.css";

export default function BoothMenuModal({ club, challenge, status, error, onRetry, onClose }) {
  const titleId = useId();
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = [...panel.current.querySelectorAll('button:not(:disabled),[tabindex="0"]')];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);
  const content = <div className={styles.overlay} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} className={styles.menu} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="부스 안내 닫기">×</button>
      <div className={styles.content} role="region" aria-label="부스 안내 내용" tabIndex={0}>
        <header className={styles.header}>
          <p className={styles.brand}>MSG CTF</p>
          <p className={styles.festival}>CLUB FESTIVAL</p>
          <h2 id={titleId}>{club?.name || "동아리 부스"}</h2>
          {club?.university && <p className={styles.school}>{club.university}</p>}
        </header>
        {status === "loading" && <p className={styles.notice} role="status">문제 안내를 불러오는 중입니다</p>}
        {status === "error" && <div className={styles.notice} role="alert"><p>{error}</p><button type="button" onClick={onRetry}>다시 확인</button></div>}
        {status === "empty" && <p className={styles.notice}>공개된 문제가 없습니다</p>}
        {status === "success" && challenge && <>
          <div className={styles.heading}><p className={styles.kicker}>MENU</p><h3>{challenge.title}</h3></div>
          <div className={styles.score} aria-label={`포인트 ${challenge.score}`}><span aria-hidden="true">❧</span><strong>{challenge.score.toLocaleString("ko-KR")}</strong><span>포인트</span></div>
          <section className={styles.description} aria-label="문제 소개">
            <h4>DESCRIPTION</h4>
            <div className={styles.body}>{challenge.description || "등록된 설명이 없습니다"}</div>
          </section>
        </>}
      </div>
    </section>
  </div>;
  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
