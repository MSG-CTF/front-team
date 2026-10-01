import { Quaternion } from "three/src/math/Quaternion.js";
import { Vector3 } from "three/src/math/Vector3.js";
import { FACE_NORMALS, faceUpQuaternion } from "./diceOrientation.js";

export const DICE_FLOOR_Y = 0;
export const DICE_HALF_EXTENT = 1.105;
export const DICE_CAMERA = { position: [0, 19.58, 27.36], fov: 26, near: 0.1, far: 70 };
export const DICE_LOOK_AT = [0, 0.5, 0];
export const DICE_STARTS = [
  { position: [-0.85, 0, 0.12], face: 5, yaw: -0.32, scale: 0.46 },
  { position: [0.85, 0, -0.08], face: 3, yaw: 0.4, scale: 0.46 },
];
export const DICE_CANVAS_ASPECT = (951 / 714) * 1.1 / 1.44;
export const STEP = 1 / 120;
export const SETTLE_TIME = 0.08;
export const GROUND_TRANSITION = 0.18;
const up = new Vector3(0, 1, 0);
const clamp = value => Math.max(0, Math.min(value, 1));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

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

export function faceCorrection(face, quaternion) {
  const topFace = Object.keys(FACE_NORMALS).reduce((best, candidate) =>
    new Vector3(...FACE_NORMALS[candidate]).applyQuaternion(quaternion).y > new Vector3(...FACE_NORMALS[best]).applyQuaternion(quaternion).y ? candidate : best,
  "1");
  return new Quaternion().setFromUnitVectors(new Vector3(...FACE_NORMALS[face]), new Vector3(...FACE_NORMALS[topFace]));
}

export function immediateDiceResult(current, result) {
  if (![result?.diceA, result?.diceB].every(face => Number.isInteger(face) && face >= 1 && face <= 6)) return null;
  return current.map((pose, index) => ({
    end: pose.position.clone(),
    target: pose.quaternion.clone().multiply(faceCorrection(index === 0 ? result.diceA : result.diceB, pose.quaternion)),
    scale: DICE_STARTS[index].scale, duration: 0,
  }));
}

export function dicePhysicalTime(motion, elapsed) {
  if (elapsed <= motion.groundAt) return elapsed;
  const afterContact = elapsed - motion.groundAt;
  const transition = Math.min(afterContact, GROUND_TRANSITION);
  return motion.groundAt + transition - (1 - motion.groundRate) * transition ** 2 / (2 * GROUND_TRANSITION)
    + Math.max(0, afterContact - GROUND_TRANSITION) * motion.groundRate;
}

export function sampleDiceMotion(motion, elapsed, reducedMotion = false) {
  if (reducedMotion || elapsed >= motion.duration) return { position: motion.end.clone(), quaternion: motion.target.clone(), phase: "rest", done: true };
  if (elapsed <= 0) return { position: motion.start.clone(), quaternion: motion.startQuaternion.clone(), phase: "throw", done: false };
  const time = Math.min(dicePhysicalTime(motion, elapsed), motion.physicalDuration);
  const frameIndex = Math.min(Math.floor(time / STEP), motion.frames.length - 2);
  const blend = clamp(time / STEP - frameIndex);
  const from = motion.frames[frameIndex];
  const to = motion.frames[frameIndex + 1];
  const position = from.position.clone().lerp(to.position, blend);
  const quaternion = from.quaternion.clone().slerp(to.quaternion, blend);
  quaternion.multiply(motion.correction);
  if (time === motion.physicalDuration) {
    const settle = smooth((elapsed - motion.playbackDuration) / SETTLE_TIME);
    position.lerp(motion.end, settle);
    quaternion.slerp(motion.target, settle);
  }
  position.y = Math.max(position.y, DICE_FLOOR_Y + dieSupportHeight(quaternion, motion.scale));
  return { position, quaternion, phase: time < (motion.groundImpacts[0] ?? Infinity) ? "throw" : time < motion.physicalDuration ? "roll" : "settle", done: false };
}
