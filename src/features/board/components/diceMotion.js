import { Body, Box, ContactMaterial, Material, Plane, Vec3, World } from "cannon-es";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { FACE_NORMALS, faceUpQuaternion } from "./diceOrientation.js";

export const DICE_FLOOR_Y = -1.2;
export const DICE_HALF_EXTENT = 1.105; // dice.glb 장식과 눈금을 포함한 최대 반경
export const DICE_CAMERA = { position: [0, 12.3, 17.4], fov: 26, near: 0.1, far: 50 };
export const DICE_LOOK_AT = [0, 0, -0.6];
export const DICE_STARTS = [
  { position: [-1.4, 0, 0.12], face: 5, yaw: -0.32, scale: 0.95 },
  { position: [1.4, 0, -0.08], face: 3, yaw: 0.4, scale: 0.91 },
];
const up = new Vector3(0, 1, 0);
const clamp = (value) => Math.max(0, Math.min(value, 1));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const STEP = 1 / 120;
const PLAYBACK_SPEED = 1.3;
const SETTLE_TIME = 0.12;
// 보드 원판 비율 × 캔버스 영역 60% / 48%. 모바일에서도 같은 원판 비율을 유지한다
const cameraBounds = new PerspectiveCamera(DICE_CAMERA.fov, (951 / 714) * 0.6 / 0.48, DICE_CAMERA.near, DICE_CAMERA.far);
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

function immediateResult(current, result) {
  return current.map((pose, index) => ({
    end: pose.position.clone(),
    target: pose.quaternion.clone().multiply(faceCorrection(index === 0 ? result.diceA : result.diceB, pose.quaternion)),
    scale: DICE_STARTS[index].scale, duration: 0,
  }));
}

function simulateThrow(current, random, strength, headingOffset) {
  const between = (min, max) => min + random() * (max - min);
  const world = new World({ gravity: new Vec3(0, -38, 0), allowSleep: true });
  world.solver.iterations = 12;
  world.solver.tolerance = 1e-7;
  const wood = new Material("board");
  const ivory = new Material("dice");
  world.addContactMaterial(new ContactMaterial(wood, ivory, {
    friction: between(0.28, 0.42), restitution: between(0.28, 0.44),
    contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  }));
  world.addContactMaterial(new ContactMaterial(ivory, ivory, { friction: 0.25, restitution: 0.35 }));
  const floor = new Body({ mass: 0, shape: new Plane(), material: wood });
  floor.position.y = DICE_FLOOR_Y;
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const heading = between(-Math.PI, Math.PI) + headingOffset;
  const first = random() < 0.5 ? 0 : 1;
  const rolls = current.map((start, index) => {
    const half = DICE_HALF_EXTENT * DICE_STARTS[index].scale;
    const body = new Body({
      mass: 1, shape: new Box(new Vec3(half, half, half)), material: ivory,
      linearDamping: 0.16, angularDamping: 0.22,
      allowSleep: true, sleepSpeedLimit: 0.18, sleepTimeLimit: 0.18,
    });
    body.position.set(...start.position.toArray());
    body.quaternion.set(...start.quaternion.toArray());
    world.addBody(body);
    const direction = heading + between(-0.85, 0.85);
    const speed = between(2.6, 4.6) * strength;
    const velocity = new Vec3(
      Math.cos(direction) * speed + ((index === 0 ? -2.2 : 2.2) - start.position.x) * 1.35,
      between(6.8, 9.1),
      Math.sin(direction) * speed - (start.position.z + 0.6) * 0.85,
    );
    const spin = between(7.5, 12.5);
    const roll = {
      body, frames: [recordPose(body)], impacts: [], launched: false,
      launchAt: index === first ? 0 : between(0.045, 0.14), velocity,
      angularVelocity: new Vec3(velocity.z * 1.2 + between(-spin, spin), between(-4.5, 4.5), -velocity.x * 1.2 + between(-spin, spin)),
    };
    body.addEventListener("collide", ({ contact }) => {
      if (world.time > roll.launchAt + 0.1 && Math.abs(contact.getImpactVelocityAlongNormal()) > 0.8 && world.time - (roll.impacts.at(-1) ?? -1) > 0.09) roll.impacts.push(world.time);
    });
    return roll;
  });
  for (let frame = 1; frame <= 420; frame++) {
    for (const roll of rolls) {
      if (!roll.launched && world.time >= roll.launchAt) {
        roll.body.wakeUp();
        roll.body.velocity.copy(roll.velocity);
        roll.body.angularVelocity.copy(roll.angularVelocity);
        roll.launched = true;
      }
    }
    world.step(STEP);
    for (const [index, roll] of rolls.entries()) {
      const pose = recordPose(roll.body);
      roll.frames.push(pose);
      if (!fitsView(pose, DICE_STARTS[index].scale, 0.9, 0.9)) return { rolls, fits: false };
    }
    if (frame > 120 && rolls.every(({ body, launched }) => launched && body.sleepState === Body.SLEEPING)) break;
  }
  const settled = rolls.every(({ body, frames }, index) => {
    const last = frames.at(-1);
    const normal = new Vector3(...FACE_NORMALS[topFace(last.quaternion)]).applyQuaternion(last.quaternion);
    const height = DICE_FLOOR_Y + DICE_HALF_EXTENT * DICE_STARTS[index].scale;
    return body.sleepState === Body.SLEEPING && normal.y > Math.cos(0.035) && Math.abs(last.position.y - height) < 0.025
      && fitsView(last, DICE_STARTS[index].scale, 0.7, 0.64);
  });
  const [left, right] = rolls.map(({ frames }) => frames.at(-1));
  const extentX = (pose, index) => {
    const localX = new Vector3(1, 0, 0).applyQuaternion(pose.quaternion.clone().invert());
    return (Math.abs(localX.x) + Math.abs(localX.y) + Math.abs(localX.z)) * DICE_HALF_EXTENT * DICE_STARTS[index].scale;
  };
  const separated = Math.abs(left.position.x - right.position.x) > extentX(left, 0) + extentX(right, 1) + 0.12;
  return { rolls, fits: settled && separated };
}

// 물리는 움직임에만 사용한다. 최종 눈금은 반드시 서버가 정한 값을 표시한다
export function createDiceMotion(current, result, random = Math.random, reducedMotion = false) {
  if (![result?.diceA, result?.diceB].every((face) => Number.isInteger(face) && face >= 1 && face <= 6)) return null;
  if (reducedMotion) return immediateResult(current, result);
  let simulation;
  for (let attempt = 0; attempt < 12; attempt++) {
    simulation = simulateThrow(current, random, Math.max(0.4, 1 - attempt * 0.15), attempt * 2.4);
    if (simulation.fits) break;
  }
  // 화면을 벗어나거나 기대어 선 경로만 나온 경우 결과를 바로 표시해 게임 진행을 막지 않는다
  if (!simulation.fits) return immediateResult(current, result);
  return simulation.rolls.map(({ frames, launchAt, impacts }, index) => {
    const face = index === 0 ? result.diceA : result.diceB;
    const last = frames.at(-1);
    // 정육면체의 대칭 회전은 충돌 형상을 바꾸지 않는다. 빠른 투척 구간에서만 눈금 방향을 맞춘다
    const correction = faceCorrection(face, last.quaternion);
    const target = last.quaternion.clone().multiply(correction);
    const normal = new Vector3(...FACE_NORMALS[face]).applyQuaternion(target);
    target.premultiply(new Quaternion().setFromUnitVectors(normal, up));
    const scale = DICE_STARTS[index].scale;
    const end = last.position.clone();
    end.y = DICE_FLOOR_Y + dieSupportHeight(target, scale);
    const physicalDuration = (frames.length - 1) * STEP;
    return {
      frames, launchAt, impacts, correction, target, end, scale,
      start: current[index].position.clone(), startQuaternion: current[index].quaternion.clone(),
      physicalDuration, duration: physicalDuration / PLAYBACK_SPEED + SETTLE_TIME, fits: simulation.fits,
    };
  });
}

export function sampleDiceMotion(motion, elapsed, reducedMotion = false) {
  if (reducedMotion || elapsed >= motion.duration) return { position: motion.end.clone(), quaternion: motion.target.clone(), phase: "rest", done: true };
  if (elapsed <= 0) return { position: motion.start.clone(), quaternion: motion.startQuaternion.clone(), phase: "throw", done: false };
  const time = Math.min(elapsed * PLAYBACK_SPEED, motion.physicalDuration);
  const frameIndex = Math.min(Math.floor(time / STEP), motion.frames.length - 2);
  const blend = clamp(time / STEP - frameIndex);
  const from = motion.frames[frameIndex];
  const to = motion.frames[frameIndex + 1];
  const position = from.position.clone().lerp(to.position, blend);
  const quaternion = from.quaternion.clone().slerp(to.quaternion, blend);
  quaternion.multiply(new Quaternion().slerp(motion.correction, smooth((time - motion.launchAt) / 0.14)));
  if (time === motion.physicalDuration) {
    const settle = smooth((elapsed - motion.physicalDuration / PLAYBACK_SPEED) / SETTLE_TIME);
    position.lerp(motion.end, settle);
    quaternion.slerp(motion.target, settle);
  }
  position.y = Math.max(position.y, DICE_FLOOR_Y + dieSupportHeight(quaternion, motion.scale));
  return { position, quaternion, phase: time < (motion.impacts[0] ?? Infinity) ? "throw" : time < motion.physicalDuration ? "roll" : "settle", done: false };
}
