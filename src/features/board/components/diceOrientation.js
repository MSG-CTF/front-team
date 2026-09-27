import { Quaternion, Vector3 } from "three";

// GLB is Y-up. Opposite faces add to seven: 1/6, 2/5, 3/4.
export const FACE_NORMALS = Object.freeze({
  1: [0, 1, 0],
  2: [0, 0, -1],
  3: [1, 0, 0],
  4: [-1, 0, 0],
  5: [0, 0, 1],
  6: [0, -1, 0],
});

export function faceUpQuaternion(value, yaw = 0) {
  const normal = FACE_NORMALS[value];
  if (!normal) return null;
  const orientation = new Quaternion().setFromUnitVectors(
    new Vector3(...normal),
    new Vector3(0, 1, 0),
  );
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).multiply(orientation);
}
