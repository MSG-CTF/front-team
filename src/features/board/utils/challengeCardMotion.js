export const CARD_PICK_DURATION = 240;

// 흔들린 삼각 분할을 공유해 조각 사이가 겹치거나 네모 격자로 남지 않게 한다
export function createCardFragments(columns = 2, rows = 3) {
  const vertices = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => ({
      x: (column + (column > 0 && column < columns ? Math.sin(row * 19 + column * 7) * .22 : 0)) / columns * 100,
      y: (row + (row > 0 && row < rows ? Math.cos(row * 11 + column * 13) * .22 : 0)) / rows * 100,
    })));
  const fragments = [];
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = vertices[row][column];
    const b = vertices[row][column + 1];
    const c = vertices[row + 1][column + 1];
    const d = vertices[row + 1][column];
    const triangles = (row + column) % 2 ? [[a, b, d], [b, c, d]] : [[a, b, c], [a, c, d]];
    for (const triangle of triangles) {
      const x = triangle.reduce((sum, point) => sum + point.x, 0) / 3;
      const y = triangle.reduce((sum, point) => sum + point.y, 0) / 3;
      const left = Math.min(...triangle.map(point => point.x));
      const top = Math.min(...triangle.map(point => point.y));
      const width = Math.max(...triangle.map(point => point.x)) - left;
      const height = Math.max(...triangle.map(point => point.y)) - top;
      const seed = Math.sin(fragments.length * 43.17);
      fragments.push({
        // 조각마다 카드 전체를 복제하지 않고 해당 삼각형의 경계만 그린다
        left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
        backgroundSize: `${10000 / width}% ${10000 / height}%`,
        backgroundPosition: `${width < 100 ? left / (100 - width) * 100 : 0}% ${height < 100 ? top / (100 - height) * 100 : 0}%`,
        clipPath: `polygon(${triangle.map((point) => `${(point.x - left) / width * 100}% ${(point.y - top) / height * 100}%`).join(",")})`,
        transformOrigin: `${(x - left) / width * 100}% ${(y - top) / height * 100}%`,
        "--shard-x": `${((x - 50) * .7 + seed * 13) / width * 100}%`,
        "--shard-y": `${(-18 - (100 - y) * .36 + seed * 9) / height * 100}%`,
        "--shard-spin": `${seed * 72}deg`,
        "--shard-delay": `${Math.round((100 - y) * .55)}ms`,
      });
    }
  }
  return fragments;
}

export const CARD_CRUMBLE_FRAGMENTS = createCardFragments();

// 0.5px씩 줄이며 수십 번 강제 레이아웃하지 않도록 최대 8번만 측정한다
export function fitCardTitleSize(maximum, fits) {
  const minimum = Math.min(maximum, 12);
  if (fits(maximum)) return maximum;
  if (!fits(minimum)) return minimum;
  let low = minimum;
  let high = maximum;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return Math.floor(low * 100) / 100;
}

export const CARD_PICK_SPARKS = Array.from({ length: 14 }, (_, index) => {
  const angle = index / 14 * Math.PI * 2 - Math.PI / 2;
  const distance = 18 + index % 3 * 6;
  return {
    "--spark-left": `${50 + Math.cos(angle) * 46}%`,
    "--spark-top": `${50 + Math.sin(angle) * 47}%`,
    "--spark-x": `${Math.cos(angle) * distance}px`,
    "--spark-y": `${Math.sin(angle) * distance - 8}px`,
    "--spark-size": `${index % 3 === 0 ? 7 : 3}px`,
    "--spark-delay": `${index % 3 * 18}ms`,
  };
});

export function getChallengeCardTilt(clientX, clientY, bounds) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0 ||
      ![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)) {
    return { x: 0, y: 0 };
  }
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  return {
    x: -clamp((clientY - bounds.top) / bounds.height * 2 - 1) * 4,
    y: clamp((clientX - bounds.left) / bounds.width * 2 - 1) * 5,
  };
}

export function animateChallengeCardPick(element, reducedMotion = false) {
  if (reducedMotion || !element?.animate) return null;
  try {
    return element.animate([
      { transform: "translate3d(0, -2px, 0) scale(.98)", offset: 0 },
      { transform: "translate3d(0, -27px, 0) rotateZ(-1.2deg) scale(1.09)", offset: 0.72 },
      { transform: "translate3d(0, -20px, 0) rotateZ(0deg) scale(1.065)", offset: 1 },
    ], { duration: CARD_PICK_DURATION, easing: "cubic-bezier(.2,.7,.25,1)" });
  } catch {
    // 장식 재생 실패가 문제 열기 요청을 막아서는 안 된다
    return null;
  }
}
