import { Body, Box, ContactMaterial, Material, Plane, Vec3, World } from "cannon-es";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { FACE_NORMALS, faceUpQuaternion } from "./diceOrientation.js";

export const DICE_FLOOR_Y = 0;
export const DICE_HALF_EXTENT = 1.105; // dice.glb 장식과 눈금을 포함한 최대 반경
export const DICE_CAMERA = { position: [0, 19.58, 27.36], fov: 26, near: 0.1, far: 70 };
export const DICE_LOOK_AT = [0, 0.5, 0];
export const DICE_STARTS = [
  { position: [-0.85, 0, 0.12], face: 5, yaw: -0.32, scale: 0.46 },
  { position: [0.85, 0, -0.08], face: 3, yaw: 0.4, scale: 0.46 },
];
const up = new Vector3(0, 1, 0);
const clamp = (value) => Math.max(0, Math.min(value, 1));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const STEP = 1 / 120;
const SETTLE_TIME = 0.08;
const GROUND_TRANSITION = 0.18;
// 보드 원판 비율 × 캔버스 영역 110% / 144%. 낙하 공간을 확보하되 주사위 크기는 유지한다
export const DICE_CANVAS_ASPECT = (951 / 714) * 1.1 / 1.44;
const cameraBounds = new PerspectiveCamera(DICE_CAMERA.fov, DICE_CANVAS_ASPECT, DICE_CAMERA.near, DICE_CAMERA.far);
cameraBounds.position.set(...DICE_CAMERA.position);
cameraBounds.lookAt(...DICE_LOOK_AT);
cameraBounds.updateMatrixWorld();
const corner = new Vector3();

function fitsView(pose, scale, limitX, limitY) {
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    corner.set(x, y, z).multiplyScalar(DICE_HALF_EXTENT * scale).applyQuaternion(pose.quaternion).add(pose.position).project(cameraBounds);
    if (Math.abs(corner.x) > limitX || Math.abs(corner.y) > limitY) return false;
  }
  return true;
}

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

const recordPose = (body) => ({
  position: new Vector3(body.position.x, body.position.y, body.position.z),
  quaternion: new Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
});

function topFace(quaternion) {
  return Object.keys(FACE_NORMALS).reduce((best, candidate) =>
    new Vector3(...FACE_NORMALS[candidate]).applyQuaternion(quaternion).y > new Vector3(...FACE_NORMALS[best]).applyQuaternion(quaternion).y ? candidate : best,
  "1");
}

function faceCorrection(face, quaternion) {
  return new Quaternion().setFromUnitVectors(new Vector3(...FACE_NORMALS[face]), new Vector3(...FACE_NORMALS[topFace(quaternion)]));
}

function groundRollQuality({ frames, groundImpacts }, scale) {
  const firstImpact = groundImpacts[0];
  if (firstImpact == null || (frames.length - 1) * STEP > 2.6) return false;
  let previousFace = null;
  let faceChanges = 0;
  let lastFaceChange = firstImpact;
  let groundDistance = 0;
  const firstFrame = Math.ceil(firstImpact / STEP);
  for (let index = firstFrame; index < frames.length; index++) {
    const pose = frames[index];
    const face = topFace(pose.quaternion);
    const normal = new Vector3(...FACE_NORMALS[face]).applyQuaternion(pose.quaternion);
    // 모서리에서 앞뒤로 흔들리는 장면은 면이 바뀐 것으로 세지 않는다
    if (normal.y > 0.9 && face !== previousFace) {
      if (previousFace !== null) { faceChanges++; lastFaceChange = index * STEP; }
      previousFace = face;
    }
    if (index > firstFrame && pose.position.y - dieSupportHeight(pose.quaternion, scale) < DICE_FLOOR_Y + 0.15) {
      groundDistance += pose.position.distanceTo(frames[index - 1].position);
    }
  }
  // 첫 충돌 뒤에도 두 번 이상 면이 바뀌고, 바닥 가까이에서 실제로 굴러간 경로만 사용한다
  return faceChanges >= 2 && lastFaceChange - firstImpact > 0.45 && groundDistance > 1.8;
}

function immediateResult(current, result) {
  return current.map((pose, index) => ({
    end: pose.position.clone(),
    target: pose.quaternion.clone().multiply(faceCorrection(index === 0 ? result.diceA : result.diceB, pose.quaternion)),
    scale: DICE_STARTS[index].scale, duration: 0,
  }));
}

// uuuulala/Threejs-rolling-dice-tutorial의 공중 투척과 비중심 충격량 방식을 적용
// 원문과 MIT 고지는 public/third-party/dice-roller.txt에 보존
function simulateThrow(random, attempt) {
  const between = (min, max) => min + random() * (max - min);
  const world = new World({ gravity: new Vec3(0, -50, 0), allowSleep: true });
  world.solver.iterations = 12;
  world.solver.tolerance = 1e-7;
  const wood = new Material("board");
  const ivory = new Material("dice");
  world.addContactMaterial(new ContactMaterial(wood, ivory, {
    friction: 0.22, restitution: 0.42,
    contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  }));
  world.addContactMaterial(new ContactMaterial(ivory, ivory, { friction: 0.3, restitution: 0.3 }));
  const floor = new Body({ mass: 0, shape: new Plane(), material: wood });
  floor.position.y = DICE_FLOOR_Y;
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const releaseX = between(3.3, 3.9) + (attempt % 3 - 1) * 0.15;
  const rolls = DICE_STARTS.map((start, index) => {
    const half = DICE_HALF_EXTENT * DICE_STARTS[index].scale;
    const body = new Body({
      mass: 1, shape: new Box(new Vec3(half, half, half)), material: ivory,
      linearDamping: 0.01, angularDamping: 0.01,
      allowSleep: true, sleepSpeedLimit: 0.12, sleepTimeLimit: 0.12,
    });
    body.position.set(releaseX + index * 0.1, 4 + index * 1.5, (index === 0 ? -0.4 : 0.4) + between(-0.12, 0.12));
    body.quaternion.setFromEuler(2 * Math.PI * random(), 0, 2 * Math.PI * random());
    world.addBody(body);
    const force = between(4.5, 7.4) * (1 - attempt % 4 * 0.03);
    body.applyImpulse(
      new Vec3(-force, force, between(-0.3, 0.3)),
      new Vec3(0.16, 0.32, between(0.17, 0.23)),
    );
    const roll = { body, frames: [recordPose(body)], impacts: [], groundImpacts: [] };
    body.addEventListener("collide", ({ body: other, contact }) => {
      if (world.time < 0.2 || Math.abs(contact.getImpactVelocityAlongNormal()) <= 0.8) return;
      if (world.time - (roll.impacts.at(-1) ?? -1) > 0.09) roll.impacts.push(world.time);
      if (other === floor && world.time - (roll.groundImpacts.at(-1) ?? -1) > 0.09) roll.groundImpacts.push(world.time);
    });
    return roll;
  });
  for (let frame = 1; frame <= 600; frame++) {
    world.step(STEP);
    for (const roll of rolls) {
      const pose = recordPose(roll.body);
      roll.frames.push(pose);
    }
    if (frame > 120 && rolls.every(({ body }) => body.sleepState === Body.SLEEPING)) break;
  }
  // 평평한 바닥의 물리는 수평 이동에 불변이다. 전체 경로를 함께 옮겨 착지만 보드 중앙에 둔다
  const center = rolls.reduce((sum, { frames }) => sum.add(frames.at(-1).position), new Vector3()).multiplyScalar(0.5);
  center.y = 0;
  center.x += between(-0.15, 0.15);
  center.z += between(-0.12, 0.12);
  for (const roll of rolls) for (const pose of roll.frames) pose.position.sub(center);
  const contained = rolls.every(({ frames }, index) => frames.every((pose) => fitsView(pose, DICE_STARTS[index].scale, 0.88, 0.86)));
  const settled = rolls.every(({ body, frames }, index) => {
    const last = frames.at(-1);
    const normal = new Vector3(...FACE_NORMALS[topFace(last.quaternion)]).applyQuaternion(last.quaternion);
    const height = DICE_FLOOR_Y + DICE_HALF_EXTENT * DICE_STARTS[index].scale;
    return body.sleepState === Body.SLEEPING && normal.y > Math.cos(0.035) && Math.abs(last.position.y - height) < 0.025
      && fitsView(last, DICE_STARTS[index].scale, 0.385, 0.208);
  });
  const [left, right] = rolls.map(({ frames }) => frames.at(-1));
  const screenBounds = (pose, index) => {
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const half = DICE_HALF_EXTENT * DICE_STARTS[index].scale;
      corner.set(x, y, z).multiplyScalar(half).applyQuaternion(pose.quaternion).add(pose.position);
      if (corner.y < pose.position.y + half * 0.9) continue;
      corner.project(cameraBounds);
      bounds.minX = Math.min(bounds.minX, corner.x); bounds.maxX = Math.max(bounds.maxX, corner.x);
      bounds.minY = Math.min(bounds.minY, corner.y); bounds.maxY = Math.max(bounds.maxY, corner.y);
    }
    return bounds;
  };
  const a = screenBounds(left, 0), b = screenBounds(right, 1);
  const separated = a.maxX + 0.012 < b.minX || b.maxX + 0.012 < a.minX || a.maxY + 0.012 < b.minY || b.maxY + 0.012 < a.minY;
  const keepsRolling = contained && settled && separated
    && rolls.every((roll, index) => groundRollQuality(roll, DICE_STARTS[index].scale));
  return { rolls, fits: keepsRolling };
}

// 같은 한 가지 모션으로 돌아가지 않도록 서로 다른 착지 경로를 검증한 초기값을 둔다
// 눈금과는 무관하며 각 경로도 동일한 물리 엔진으로 계산한다
const REFERENCE_SEEDS = [74, 120, 1071, 1101, 1213, 1377, 1440, 1597, 1678, 1846, 1881, 1918, 2214, 2275, 2608, 2680,
  3401, 3628, 4136, 4347, 4522, 4728, 4955, 4997, 5358, 5465, 5582, 5584, 5665, 5806, 5829, 6406];
const referenceThrows = new Map();
function getReferenceThrow(random, current) {
  const firstIndex = Math.min(REFERENCE_SEEDS.length - 1, Math.floor(random() * REFERENCE_SEEDS.length));
  for (let offset = 0; offset < REFERENCE_SEEDS.length; offset++) {
    const initialSeed = REFERENCE_SEEDS[(firstIndex + offset) % REFERENCE_SEEDS.length];
    if (!referenceThrows.has(initialSeed)) {
      let seed = initialSeed;
      referenceThrows.set(initialSeed, simulateThrow(() => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      }, 0));
    }
    const simulation = referenceThrows.get(initialSeed);
    if (!simulation.fits) continue;
    // 직전에 같은 경로를 썼다면 다음 경로를 골라 연속 재생을 피한다
    const repeatsPrevious = simulation.rolls.every(({ frames }, index) => frames.at(-1).position.distanceTo(current[index].position) < 0.03);
    if (!repeatsPrevious) return simulation;
  }
  return null;
}

// 물리는 움직임에만 사용한다. 최종 눈금은 반드시 서버가 정한 값을 표시한다
export function createDiceMotion(current, result, random = Math.random, reducedMotion = false) {
  if (![result?.diceA, result?.diceB].every((face) => Number.isInteger(face) && face >= 1 && face <= 6)) return null;
  if (reducedMotion) return immediateResult(current, result);
  let simulation;
  for (let attempt = 0; attempt < 4; attempt++) {
    simulation = simulateThrow(random, attempt);
    if (simulation.fits) break;
  }
  // 무작위 경로가 모두 부적합해도 굴림을 생략하지 않고 검증된 투척 경로를 사용한다
  const usedReferenceThrow = !simulation.fits;
  if (usedReferenceThrow) simulation = getReferenceThrow(random, current);
  if (!simulation?.fits) return immediateResult(current, result);
  // 공중 투척 속도는 유지한다. 첫 충돌 후에만 살짝 여유를 주고 두 주사위의 충돌 시계는 공유한다
  const groundAt = Math.min(...simulation.rolls.map(({ groundImpacts }) => groundImpacts[0]));
  const groundRate = 0.78 + random() * 0.1;
  return simulation.rolls.map(({ frames, impacts, groundImpacts }, index) => {
    const face = index === 0 ? result.diceA : result.diceB;
    const last = frames.at(-1);
    // 처음부터 대칭 회전을 적용하므로 투척 도중 눈금을 보정하지 않는다
    const correction = faceCorrection(face, last.quaternion);
    const target = last.quaternion.clone().multiply(correction);
    const normal = new Vector3(...FACE_NORMALS[face]).applyQuaternion(target);
    target.premultiply(new Quaternion().setFromUnitVectors(normal, up));
    const scale = DICE_STARTS[index].scale;
    const end = last.position.clone();
    end.y = DICE_FLOOR_Y + dieSupportHeight(target, scale);
    const physicalDuration = (frames.length - 1) * STEP;
    const transitionDistance = GROUND_TRANSITION * (1 + groundRate) / 2;
    const playbackDuration = groundAt + GROUND_TRANSITION + (physicalDuration - groundAt - transitionDistance) / groundRate;
    return {
      frames, impacts, groundImpacts, correction, target, end, scale,
      start: frames[0].position.clone(), startQuaternion: frames[0].quaternion.clone().multiply(correction),
      groundAt, groundRate, physicalDuration, playbackDuration, duration: playbackDuration + SETTLE_TIME, usedReferenceThrow,
    };
  });
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
