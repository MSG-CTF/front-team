import { useEffect } from "react";

export default function useBoardTextLayout(frameRef) {
  useEffect(() => {
    const frame = frameRef.current;
    const stage = frame?.lastElementChild;
    const nav = frame?.querySelector('nav[aria-label="대회 메뉴"]');
    if (!frame || !stage || !nav) return;

    let scheduled;
    const update = () => {
      scheduled = undefined;
      // Text autosizing changes computed font sizes without shrinking CSS
      // container queries. Use the available width per normal-size character.
      const textScale = parseFloat(getComputedStyle(stage).fontSize) / 16;
      const textWidth = stage.clientWidth / textScale;
      const compact = window.matchMedia("(max-width: 1100px)").matches
        && textScale > 1 && textWidth <= 280;
      const layout = compact ? (textWidth <= 140 ? "stacked" : "compact") : "";
      if (frame.dataset.boardTextLayout !== layout) {
        if (layout) frame.dataset.boardTextLayout = layout;
        else delete frame.dataset.boardTextLayout;
      }
    };
    const schedule = () => {
      if (scheduled === undefined) scheduled = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    [stage, nav, ...nav.querySelectorAll("a > span, summary > span")]
      .forEach(node => observer.observe(node));
    window.addEventListener("resize", schedule);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (scheduled !== undefined) cancelAnimationFrame(scheduled);
      delete frame.dataset.boardTextLayout;
    };
  }, [frameRef]);
}
