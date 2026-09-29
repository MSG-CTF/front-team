import { useCallback, useEffect, useRef, useState } from "react";
import { createTrainJourney } from "../utils/trainJourney.js";

export default function useTrainTravel() {
  const [journey, setJourney] = useState(null);
  const pending = useRef(null);
  const mounted = useRef(false);
  const finish = useCallback(() => {
    const current = pending.current;
    pending.current = null;
    if (current) { clearTimeout(current.timer); current.resolve(); }
    if (mounted.current) setJourney(null);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skip = () => { if (document.hidden || reduce.matches) finish(); };
    document.addEventListener("visibilitychange", skip);
    reduce.addEventListener("change", skip);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", skip);
      reduce.removeEventListener("change", skip);
      finish();
    };
  }, [finish]);
  const play = useCallback((result) => {
    finish();
    if (!mounted.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    const next = createTrainJourney(result);
    if (!next) return Promise.resolve();
    return new Promise((resolve) => {
      // WebGL이나 지연 로딩이 실패해도 이동 잠금이 남지 않도록 한다
      pending.current = { resolve, timer: setTimeout(finish, 4800) };
      setJourney(next);
    });
  }, [finish]);
  return { journey, play, finish };
}
