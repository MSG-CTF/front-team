export function clampRange(range, fullRange) {
  const [fullStart, fullEnd] = fullRange;
  if (!Number.isFinite(fullStart) || !Number.isFinite(fullEnd) || fullEnd <= fullStart) return null;
  if (!range || !range.every(Number.isFinite)) return [...fullRange];
  const fullSpan = fullEnd - fullStart;
  const minSpan = Math.min(fullSpan, Math.max(1000, fullSpan / 100));
  const span = Math.min(fullSpan, Math.max(minSpan, Math.abs(range[1] - range[0])));
  const center = (range[0] + range[1]) / 2;
  const start = Math.max(fullStart, Math.min(fullEnd - span, center - span / 2));
  return [start, start + span];
}

export function zoomRange(range, fullRange, factor) {
  const current = clampRange(range, fullRange);
  if (!current || !(factor > 0)) return current;
  const center = (current[0] + current[1]) / 2;
  const halfSpan = (current[1] - current[0]) * factor / 2;
  return clampRange([center - halfSpan, center + halfSpan], fullRange);
}

export function rangeFromDrag(startX, endX, plotWidth, currentRange) {
  if (!currentRange || !(plotWidth > 0) || Math.abs(endX - startX) < 8) return null;
  const clampX = (value) => Math.max(0, Math.min(plotWidth, value));
  const toTime = (value) => currentRange[0] + clampX(value) / plotWidth * (currentRange[1] - currentRange[0]);
  return [toTime(Math.min(startX, endX)), toTime(Math.max(startX, endX))];
}

export function tooltipLeft(anchorX, plotLeft, plotRight, width, gap = 16) {
  const preferred = anchorX + gap + width <= plotRight ? anchorX + gap : anchorX - gap - width;
  return Math.max(plotLeft, Math.min(plotRight - width, preferred));
}

export function rankingPageWindow(page, count) {
  const visible = Math.min(5, count);
  const first = Math.max(1, Math.min(page - 2, count - visible + 1));
  return Array.from({ length: visible }, (_, index) => first + index);
}
