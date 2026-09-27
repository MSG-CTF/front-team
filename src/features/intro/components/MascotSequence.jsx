import { useEffect, useRef, useState } from "react";
import useInView from "../hooks/useInView.js";
import { MotionControl, useMotion } from "./MotionProvider.jsx";

const POSES = ["ready", "throw", "land"];
const HOLD_MS = [1600, 850, 2200];

export default function MascotSequence() {
  const [ref, inView] = useInView(0.25);
  const images = useRef([]);
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(0);
  const { enabled, reduced } = useMotion();
  const activeFrame = reduced ? 0 : frame;
  const playing = ready && inView && enabled;
  useEffect(() => {
    let cancelled = false;
    Promise.all(images.current.map((image) => image.decode()))
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (reduced) setFrame(0);
  }, [reduced]);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(
      () => setFrame((value) => (value + 1) % POSES.length),
      HOLD_MS[frame],
    );
    return () => window.clearTimeout(timer);
  }, [playing, frame]);
  return (
    <figure
      ref={ref}
      className="overview-visual mascot-sequence"
      data-motion={playing ? "playing" : "paused"}
      data-current-pose={POSES[activeFrame]}
      aria-label="다람쥐가 세 시점에서 주사위를 굴리는 모션"
    >
      <div
        className="mascot-stage"
        role="img"
        aria-label="금빛 받침의 다람쥐가 주사위를 준비하고 던진 뒤 결과를 바라보는 장면"
      >
        {POSES.map((pose, index) => (
          <img
            key={pose}
            ref={(image) => {
              images.current[index] = image;
            }}
            className={`mascot-pose${index === activeFrame ? " is-active" : ""}`}
            src={`/assets/intro/mascot-dice-${pose}-v2.png`}
            width="1254"
            height="1254"
            alt=""
            data-pose={pose}
            decoding="async"
          />
        ))}
      </div>
      <MotionControl className="motion-toggle" hidden={!ready} />
    </figure>
  );
}
