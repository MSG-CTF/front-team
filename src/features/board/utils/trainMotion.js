const ACCEL_END = .36;
const BRAKE_START = .74;
const BRAKE_LENGTH = 1 - BRAKE_START;
const AREA = ACCEL_END / 2 + BRAKE_START - ACCEL_END + BRAKE_LENGTH / 2;

// 속도를 먼저 정하고 적분한 거리로 이동한다 출발/정속/감속 경계에서도 속도가 이어진다
export function getTrainMotion(progress) {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  if (t === 0 || t === 1) return { distanceRatio: t, speedRatio: 0 };
  if (t < ACCEL_END) {
    const u = t / ACCEL_END;
    return {
      distanceRatio: ACCEL_END * (u - Math.sin(Math.PI * u) / Math.PI) / 2 / AREA,
      speedRatio: (1 - Math.cos(Math.PI * u)) / 2,
    };
  }
  if (t <= BRAKE_START) return { distanceRatio: (ACCEL_END / 2 + t - ACCEL_END) / AREA, speedRatio: 1 };
  const u = (t - BRAKE_START) / BRAKE_LENGTH;
  return {
    distanceRatio: (ACCEL_END / 2 + BRAKE_START - ACCEL_END + BRAKE_LENGTH * (u + Math.sin(Math.PI * u) / Math.PI) / 2) / AREA,
    speedRatio: (1 + Math.cos(Math.PI * u)) / 2,
  };
}

export function trainTimeAtDistance(distanceRatio) {
  const target = Math.max(0, Math.min(1, Number.isFinite(distanceRatio) ? distanceRatio : 0));
  if (target === 0 || target === 1) return target;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;
    if (getTrainMotion(middle).distanceRatio < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

// 소리와 굴뚝 연기가 같은 거리 간격을 공유한다 프레임이 끊겨도 별도 반복 타이머는 없다
export function createTrainChuffPlan(duration) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 6400) return [];
  const count = Math.max(8, Math.min(22, Math.round(duration / 240)));
  return Array.from({ length: count }, (_, index) => {
    const progress = trainTimeAtDistance(.003 + index / (count - 1) * .994);
    return { at: progress * duration, speedRatio: getTrainMotion(progress).speedRatio, accent: index % 4 };
  });
}
