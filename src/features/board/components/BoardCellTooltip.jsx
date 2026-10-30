import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CELL_TYPE, CELL_TYPE_LABEL } from "../../../constants/enums.js";
import { getBoardCellTooltipPosition, getBoardCellTooltipTail } from "../utils/boardCellTooltip.js";
import "../../../styles/pretendard/tooltip.generated.css";
import styles from "./BoardCellTooltip.module.css";

export default function BoardCellTooltip({ hovered, id, onDismiss }) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    if (!hovered || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const next = getBoardCellTooltipPosition(hovered.anchor, { width, height }, {
      width: window.innerWidth, height: window.innerHeight,
    });
    setPosition({ ...next, tail: getBoardCellTooltipTail(hovered.anchor, { width, height }, next) });
  }, [hovered]);
  useEffect(() => {
    if (!hovered) return;
    const dismissOnEscape = event => { if (event.key === "Escape") onDismiss(); };
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("blur", onDismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("blur", onDismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [hovered, onDismiss]);
  if (!hovered || typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} id={id} role="tooltip" className={styles.tooltip}
      data-tail={position?.tail.side}
      style={{ left: position?.left, top: position?.top, "--tail-left": `${position?.tail.offset ?? 20}px`, visibility: position ? "visible" : "hidden" }}>
      {/* 백엔드 타입 값 대신 규칙 화면의 칸 이름을 보이고 난이도는 문제 칸에만 붙인다 */}
      <dl><div><dt>유형</dt><dd>{CELL_TYPE_LABEL[hovered.cell.type] ?? "-"}</dd></div>
        {hovered.cell.type === CELL_TYPE.CHALLENGE && <div><dt>난이도</dt><dd>{hovered.cell.difficulty || "-"}</dd></div>}</dl>
    </div>, document.body,
  );
}
