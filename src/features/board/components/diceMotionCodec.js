import { Quaternion } from "three/src/math/Quaternion.js";
import { Vector3 } from "three/src/math/Vector3.js";

const vectorKeys = ["end", "start"];
const quaternionKeys = ["target", "correction", "startQuaternion"];

export function packDiceMotions(motions) {
  return motions?.map(motion => {
    const { frames, ...packed } = motion;
    for (const key of [...vectorKeys, ...quaternionKeys]) if (motion[key]) packed[key] = motion[key].toArray();
    if (frames) {
      packed.frames = new Float64Array(frames.length * 7);
      frames.forEach((pose, index) => {
        pose.position.toArray(packed.frames, index * 7);
        pose.quaternion.toArray(packed.frames, index * 7 + 3);
      });
    }
    return packed;
  }) ?? null;
}

export function unpackDiceMotions(packed) {
  if (packed === null) return null;
  if (!Array.isArray(packed) || packed.length !== 2) throw new Error("주사위 경로가 올바르지 않습니다");
  return packed.map(entry => {
    const motion = { ...entry };
    for (const key of vectorKeys) if (entry[key]) motion[key] = new Vector3().fromArray(entry[key]);
    for (const key of quaternionKeys) if (entry[key]) motion[key] = new Quaternion().fromArray(entry[key]);
    if (!motion.end || !motion.target || !Number.isFinite(motion.duration)) throw new Error("주사위 결과가 올바르지 않습니다");
    if (entry.frames) {
      if (!(entry.frames instanceof Float64Array) || entry.frames.length % 7 !== 0) throw new Error("주사위 좌표가 올바르지 않습니다");
      motion.frames = Array.from({ length: entry.frames.length / 7 }, (_, index) => ({
        position: new Vector3().fromArray(entry.frames, index * 7),
        quaternion: new Quaternion().fromArray(entry.frames, index * 7 + 3),
      }));
    }
    return motion;
  });
}
