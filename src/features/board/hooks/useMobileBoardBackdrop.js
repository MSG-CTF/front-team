import { useEffect } from "react";
import { getMobileBoardBackdrop, getMobileBoardFitWidth } from "../utils/boardViewport.js";

export default function useMobileBoardBackdrop(frameRef, viewportRef) {
  useEffect(() => {
    const frame = frameRef.current, viewport = viewportRef.current;
    const scene = viewport?.querySelector('[data-board-layer="scene"]');
    if (!frame || !viewport || !scene) return;
    let scheduled;
    const update = () => {
      scheduled = undefined;
      if (!window.matchMedia("(max-width: 1100px)").matches) return;
      const bounds = frame.getBoundingClientRect(), board = scene.getBoundingClientRect();
      if (!board.width || !board.height) return;
      // Rects include ancestor zoom; CSS pixel offsets must use the unscaled frame.
      const scale = bounds.width / parseFloat(getComputedStyle(frame).width);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const viewportBounds = viewport.getBoundingClientRect();
      const fitSceneWidth = getMobileBoardFitWidth(viewport.clientWidth, window.innerHeight);
      const fitSceneHeight = fitSceneWidth * 960 / 951;
      const fitSceneLeft = (viewportBounds.left - bounds.left) / scale + (viewport.clientWidth - fitSceneWidth) / 2;
      const fitFrameHeight = Math.max(window.innerHeight, (bounds.height - viewportBounds.height) / scale + fitSceneHeight);
      const image = getMobileBoardBackdrop({
        width: bounds.width / scale, height: bounds.height / scale,
        sceneLeft: (board.left - bounds.left) / scale, sceneTop: (board.top - bounds.top) / scale,
        sceneWidth: board.width / scale, sceneHeight: board.height / scale,
        fitSceneWidth, fitSceneLeft, fitFrameHeight,
      });
      for (const key of ["left", "top", "width", "height"]) frame.style.setProperty(`--mobile-background-${key}`, `${image[key]}px`);
    };
    const schedule = () => { if (scheduled === undefined) scheduled = requestAnimationFrame(update); };
    const observer = new ResizeObserver(update);
    // Status text and navigation can change the scene's top without changing its own size.
    [frame, viewport, scene, ...frame.lastElementChild.children].forEach(node => observer.observe(node));
    viewport.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", update);
      if (scheduled !== undefined) cancelAnimationFrame(scheduled);
    };
  }, [frameRef, viewportRef]);
}
