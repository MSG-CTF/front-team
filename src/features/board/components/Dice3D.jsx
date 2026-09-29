import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { createDiceMotion, DICE_FLOOR_Y, DICE_STARTS, restingDie, sampleDiceMotion } from "./diceMotion.js";

const SHADOW_SCALE = [12, 12];

const DicePair = forwardRef(function DicePair({ onReady, reducedMotion }, ref) {
  const { scene } = useGLTF("/models/dice.glb");
  const dice = useMemo(() => DICE_STARTS.map((start, index) => {
    const object = scene.clone(true);
    const rest = restingDie(index);
    object.position.copy(rest.position);
    object.quaternion.copy(rest.quaternion);
    object.scale.setScalar(start.scale);
    return object;
  }), [scene]);
  const animation = useRef(null);
  const { invalidate } = useThree();

  useEffect(() => { onReady?.(); }, [onReady]);
  useEffect(() => () => {
    // 화면을 떠나도 호출부에 대기 중인 Promise를 남기지 않는다
    animation.current?.resolve();
    animation.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    startRoll(result) {
      if (animation.current) return animation.current.promise;
      const motions = createDiceMotion(dice.map((object) => ({ position: object.position, quaternion: object.quaternion })), result);
      if (!motions) return Promise.resolve();
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      animation.current = { motions, started: performance.now(), promise, resolve };
      invalidate();
      return promise;
    },
  }), [dice, invalidate]);

  // 그림자 패스를 그리기 전에 위치를 갱신한다
  useFrame(() => {
    const roll = animation.current;
    if (!roll) return;
    const elapsed = (performance.now() - roll.started) / 1000;
    let finished = true;
    dice.forEach((object, index) => {
      const pose = sampleDiceMotion(roll.motions[index], elapsed, reducedMotion);
      object.position.copy(pose.position);
      object.quaternion.copy(pose.quaternion);
      finished &&= pose.done;
    });
    if (finished) {
      animation.current = null;
      roll.resolve();
    } else invalidate();
  }, -1);

  return <group dispose={null}>{dice.map((object, index) => <primitive key={index} object={object} />)}</group>;
});

const Dice3D = forwardRef(function Dice3D({ onReady }, ref) {
  const pairRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useImperativeHandle(ref, () => ({ startRoll: (result) => pairRef.current?.startRoll(result) }), []);

  return (
    <div className="absolute left-[-25%] top-[-50%] h-[200%] w-[150%] pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 8.2, 11.6], fov: 26, near: 0.1, far: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, -0.6)}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        frameloop="demand"
        fallback={<img src="/assets/board/dice.png" alt="" className="absolute left-[16.667%] top-[25%] h-1/2 w-2/3 object-contain" />}
      >
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#ffe4b5", "#67452d", 0.65]} />
        <directionalLight position={[-3, 5, 6]} intensity={2.4} color="#fff0d5" />
        <Suspense fallback={null}>
          <DicePair ref={pairRef} onReady={onReady} reducedMotion={reducedMotion} />
          <ContactShadows position={[0, DICE_FLOOR_Y - 0.01, 0]} scale={SHADOW_SCALE} resolution={256} blur={1.4} opacity={0.6} far={3.5} color="#392416" />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Dice3D;
