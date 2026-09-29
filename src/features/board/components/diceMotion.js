import { Euler, Quaternion, Vector3 } from "three";
import { faceUpQuaternion } from "./diceOrientation.js";

export const DICE_FLOOR_Y = -1.2;
export const DICE_HALF_EXTENT = 1.105; // dice.glb 장식과 눈금을 포함한 최대 반경
export const DICE_STARTS = [
  { position: [-1.4, 0, 0.12], face: 5, yaw: -0.32, scale: 0.95 },
  { position: [1.4, 0, -0.08], face: 3, yaw: 0.4, scale: 0.91 },
];
const up = new Vector3(0, 1, 0);
const clamp = (value) => Math.max(0, Math.min(value, 1));
const easeOut = (value) => 1 - (1 - value) ** 3;

export function dieSupportHeight(quaternion, scale = 1) {
  const localUp = up.clone().applyQuaternion(quaternion.clone().invert());
  return (Math.abs(localUp.x) + Math.abs(localUp.y) + Math.abs(localUp.z)) * DICE_HALF_EXTENT * scale;
}

export function restingDie(index) {
  const start = DICE_STARTS[index];
  const quaternion = faceUpQuaternion(start.face, start.yaw);
  const position = new Vector3(...start.position);
  position.y = DICE_FLOOR_Y + dieSupportHeight(quaternion, start.scale);
  return { position, quaternion };
}

// 결과 눈금은 서버 값만 사용하고 임의성은 방향과 타이밍에만 사용한다
export function createDiceMotion(current, result, random = Math.random) {
  if (![result?.diceA, result?.diceB].every((face) => Number.isInteger(face) && face >= 1 && face <= 6)) return null;
  const farther = random() < 0.5 ? 0 : 1;
  return current.map((start, index) => {
    const face = index === 0 ? result.diceA : result.diceB;
    const yaw = (index === 0 ? 0.3 : -0.4) + (random() - 0.5) * 0.25;
    const target = faceUpQuaternion(face, yaw);
    const fromEuler = new Euler().setFromQuaternion(start.quaternion, "XYZ");
    const toEuler = new Euler().setFromQuaternion(target, "XYZ");
    const turns = index === 0 ? [2, 1, -1] : [-1, 2, 1];
    const end = new Vector3((index === 0 ? -1 : 1) * (2.55 + random() * 0.3), 0, index === farther ? -1.8 - random() * 0.2 : -0.85 - random() * 0.25);
    return {
      start: start.position.clone(), startQuaternion: start.quaternion.clone(),
      end, target, scale: DICE_STARTS[index].scale,
      rotation: ["x", "y", "z"].map((axis, i) => ({ from: fromEuler[axis], delta: toEuler[axis] - fromEuler[axis] + turns[i] * Math.PI * 2 })),
      delay: index === 0 ? 0 : 0.07 + random() * 0.025,
      duration: 1.32 + index * 0.08 + random() * 0.07,
      lift: 0.52 + random() * 0.14,
      sway: (index === 0 ? -1 : 1) * (0.12 + random() * 0.08),
      rockDirection: index === 0 ? 1 : -1,
    };
  });
}

export function sampleDiceMotion(motion, elapsed, reducedMotion = false) {
  const t = reducedMotion ? 1 : clamp((elapsed - motion.delay) / motion.duration);
  if (t === 0) return { position: motion.start.clone(), quaternion: motion.startQuaternion.clone(), phase: "throw", done: false };
  const spin = easeOut(clamp(t / 0.82));
  const quaternion = t >= 0.82 ? motion.target.clone() : new Quaternion().setFromEuler(new Euler(...motion.rotation.map((axis) => axis.from + axis.delta * spin), "XYZ"));
  if (t > 0.82 && t < 1) {
    const settle = (t - 0.82) / 0.18;
    const rock = Math.sin(settle * Math.PI * 3) * (1 - settle) ** 2 * 0.075 * motion.rockDirection;
    quaternion.premultiply(new Quaternion().setFromEuler(new Euler(rock, 0, rock * 0.65)));
  }
  const travel = t < 0.82 ? 0.97 * easeOut(t / 0.82) : 0.97 + 0.03 * easeOut((t - 0.82) / 0.18);
  const position = motion.start.clone().lerp(motion.end, travel);
  position.x += motion.sway * Math.sin(Math.PI * t) * (1 - t);
  let lift = 0;
  if (t < 0.55) lift = motion.lift * Math.sin(Math.PI * t / 0.55);
  else if (t < 0.74) lift = 0.16 * Math.sin(Math.PI * (t - 0.55) / 0.19);
  else if (t < 0.86) lift = 0.055 * Math.sin(Math.PI * (t - 0.74) / 0.12);
  position.y = DICE_FLOOR_Y + dieSupportHeight(quaternion, motion.scale) + Math.max(0, lift);
  return { position, quaternion, phase: t < 0.55 ? "throw" : t < 0.82 ? "bounce" : t < 1 ? "settle" : "rest", done: t === 1 };
}
