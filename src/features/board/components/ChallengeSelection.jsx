import { memo, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animateChallengeCardPick, CARD_CRUMBLE_FRAGMENTS, CARD_PICK_SPARKS, fitCardTitleSize, getChallengeCardTilt } from "../utils/challengeCardMotion.js";
import { createChallengeReveal } from "../utils/challengeReveal.js";
import styles from "./ChallengeSelection.module.css";

const CARD_ARTWORK = ["brown", "slate", "olive"];

const CardTitle = memo(function CardTitle({ children }) {
  const area = useRef(null);
  const text = useRef(null);
  useEffect(() => {
    let active = true;
    let frame = 0;
    let previousWidth = -1;
    let previousHeight = -1;
    const fit = () => {
      if (!active || !area.current || !text.current) return;
      const height = area.current.clientHeight;
      text.current.style.fontSize = "";
      const maximum = parseFloat(getComputedStyle(text.current).fontSize);
      const size = fitCardTitleSize(maximum, size => {
        text.current.style.fontSize = `${size}px`;
        return text.current.scrollHeight <= height + 1;
      });
      text.current.style.fontSize = `${size}px`;
    };
    const scheduleFit = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === previousWidth && height === previousHeight) return;
      previousWidth = width;
      previousHeight = height;
      scheduleFit();
    });
    observer.observe(area.current);
    document.fonts.ready.then(() => { if (active) scheduleFit(); });
    return () => { active = false; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [children]);
  return <span ref={area} className={styles.titleArea}>
    <strong ref={text} className={styles.title}>{children}</strong>
  </span>;
});

function ChallengeCard({ candidate, index, busy, opening, crumbling, onChoose }) {
  const face = useRef(null);
  const tiltFrame = useRef(0);
  const tiltBounds = useRef(null);
  const pointer = useRef(null);
  const [pressed, setPressed] = useState(false);
  useEffect(() => () => cancelAnimationFrame(tiltFrame.current), []);
  const artwork = `/assets/board/challenge-card-${CARD_ARTWORK[index % 3]}-refined.webp`;
  const release = (event) => {
    setPressed(false);
    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = 0;
    tiltBounds.current = null;
    event.currentTarget.style.removeProperty("--tilt-x");
    event.currentTarget.style.removeProperty("--tilt-y");
  };
  return <button type="button"
    className={styles.card} data-tone={index % 3} disabled={busy}
    data-long-title={(candidate.title?.length ?? 0) > 28}
    data-opening={opening} data-crumbling={crumbling} data-pressed={pressed && !busy}
    style={{ "--deal-delay": `${index * 80}ms`, "--deal-angle": `${(index - 1) * 3}deg`, "--card-artwork": `url("${artwork}")` }}
    title={candidate.title}
    onPointerDown={(event) => {
      if (!busy && event.isPrimary && event.button === 0) setPressed(true);
    }}
    onPointerMove={(event) => {
      if (busy || event.pointerType !== "mouse") return;
      const target = event.currentTarget;
      pointer.current = { x: event.clientX, y: event.clientY };
      if (tiltFrame.current) return;
      tiltFrame.current = requestAnimationFrame(() => {
        tiltFrame.current = 0;
        if (target.disabled) return;
        tiltBounds.current ??= target.getBoundingClientRect();
        const tilt = getChallengeCardTilt(pointer.current.x, pointer.current.y, tiltBounds.current);
        target.style.setProperty("--tilt-x", `${tilt.x}deg`);
        target.style.setProperty("--tilt-y", `${tilt.y}deg`);
      });
    }}
    onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
    onBlur={release}
    onKeyDown={(event) => {
      if (!busy && !event.repeat && (event.key === " " || event.key === "Enter")) setPressed(true);
    }}
    onKeyUp={release}
    onClick={() => { setPressed(false); onChoose(candidate.challengeId, face.current); }}>
    <span className={styles.cardDeal}>
      <span ref={face} className={styles.cardFace} data-card-layer="face">
        <span className={styles.crumble} aria-hidden="true" data-card-effect="crumble">
          {CARD_CRUMBLE_FRAGMENTS.map((style, index) => <span key={index} className={styles.fragment} style={style} />)}
        </span>
        {opening && <span className={styles.pickEffects} aria-hidden="true" data-card-effect="pick">
          <span className={styles.pickAura} />
          <span className={styles.pickRays} />
          {CARD_PICK_SPARKS.map((style, index) => <span key={index} className={styles.pickSpark} style={style} />)}
        </span>}
        <span className={styles.cardSurface}>
          <img className={styles.artwork} src={artwork} alt="" draggable={false} />
          <span className={styles.category} data-long={(candidate.category || "CHALLENGE").length > 5}>{candidate.category || "CHALLENGE"}</span>
          <CardTitle>{candidate.title}</CardTitle>
        </span>
      </span>
    </span>
    <span className={styles.srOnly}>
      {candidate.clubName && `${candidate.clubName} `}
      {candidate.score != null && `${candidate.score.toLocaleString()}점 `}
      {opening ? "문제 여는 중" : "선택하기"}
    </span>
  </button>;
}

// Figma 104:502 "칸 눌럿음~": 광장 위 세 장의 금테 카드
// 문구는 이미지에 굽지 않고 현재 칸 API의 후보를 그대로 표시한다
export default function ChallengeSelection({ candidates, isMutating, onOpenChallenge, onClose, errorMessage }) {
  const titleId = useId();
  const dialog = useRef(null);
  const heading = useRef(null);
  const close = useRef(onClose);
  const locked = useRef(false);
  const keyHandler = useRef(null);
  const mounted = useRef(false);
  const pickAnimation = useRef(null);
  const reveal = useRef(null);
  const [openingId, setOpeningId] = useState(null);
  const [requestError, setRequestError] = useState("");
  const busy = isMutating || openingId !== null;
  close.current = onClose;

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.body.children]
      .filter(element => !element.contains(dialog.current))
      .map(element => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    const handleDialogKey = (event) => keyHandler.current?.(event);
    document.addEventListener("keydown", handleDialogKey, true);
    return () => {
      mounted.current = false;
      pickAnimation.current?.cancel();
      reveal.current?.cancel();
      document.removeEventListener("keydown", handleDialogKey, true);
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => { element.inert = inert; });
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, []);

  // 클릭한 카드가 disabled로 바뀌어도 포커스가 문서 바깥으로 빠지지 않도록 한다
  useEffect(() => { if (busy) heading.current?.focus({ preventScroll: true }); }, [busy]);
  useEffect(() => {
    if (requestError || errorMessage) heading.current?.focus({ preventScroll: true });
  }, [requestError, errorMessage]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!busy && !locked.current) close.current?.();
    }
    if (event.key !== "Tab") return;
    const buttons = [...dialog.current.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) { event.preventDefault(); return; }
    const index = buttons.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === buttons.length - 1)) { event.preventDefault(); buttons[0].focus(); }
  };
  keyHandler.current = handleKeyDown;

  const openChallenge = async (challengeId, face) => {
    if (busy || locked.current) return;
    locked.current = true;
    setOpeningId(challengeId);
    setRequestError("");
    try {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const animation = animateChallengeCardPick(face, reducedMotion);
      pickAnimation.current = animation;
      const presentation = createChallengeReveal(reducedMotion || window.matchMedia("(forced-colors: active)").matches);
      reveal.current = presentation;
      animation?.finished.catch(() => {});
      // 요청은 바로 보내고, 성공 응답 뒤의 화면 전환만 짧게 맞춘다
      await onOpenChallenge(challengeId, { beforeNavigate: presentation.wait });
    } catch {
      if (mounted.current) setRequestError("문제를 열지 못했어요 다시 선택해주세요");
    } finally {
      locked.current = false;
      pickAnimation.current?.cancel();
      pickAnimation.current = null;
      reveal.current?.cancel();
      reveal.current = null;
      if (mounted.current) setOpeningId(null);
    }
  };

  const content = <section ref={dialog} className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}>
    <div className={styles.scene} data-choice-layer="scene">
      <div className={styles.selection}>
        <h2 className={styles.srOnly} ref={heading} tabIndex={-1} id={titleId}>도전할 문제를 선택하세요</h2>
        <button type="button" className={styles.close} aria-label="문제 선택 닫기" disabled={busy} onClick={onClose}>
          <img src="/assets/board/icon-close-round.png" alt="" draggable={false} />
        </button>
        <div className={styles.cards} data-count={candidates.length} data-busy={busy}>
          {candidates.map((candidate, index) => <ChallengeCard key={candidate.challengeId}
            candidate={candidate} index={index} busy={busy}
            crumbling={openingId !== null && openingId !== candidate.challengeId}
            opening={openingId === candidate.challengeId} onChoose={openChallenge} />)}
        </div>
        <img className={styles.squirrel} src="/assets/board/selection-squirrel-refined.webp" alt="" aria-hidden="true" draggable={false} />
        {(requestError || errorMessage) && <p className={styles.feedback} role="alert">{requestError || errorMessage}</p>}
        <p className={styles.srOnly} role="status">{busy ? "선택한 문제를 열고 있습니다" : ""}</p>
      </div>
    </div>
  </section>;
  // 보드 무대의 transform 밖에서 화면 전체를 덮는다
  // 정적 렌더링 검수에서는 같은 내용을 포털 없이 제공한다
  return typeof document === "undefined" ? content : createPortal(content, document.body);
}

export function ReopenBoardEvent({ onClick, children }) {
  const button = useRef(null);
  useEffect(() => { button.current?.focus({ preventScroll: true }); }, []);
  return <button ref={button} type="button" className={styles.reopen} onClick={onClick}>{children}</button>;
}

export function ReopenChallengeSelection({ onClick }) {
  return <ReopenBoardEvent onClick={onClick}>문제 선택하기</ReopenBoardEvent>;
}
