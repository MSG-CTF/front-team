import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BOARD_IMAGE_SIZE, getBoardCellPosition } from "../utils/boardData.js";
import { BOARD_CELL_FACE_OUTLINES } from "../utils/boardCellFaces.js";
import { getVisibleStage2Landmarks } from "../utils/landmarkStage2.js";
import styles from "./BoardScreen.module.css";

const loader = new GLTFLoader();
const assetPromises = new Map();
const timings = new Map();
const tunedMaterials = new WeakMap();
// Multipliers are linear-light values; the cached GLB materials stay untouched.
const MATERIAL_TUNING = Object.freeze({
  "fruit-salad": {
    "09 Painted ivory ceramic": { color: [0.76, 0.70, 0.63], roughness: 0.88 },
  },
  "fruit-parfait": {
    "09 Warm alabaster goblet": { color: [0.77, 0.72, 0.65], roughness: 0.87 },
    "10 Whipped and cultured cream": { color: [0.86, 0.83, 0.78] },
  },
  "icecream-sundae": {
    "09 Warm alabaster goblet": { color: [0.77, 0.72, 0.65], roughness: 0.87 },
    "10 Whipped and cultured cream": { color: [0.86, 0.83, 0.78] },
  },
  "croissant": {
    "09 Milky white glass serving plate": { color: [0.77, 0.74, 0.69], roughness: 0.63 },
  },
  "bagel": {
    "09 Milky white glass serving plate": { color: [0.77, 0.74, 0.69], roughness: 0.63 },
  },
  "cinnamon-roll": {
    "09 Milky white glass serving plate": { color: [0.77, 0.74, 0.69], roughness: 0.63 },
  },
});
const shadowGeometry = new THREE.PlaneGeometry(2, 2);
const shadowMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false,
  uniforms: { shadowColor: { value: new THREE.Color("#4a2a16") } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 shadowColor; varying vec2 vUv; void main() {
    float radius = length((vUv - 0.5) * 2.0);
    float alpha = 0.22 * pow(1.0 - smoothstep(0.0, 1.0, radius), 1.6);
    gl_FragColor = vec4(shadowColor, alpha);
  }`,
});

function loadModel(food) {
  const path = `/models/landmarks-stage2/${food}.glb`;
  if (!assetPromises.has(path)) {
    const started = performance.now();
    assetPromises.set(path, loader.loadAsync(path).then((gltf) => {
      timings.set(food, Math.round(performance.now() - started));
      return gltf;
    }).catch((error) => {
      assetPromises.delete(path);
      throw error;
    }));
  }
  return assetPromises.get(path);
}

function tunePlacedMaterials(model, food) {
  const adjustments = MATERIAL_TUNING[food]
    ?? (["bibimbap", "ramen", "poke", "curry"].includes(food) ? MATERIAL_TUNING["fruit-salad"] : null)
    ?? (["pudding", "tiramisu", "yogurt", "chocolate-mousse"].includes(food) ? MATERIAL_TUNING["fruit-parfait"] : null)
    ?? (["pretzel", "salt-bread", "melon-bread"].includes(food) ? MATERIAL_TUNING.bagel : null);
  if (!adjustments) return;
  const tune = (source) => {
    const adjustment = adjustments[source.name];
    if (!adjustment) return source;
    if (!tunedMaterials.has(source)) {
      const material = source.clone();
      material.color.multiply(new THREE.Color().setRGB(...adjustment.color));
      if (adjustment.roughness != null) material.roughness = Math.max(material.roughness, adjustment.roughness);
      tunedMaterials.set(source, material);
    }
    return tunedMaterials.get(source);
  };
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material) ? node.material.map(tune) : tune(node.material);
  });
}

function makePlacedModel(gltf, landmark, compareUntuned = false) {
  const points = BOARD_CELL_FACE_OUTLINES[landmark.cellIndex - 1];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const faceWidth = Math.max(...xs) - Math.min(...xs);
  const faceHeight = Math.max(...ys) - Math.min(...ys);
  const center = getBoardCellPosition(landmark.cellIndex);

  // Orthographic board-space camera: one world unit is one original board-image pixel.
  // Tilt the model, rather than the board camera, so the board-coordinate anchor stays exact.
  const model = gltf.scene.clone(true);
  if (!compareUntuned) tunePlacedMaterials(model, landmark.food);
  const rotated = new THREE.Group();
  rotated.add(model);
  rotated.rotation.set(0.55, landmark.yaw, 0);
  rotated.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(rotated);
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const scale = Math.min(
    Math.min(faceWidth * 0.70 / width, faceHeight * 0.78 / height) * landmark.size,
    faceWidth * 0.81 / width,
    faceHeight * 0.88 / height,
  );
  const supportFraction = landmark.cellIndex <= 6 ? 0.72
    : landmark.cellIndex <= 12 ? 0.44
      : landmark.cellIndex <= 18 ? 0.62
        : landmark.cellIndex <= 24 ? 0.62
          : landmark.cellIndex <= 30 ? 0.58 : 0.56;
  const floorY = -faceHeight * 0.39;
  rotated.scale.setScalar(scale);
  rotated.position.set(
    -(bounds.min.x + bounds.max.x) * scale / 2,
    floorY - bounds.min.y * scale,
    0,
  );

  const placed = new THREE.Group();
  placed.name = `landmark-cell-${landmark.cellIndex}`;
  placed.userData.perchLift = height * scale * supportFraction;
  placed.position.set(
    center.x * BOARD_IMAGE_SIZE.width / 100 - BOARD_IMAGE_SIZE.width / 2,
    BOARD_IMAGE_SIZE.height / 2 - center.y * BOARD_IMAGE_SIZE.height / 100,
    0,
  );
  // The imported models have different origins. The rotated bounds, rather than
  // the GLB pivot, define both the visible foot and its board-surface shadow.
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.name = `landmark-contact-shadow-${landmark.cellIndex}`;
  shadow.position.set(0, floorY + faceHeight * 0.008, -2);
  shadow.scale.set(
    Math.min(width * scale * landmark.shadowWidth, faceWidth * 0.48) / 2,
    faceHeight * 0.052 / 2,
    1,
  );
  shadow.renderOrder = -1;
  placed.add(shadow);
  placed.add(rotated);
  return placed;
}

function LandmarkModel({ landmark, compareUntuned, onPlacement }) {
  const [gltf, setGltf] = useState(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let active = true;
    loadModel(landmark.food).then((result) => {
      if (active) { setGltf(result); invalidate(); }
    }).catch((error) => {
      // Individual asset failure leaves the board and other landmarks interactive.
      if (active && import.meta.env.DEV) console.warn(`랜드마크 ${landmark.food} 로딩 실패`, error);
    });
    return () => { active = false; };
  }, [landmark.food, invalidate]);
  const object = useMemo(() => gltf ? makePlacedModel(gltf, landmark, compareUntuned) : null,
    [gltf, landmark, compareUntuned]);
  useEffect(() => {
    if (object) onPlacement?.(landmark.cellIndex, object.userData.perchLift);
  }, [object, landmark.cellIndex, onPlacement]);
  return object ? <primitive object={object} dispose={null} /> : null;
}

function LandmarkMetrics({ visibleCount }) {
  const gl = useThree((state) => state.gl);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    // Renderer.info is a measured draw submission count, not a GPU-memory estimate.
    requestAnimationFrame(() => {
      window.__msgLandmarkMetrics = {
        visibleCount,
        loadedCount: timings.size,
        loadMilliseconds: Object.fromEntries(timings),
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      };
    });
  });
  return null;
}

export default function BoardLandmarks({ cells, cellStatesByIndex, consumedCellIndexes, onPlacement }) {
  const compareUntuned = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("landmarkMaterialBaseline") === "1";
  const visible = useMemo(() => getVisibleStage2Landmarks(cells, cellStatesByIndex, consumedCellIndexes),
    [cells, cellStatesByIndex, consumedCellIndexes]);
  if (!visible.length) return null;
  return <div className={styles.landmarkLayer} aria-hidden="true" data-board-layer="landmarks" data-visible-landmarks={visible.length}>
    <Canvas
      orthographic
      camera={{ position: [0, 0, 1000], left: -886, right: 886, top: 665, bottom: -665, near: 0.1, far: 2000 }}
      onCreated={({ camera }) => { camera.manual = true; camera.updateProjectionMatrix(); }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop="demand"
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={1.55} />
      <directionalLight intensity={1.55} position={[-300, 500, 800]} />
      {visible.map((landmark) => <LandmarkModel key={landmark.cellIndex} landmark={landmark}
        compareUntuned={compareUntuned} onPlacement={onPlacement} />)}
      <LandmarkMetrics visibleCount={visible.length} />
    </Canvas>
  </div>;
}
