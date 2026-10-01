import { Quaternion } from "three/src/math/Quaternion.js";
import { Vector3 } from "three/src/math/Vector3.js";
import { createDiceMotion } from "./diceMotion.js";
import { packDiceMotions } from "./diceMotionCodec.js";

self.onmessage = ({ data: { id, current, result } }) => {
  try {
    const poses = current.map(pose => ({ position: new Vector3().fromArray(pose.position), quaternion: new Quaternion().fromArray(pose.quaternion) }));
    const motions = packDiceMotions(createDiceMotion(poses, result));
    self.postMessage({ id, motions }, motions?.filter(motion => motion.frames).map(motion => motion.frames.buffer) ?? []);
  } catch {
    self.postMessage({ id, failed: true });
  }
};
