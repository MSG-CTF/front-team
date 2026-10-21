// 축 글자를 실제 표시 크기로 측정해 모바일 확대 시에도 눈금 사이를 확보한다.
export function getScoreGraphLayout({ width, height, compact, labels = {} }) {
  const plot = compact
    ? {
      left: Math.max(54, (labels.scoreWidth || 0) + 8),
      top: Math.max(62, (labels.controlsHeight || 0) + 18),
      right: Math.max(24, (labels.timeWidth || 0) / 2 + 4),
      bottom: Math.max(48, (labels.timeHeight || 0) + 21),
    }
    : { left: 42, top: 30, right: 4, bottom: 48 };
  const plotWidth = Math.max(1, width - plot.left - plot.right);
  const timeTicks = compact && plotWidth < (labels.timeWidth || 0) * 2.5 ? 2 : compact ? 3 : 5;
  const timeLabelStep = compact && timeTicks === 2 && plotWidth < (labels.timeWidth || 0) + 8
    ? (labels.timeHeight || 20) + 4 : 0;
  plot.bottom += timeLabelStep;
  const plotHeight = Math.max(1, height - plot.top - plot.bottom);
  return {
    plot,
    plotWidth,
    plotHeight,
    timeTicks,
    timeLabelStep,
    scoreTicks: compact
      ? [6, 5, 3, 2].find(count => count <= Math.max(2, Math.floor(plotHeight / ((labels.scoreHeight || 20) + 8)) + 1))
      : 6,
    scoreOffset: compact ? (labels.scoreHeight || 20) / 2 : 10,
  };
}
