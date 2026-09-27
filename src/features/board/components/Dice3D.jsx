import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Euler, Vector3 } from "three";
import { faceUpQuaternion } from "./diceOrientation.js";

const STARTS = [
  { position: [-1.4, 0.1, 0], rotation: [-0.6702, -0.0311, 0.6392], scale: 0.95 },
  { position: [1.4, -0.1, 0], rotation: [0.875, -0.6065, 1.5254], scale: 0.91 },
];
// -Z projects toward the top of this camera. Sample distinct throw angles and
// distances inside the upper board, then require both lateral and depth gaps.
// The GLB body is about 2.17 units wide. Keep room for another die between them.
const MIN_LANDING_DISTANCE = 5.3;
const MIN_LATERAL_GAP = 5.1;
const MIN_DEPTH_GAP = 0.6;
const randomBetween = (min, max) => min + Math.random() * (max - min);

function landingPositions(current) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const fartherDie = Math.random() < 0.5 ? 0 : 1;
    const positions = STARTS.map((start, index) => {
      const distance = index === fartherDie
        ? randomBetween(2.35, 2.65)
        : randomBetween(1.45, 1.85);
      const angle = randomBetween(index === 0 ? 32 : 27, index === 0 ? 40 : 38) * Math.PI / 180;
      return new Vector3(
        start.position[0] + (index === 0 ? -1 : 1) * distance * Math.sin(angle),
        start.position[1],
        -distance * Math.cos(angle),
      );
    });
    if (
      positions[0].distanceTo(positions[1]) >= MIN_LANDING_DISTANCE &&
      Math.abs(positions[0].x - positions[1].x) >= MIN_LATERAL_GAP &&
      Math.abs(positions[0].z - positions[1].z) >= MIN_DEPTH_GAP &&
      positions.every((position, index) => position.distanceTo(current[index].position) >= 0.55)
    ) return positions;
  }
  // A bounded fallback also alternates which die finishes farther up the board.
  const leftIsFarther = current[0].position.z > current[1].position.z;
  return leftIsFarther
    ? [new Vector3(-2.9, STARTS[0].position[1], -2.1), new Vector3(2.35, STARTS[1].position[1], -1.3)]
    : [new Vector3(-2.35, STARTS[0].position[1], -1.3), new Vector3(2.9, STARTS[1].position[1], -2.1)];
}
const SPIN_TIME = 1.2;
const LAND_TIME = 0.35;
const ROLL_TIME = SPIN_TIME + LAND_TIME;
const smooth = (value) => value * value * (3 - 2 * value);

const DicePair = forwardRef(function DicePair({ onReady }, ref) {
  const { scene } = useGLTF("/models/dice.glb");
  // The two instances share the original GLB geometry and materials.
  const dice = useMemo(() => [scene.clone(true), scene.clone(true)], [scene]);
  const animation = useRef(null);
  const { invalidate } = useThree();

  useEffect(() => { onReady?.(); }, [onReady]);

  useImperativeHandle(ref, () => ({
    startRoll(result) {
      if (animation.current) return animation.current.promise;
      const current = dice.map((object) => ({
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
      }));
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      const motion = [0, 1].map((index) => ({
        delay: index === 0 ? randomBetween(0, 0.015) : randomBetween(0.045, 0.08),
        duration: index === 0 ? randomBetween(0.95, 1.08) : randomBetween(1.07, 1.17),
        hop: randomBetween(0.1, 0.17),
        sway: randomBetween(-0.1, 0.1),
        turns: [
          (index === 0 ? 1 : -1) * (index === 0 ? 2 : 1),
          (Math.random() < 0.5 ? -1 : 1) * (index === 0 ? 1 : 2),
          index === 0 ? -1 : 1,
        ],
        bounceAt: index === 0 ? randomBetween(0.15, 0.28) : randomBetween(0.32, 0.47),
        bounce: randomBetween(0.018, 0.04),
      }));
      // The result is known before the first frame. All three axes make full
      // turns and end at the exact face orientation, with no landing correction.
      const rotationPaths = current.map(({ quaternion }, index) => {
        const start = new Euler().setFromQuaternion(quaternion, "XYZ");
        const targetQuaternion = faceUpQuaternion(
          index === 0 ? result?.diceA : result?.diceB,
          index === 0 ? 0.34 : -0.42,
        ) || quaternion;
        const target = new Euler().setFromQuaternion(targetQuaternion, "XYZ");
        return {
          from: [start.x, start.y, start.z],
          delta: ["x", "y", "z"].map((axis, axisIndex) =>
            target[axis] - start[axis] + Math.PI * 2 * motion[index].turns[axisIndex],
          ),
        };
      });
      const roll = {
        started: performance.now(),
        current,
        positions: landingPositions(current),
        motion,
        rotationPaths,
        landing: null,
        promise,
        resolve,
      };
      animation.current = roll;
      invalidate();
      return promise;
    },
  }), [dice, invalidate]);

  useFrame(() => {
    const roll = animation.current;
    if (!roll) return;
    const now = performance.now();
    const elapsed = (now - roll.started) / 1000;

    if (!roll.landing && elapsed >= SPIN_TIME) {
      roll.landing = {
        started: now,
        positions: dice.map((object) => object.position.clone()),
      };
    }

    dice.forEach((object, index) => {
      const path = roll.rotationPaths[index];
      const t = Math.min(Math.max((elapsed - roll.motion[index].delay) / (ROLL_TIME - roll.motion[index].delay), 0), 1);
      const turn = 1 - (1 - t) ** 3;
      object.quaternion.setFromEuler(new Euler(
        path.from[0] + path.delta[0] * turn,
        path.from[1] + path.delta[1] * turn,
        path.from[2] + path.delta[2] * turn,
        "XYZ",
      ));
    });

    if (roll.landing) {
      const t = Math.min((now - roll.landing.started) / (LAND_TIME * 1000), 1);
      const eased = smooth(t);
      dice.forEach((object, index) => {
        const motion = roll.motion[index];
        object.position.copy(roll.landing.positions[index]).lerp(roll.positions[index], eased);
        const bounceProgress = (t - motion.bounceAt) / (1 - motion.bounceAt);
        if (bounceProgress > 0 && bounceProgress < 1) {
          object.position.y += motion.bounce * Math.sin(Math.PI * bounceProgress) * (1 - bounceProgress);
        }
      });
      if (t === 1) {
        animation.current = null;
        roll.resolve();
        return;
      }
    } else {
      dice.forEach((object, index) => {
        const motion = roll.motion[index];
        const progress = Math.min(Math.max((elapsed - motion.delay) / motion.duration, 0), 1);
        const travel = 0.88 * (1 - (1 - progress) ** (index === 0 ? 4 : 2.6));
        object.position.copy(roll.current[index].position)
          .lerp(roll.positions[index], travel);
        const hopProgress = Math.min(progress / 0.38, 1);
        object.position.x += motion.sway * Math.sin(Math.PI * progress);
        object.position.y += motion.hop * Math.sin(Math.PI * hopProgress);
      });
    }
    invalidate();
  });

  return (
    <group dispose={null}>
      {dice.map((object, index) => (
        <primitive
          key={index}
          object={object}
          position={STARTS[index].position}
          rotation={STARTS[index].rotation}
          scale={STARTS[index].scale}
        />
      ))}
    </group>
  );
});

const Dice3D = forwardRef(function Dice3D({ onReady }, ref) {
  const pairRef = useRef(null);
  useImperativeHandle(ref, () => ({ startRoll: (result) => pairRef.current?.startRoll(result) }), []);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 4.1, 6.1], fov: 26, near: 0.1, far: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, -0.6)}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        frameloop="demand"
        fallback={<img src="/assets/board/dice.png" alt="" className="h-full w-full object-contain" />}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[-3, 5, 6]} intensity={3} color="#fff0d5" />
        <Suspense fallback={null}><DicePair ref={pairRef} onReady={onReady} /></Suspense>
      </Canvas>
    </div>
  );
});

export default Dice3D;
