export const TRAIN_WORLD_SCALE = 67.75;
export const TRAIN_FLOOR_PROJECTION = 6.78 / Math.hypot(6.78, 8.6);
export const TRAIN_CAR_OFFSETS = [2.03, 3.92, 6.22];

export function relativeTrainCarPose(head, tail) {
  const dx = (tail.x - head.x) / TRAIN_WORLD_SCALE;
  const dz = (tail.y - head.y) / TRAIN_WORLD_SCALE / TRAIN_FLOOR_PROJECTION;
  const cos = Math.cos(head.heading);
  const sin = Math.sin(head.heading);
  return {
    x: cos * dx - sin * dz,
    z: sin * dx + cos * dz,
    heading: Math.atan2(Math.sin(tail.heading - head.heading), Math.cos(tail.heading - head.heading)),
  };
}
