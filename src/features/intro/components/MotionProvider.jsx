import { createContext, useContext, useEffect, useState } from "react";
import useMediaQuery from "../hooks/useMediaQuery.js";

const MotionContext = createContext(null);

export function MotionProvider({ children }) {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    const hide = () => setVisible(false);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("pagehide", hide);
    };
  }, []);
  const enabled = !paused && visible && !reduced;
  return (
    <MotionContext.Provider
      value={{
        paused,
        reduced,
        enabled,
        mode: reduced ? "reduced" : enabled ? "enabled" : "paused",
        toggle: () => setPaused((value) => !value),
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}

export const useMotion = () => useContext(MotionContext);

export function MotionControl({ className = "", hidden = false }) {
  const { paused, reduced, toggle } = useMotion();
  const label = paused ? "화면 모션 재생" : "화면 모션 일시정지";
  return (
    <button
      type="button"
      className={`${className} motion-control`}
      data-paused={paused}
      aria-label={label}
      title={label}
      hidden={hidden || reduced}
      onClick={toggle}
    >
      <svg
        className="motion-pause"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
      </svg>
      <svg
        className="motion-play"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m7 4 13 8-13 8z" />
      </svg>
    </button>
  );
}
