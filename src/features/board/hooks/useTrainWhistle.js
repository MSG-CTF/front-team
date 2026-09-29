import { useCallback, useEffect, useRef, useState } from "react";
import { createTrainWhistlePlayer } from "../utils/trainWhistle.js";

const SOUND_KEY = "msgctf.board.train-sound";

export default function useTrainWhistle() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
  });
  const enabledRef = useRef(enabled);
  const player = useRef(null);
  const prepare = useCallback(() => {
    if (!enabledRef.current) return;
    player.current ??= createTrainWhistlePlayer();
    player.current.prepare();
  }, []);
  const stop = useCallback(() => { player.current?.stop(); }, []);
  const play = useCallback((journey) => {
    if (enabledRef.current && !document.hidden) player.current?.play(journey);
  }, []);
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    if (!next) stop();
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* 저장 불가 시 현재 화면에만 적용 */ }
  }, [stop]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      player.current?.dispose();
      player.current = null;
    };
  }, [stop]);
  return { enabled, toggle, prepare, play, stop };
}
