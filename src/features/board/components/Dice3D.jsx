import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { createDiceMotion, DICE_CAMERA, DICE_FLOOR_Y, DICE_LOOK_AT, DICE_STARTS, restingDie, sampleDiceMotion } from "./diceMotion.js";
import { DiceFallback } from "./DiceFallback.jsx";

const DicePair = forwardRef(function DicePair({ onReady, reducedMotion }, ref) {
  const { scene } = useGLTF("/models/dice.glb");
  const dice = useMemo(() => DICE_STARTS.map((start, index) => {
    const object = scene.clone(true);
    const rest = restingDie(index);
    object.position.copy(rest.position);
    object.quaternion.copy(rest.quaternion);
    object.scale.setScalar(start.scale);
    object.traverse((child) => { if (child.isMesh) child.castShadow = true; });
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
      const motions = createDiceMotion(dice.map((object) => ({ position: object.position, quaternion: object.quaternion })), result, Math.random, reducedMotion);
      if (!motions) return Promise.resolve();
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      animation.current = { motions, started: performance.now(), promise, resolve };
      invalidate();
      return promise;
    },
  }), [dice, invalidate, reducedMotion]);

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
  const fallbackRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useImperativeHandle(ref, () => ({ startRoll: (result) => (pairRef.current || fallbackRef.current)?.startRoll(result) }), []);

  return (
    <div className="absolute left-[-75%] top-[-175%] h-[450%] w-[250%] pointer-events-none" aria-hidden="true" data-dice-visual="true">
      <Canvas
        // Canvas 기본값 auto가 부모의 none을 덮으므로 이 레이어도 명시적으로 끈다
        // 주사위 입력은 BoardTrack의 원래 버튼 영역에서만 받는다
        style={{ pointerEvents: "none" }}
        camera={DICE_CAMERA}
        onCreated={({ camera }) => camera.lookAt(...DICE_LOOK_AT)}
        gl={{ alpha: true, antialias: true }}
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        fallback={<DiceFallback ref={fallbackRef} onReady={onReady} inCanvas />}
      >
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#ffe4b5", "#67452d", 0.65]} />
        <directionalLight position={[-3, 14, 3]} intensity={2.4} color="#fff0d5" castShadow
          shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12}
          shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={0.1} shadow-camera-far={40}
          shadow-bias={-0.0001} shadow-normalBias={0.006} />
        <Suspense fallback={null}>
          <DicePair ref={pairRef} onReady={onReady} reducedMotion={reducedMotion} />
          <mesh position={[0, DICE_FLOOR_Y - 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[28, 28]} />
            <shadowMaterial transparent opacity={0.48} color="#140d07" depthWrite={false} />
          </mesh>
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Dice3D;
