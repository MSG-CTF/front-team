import useInView from "../hooks/useInView.js";
import { useMotion } from "./MotionProvider.jsx";

export default function AutumnLeaves() {
  const [ref, inView] = useInView();
  const { enabled } = useMotion();
  return (
    <div
      ref={ref}
      className="autumn-leaves"
      data-playing={enabled && inView}
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}
