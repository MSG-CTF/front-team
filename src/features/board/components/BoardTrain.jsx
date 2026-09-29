import { useEffect, useRef } from "react";
import { sampleTrainJourney } from "../utils/trainJourney.js";
import styles from "./BoardTrain.module.css";

let rendererModule;
export function preloadBoardTrain() {
  rendererModule ??= import("./trainRenderer.js").catch(() => { rendererModule = null; return null; });
  return rendererModule;
}

export default function BoardTrain({ journey, onComplete, onProgress, onStart, onStop }) {
  const actor = useRef(null);
  const canvas = useRef(null);
  const callbacks = useRef({ onComplete, onProgress, onStart, onStop });
  callbacks.current = { onComplete, onProgress, onStart, onStop };
  useEffect(() => {
    let disposed = false;
    let renderer;
    let frame;
    const finish = () => { if (!disposed) callbacks.current.onComplete(); };
    preloadBoardTrain().then((module) => {
      if (disposed) return;
      if (!module) { finish(); return; }
      try {
        renderer = module.createTrainRenderer(canvas.current);
        // 첫 셰이더 준비 시간이 실제 주행 시간을 줄이지 않도록 먼저 한 프레임 준비한다
        renderer.render(sampleTrainJourney(journey, 0), 0, 0);
        callbacks.current.onStart?.();
        const start = performance.now();
        const animate = (now) => {
          if (disposed) return;
          try {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / journey.duration);
            const pose = sampleTrainJourney(journey, progress);
            const previousPose = sampleTrainJourney(journey, Math.max(0, progress - .035));
            pose.turn = Math.atan2(Math.sin(previousPose.heading - pose.heading), Math.cos(previousPose.heading - pose.heading));
            actor.current.style.left = `${pose.x}%`;
            actor.current.style.top = `${pose.y}%`;
            actor.current.style.opacity = Math.min(1, elapsed / 140, (journey.duration - elapsed) / 110).toString();
            renderer.render(pose, elapsed, progress);
            callbacks.current.onProgress?.(pose);
            if (progress < 1) frame = requestAnimationFrame(animate);
            else finish();
          } catch (error) { if (import.meta.env.DEV) console.warn("기차 프레임 생략", error); finish(); }
        };
        frame = requestAnimationFrame(animate);
      } catch (error) { if (import.meta.env.DEV) console.warn("기차 렌더러 생략", error); finish(); }
    });
    const contextLost = (event) => { event.preventDefault(); finish(); };
    const element = canvas.current;
    element.addEventListener("webglcontextlost", contextLost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      callbacks.current.onStop?.();
      element.removeEventListener("webglcontextlost", contextLost);
      renderer?.dispose();
    };
  }, [journey]);
  const start = sampleTrainJourney(journey, 0);
  return <div ref={actor} className={styles.actor} style={{ left: `${start.x}%`, top: `${start.y}%` }} aria-hidden="true" data-board-train="moving">
    <canvas ref={canvas} className={styles.canvas} />
  </div>;
}
