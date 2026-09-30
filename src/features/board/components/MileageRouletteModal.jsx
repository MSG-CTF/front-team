import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ROULETTE_SEGMENTS,
  getRouletteRotation,
  getRouletteSegmentGeometry,
} from "../utils/boardOverlays.js";
import styles from "./MileageRouletteModal.module.css";

const SPIN_DURATION_MS = 3200;

// 데스크톱은 Figma 555:306 원본 패널을 사용한다
// 모바일에서는 같은 원판과 버튼을 세로로 배치한다 결과는 서버 값만 사용한다
export default function MileageRouletteModal({ event, isMutating, onSpin, onClose, errorMessage }) {
  const id = `mileage-roulette-${useId().replace(/:/g, "")}`;
  // 닫았다 다시 연 결과는 재추첨하거나 애니메이션을 다시 기다리지 않는다
  const [initialResult] = useState(() => event.status === "success" ? {
    token: event.token,
    value: event.result?.mileageGained,
    rotation: getRouletteRotation(event.result?.mileageGained, 0, () => 0),
  } : null);
  const [rotation, setRotation] = useState(initialResult?.rotation ?? 0);
  const [isSettling, setIsSettling] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [spinError, setSpinError] = useState("");
  const [revealedToken, setRevealedToken] = useState(initialResult?.token ?? null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rotationRef = useRef(rotation);
  const targetRef = useRef(initialResult);
  const revealedRef = useRef(initialResult?.token ?? null);
  const requestRef = useRef(false);
  const mountedRef = useRef(false);
  const wheelRef = useRef(null);
  const panelRef = useRef(null);
  const confirmRef = useRef(null);

  const isSuccess = event.status === "success";
  const mileageGained = event.result?.mileageGained;
  const isSpinning = (isMutating || isRequesting) && !isSuccess;
  const showResult = isSuccess && revealedToken === event.token;
  const isBusy = isSpinning || isSettling || (isSuccess && !showResult);
  const chancesLeft = isSuccess ? 0 : 1;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected && typeof trigger.focus === "function") trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (showResult) confirmRef.current?.focus({ preventScroll: true });
  }, [showResult]);

  useEffect(() => {
    if (isBusy) panelRef.current?.focus({ preventScroll: true });
  }, [isBusy]);

  // 응답 대기 중의 회전각을 유지하고 그 위치부터 감속한다
  useEffect(() => {
    if (!isSpinning || reducedMotion) return undefined;
    let frame;
    let previous = null;
    const advance = (now) => {
      if (previous !== null) rotationRef.current += Math.min(now - previous, 64) * 0.4;
      previous = now;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
      frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [isSpinning, reducedMotion]);

  useEffect(() => {
    if (!isSuccess) return undefined;
    const token = event.token;
    if (targetRef.current?.token !== token || targetRef.current?.value !== mileageGained) {
      targetRef.current = { token, value: mileageGained, rotation: getRouletteRotation(mileageGained, rotationRef.current) };
    }
    const next = targetRef.current.rotation;
    const reveal = () => {
      setIsSettling(false);
      revealedRef.current = token;
      setRevealedToken(token);
    };
    if (next == null || reducedMotion || revealedRef.current === token) {
      if (next != null) {
        rotationRef.current = next;
        setRotation(next);
      }
      reveal();
      return undefined;
    }
    setRotation(rotationRef.current);
    setIsSettling(false);
    let timer;
    const frame = window.requestAnimationFrame(() => {
      rotationRef.current = next;
      setIsSettling(true);
      setRotation(next);
      timer = window.setTimeout(reveal, SPIN_DURATION_MS);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [event.token, isSuccess, mileageGained, reducedMotion]);

  const spin = async () => {
    if (requestRef.current || isMutating || isSuccess || isSettling) return;
    requestRef.current = true;
    setIsRequesting(true);
    setSpinError("");
    try {
      await onSpin(event.token);
    } catch {
      if (mountedRef.current) setSpinError("룰렛을 돌리지 못했어요 다시 시도해주세요");
    } finally {
      requestRef.current = false;
      if (mountedRef.current) setIsRequesting(false);
    }
  };

  const handleKeyDown = (keyEvent) => {
    if (keyEvent.key === "Escape") { keyEvent.preventDefault(); onClose(); }
    if (keyEvent.key !== "Tab") return;
    const buttons = [...panelRef.current.querySelectorAll("button:not([disabled])")];
    if (!buttons.length) { keyEvent.preventDefault(); return; }
    const first = buttons[0];
    const last = buttons.at(-1);
    const index = buttons.indexOf(document.activeElement);
    if (keyEvent.shiftKey && index <= 0) { keyEvent.preventDefault(); last.focus(); }
    else if (!keyEvent.shiftKey && (index < 0 || index === buttons.length - 1)) { keyEvent.preventDefault(); first.focus(); }
  };

  const message = showResult
    ? <><strong className={styles.reward}>+{mileageGained} M</strong><span>마일리지를 받았어요</span><span className={styles.total}>보유 마일리지 {event.result?.totalMileage ?? "-"} M</span></>
    : isBusy
      ? "룰렛이 돌아가는 중입니다"
      : spinError || errorMessage || "룰렛을 돌려 마일리지를 받아보세요";

  const view = (
    <div className={styles.backdrop} role="presentation">
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-status`}
        aria-busy={isBusy} className={styles.panel} onKeyDown={handleKeyDown} tabIndex={-1}>
        <img src="/assets/board/roulette-panel.png" alt="" aria-hidden="true" className={styles.panelArtwork} />
        <h2 id={`${id}-title`} className={styles.title}>MILEAGE ROULETTE</h2>
        <button type="button" onClick={onClose} aria-label="룰렛 닫기" title="닫기" className={styles.close}>
          <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" />
        </button>

        <div className={styles.wheelArea} aria-hidden="true">
          <div ref={wheelRef} className={styles.wheel}
            data-roulette-rotation={rotation} data-roulette-settling={isSettling}
            style={{ transform: `rotate(${rotation}deg)`, transition: isSettling ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.7, 0.18, 1)` : "none" }}>
            <svg viewBox="0 0 320 320" width="320" height="320" focusable="false">
              <defs>
                <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#f2dc9b" /><stop offset="0.42" stopColor="#9c6b2c" /><stop offset="0.7" stopColor="#e2c17c" /><stop offset="1" stopColor="#795023" />
                </linearGradient>
                <radialGradient id={`${id}-hub`}>
                  <stop stopColor="#886842" /><stop offset="1" stopColor="#382314" />
                </radialGradient>
              </defs>
              <circle cx="160" cy="160" r="156" fill={`url(#${id}-gold)`} stroke="#4b2c15" strokeWidth="3" />
              <circle cx="160" cy="160" r="147" fill="#3e1711" />
              {ROULETTE_SEGMENTS.map((value, index) => {
                const geometry = getRouletteSegmentGeometry(index);
                return <g key={index} data-roulette-segment={index} data-roulette-value={value}>
                  <path d={geometry.path} fill={index % 2 === 0 ? "#71231f" : "#ebddbd"} stroke="#b79764" strokeWidth="0.7" />
                  <g transform={`translate(${geometry.labelX} ${geometry.labelY}) rotate(${geometry.labelAngle})`}
                    fill={index % 2 === 0 ? "#f4e6c8" : "#422411"} textAnchor="middle" className={styles.segmentLabel}>
                    <text fontSize="22" fontWeight="700">{value}</text><text y="15" fontSize="11" letterSpacing="2">M</text>
                  </g>
                </g>;
              })}
              <circle cx="160" cy="160" r="144" fill="none" stroke="#f0d494" strokeWidth="1.5" />
              <circle cx="160" cy="160" r="50" fill={`url(#${id}-gold)`} stroke="#4b2c15" strokeWidth="2" />
              <circle cx="160" cy="160" r="45" fill={`url(#${id}-hub)`} stroke="#d1ad65" />
              <path d="M160 128 L165 153 L186 160 L165 165 L160 190 L155 165 L134 160 L155 153 Z" fill="#dfc58a" stroke="#ac8547" />
              <circle cx="160" cy="160" r="4" fill="#572c19" stroke="#f0d99c" />
            </svg>
          </div>
          <svg className={styles.pointer} viewBox="0 0 36 48" focusable="false">
            <path d="M4 6 L32 6 L18 43 Z" fill="#c19a52" stroke="#623b1e" strokeWidth="2" />
            <path d="M9 9 L27 9 L18 33 Z" fill="#ecd598" />
            <circle cx="18" cy="7" r="5" fill="#96392c" stroke="#e2bd75" strokeWidth="2" />
          </svg>
        </div>

        <p id={`${id}-status`} className={`${styles.status}${showResult ? ` ${styles.resultStatus}` : ""}`} role="status" aria-live="polite">{message}</p>
        <div className={styles.chances} aria-label={`남은 기회 ${chancesLeft} / 1`}>
          <span className={styles.chancesLabel} aria-hidden="true">남은 기회</span>
          <span className={styles.chancesValue} aria-hidden="true">
            <span>{chancesLeft}</span><span className={styles.chancesSeparator}>/</span><span>1</span>
          </span>
        </div>
        <div className={styles.action}>
          {showResult ? <button ref={confirmRef} type="button" onClick={onClose} className={styles.confirm}>확인</button>
            : <button type="button" onClick={spin} disabled={isBusy || isSuccess}
              aria-label={isBusy ? "룰렛 돌리는 중" : "룰렛 돌리기(SPIN)"} className={styles.spin}>
              <img src="/assets/board/roulette-spin-button.png" alt="" aria-hidden="true" />
            </button>}
        </div>
        <p className={`${styles.luck}${showResult ? ` ${styles.luckResult}` : ""}`} aria-hidden="true">
          {showResult ? `보유 마일리지 ${event.result?.totalMileage ?? "-"} M` : "Try your Luck"}
        </p>
      </section>
    </div>
  );
  return typeof document === "undefined" ? view : createPortal(view, document.body);
}
