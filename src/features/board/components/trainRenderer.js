import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createTrainModel } from "./trainModel.js";

// 연기와 빛은 부드러운 알파 텍스처를 공유한다 외부 이미지 요청은 없다
function createSoftTexture() {
  const source = document.createElement("canvas");
  source.width = source.height = 128;
  const context = source.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,.9)");
  gradient.addColorStop(.35, "rgba(255,255,255,.6)");
  gradient.addColorStop(.7, "rgba(255,255,255,.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(source);
}

export function createTrainRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8.5, 8.5, 8.5, -8.5, .1, 40);
  camera.position.set(0, 7.6, 8.6);
  camera.lookAt(0, .82, 0);
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .02);
  scene.environment = environment.texture;
  scene.environmentIntensity = .65;
  environmentScene.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffe9bd, 0x454843, 2));
  const key = new THREE.DirectionalLight(0xffe0a5, 3.4);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 32 });
  key.shadow.bias = -.0005;
  key.shadow.normalBias = .022;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffbf70, 2.5);
  rim.position.set(2, 3, -4);
  scene.add(rim);
  const model = createTrainModel();
  scene.add(model.object);
  const soft = createSoftTexture();
  const resources = new Set([soft]);
  const softPlane = (color, opacity, width, depth, x, z, parent) => {
    const mat = new THREE.MeshBasicMaterial({ color, map: soft, transparent: true, opacity, depthWrite: false });
    const geo = new THREE.PlaneGeometry(width, depth);
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, -.014, z);
    resources.add(mat); resources.add(geo);
    parent.add(plane);
    return plane;
  };
  softPlane(0x21150b, .5, 4.5, 1.6, -.45, 0, model.object);
  for (const name of ["passenger-coach-1", "passenger-coach-2"]) softPlane(0x21150b, .5, 2.5, 1.55, 0, 0, model.object.getObjectByName(name));
  softPlane(0xffbf61, .18, 1.9, 1.1, 2.06, 0, model.object);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .2 });
  const shadowGeometry = new THREE.PlaneGeometry(16, 16);
  resources.add(shadowMaterial); resources.add(shadowGeometry);
  const ground = new THREE.Mesh(shadowGeometry, shadowMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.025;
  ground.receiveShadow = true;
  scene.add(ground);
  const glowMaterial = new THREE.SpriteMaterial({ map: soft, color: 0xffd58b, opacity: .65, transparent: true, depthWrite: false });
  resources.add(glowMaterial);
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.set(1.64, 1.48, 0);
  glow.scale.set(.55, .55, 1);
  model.object.add(glow);
  const puffs = Array.from({ length: 14 }, (_, index) => {
    const mat = new THREE.SpriteMaterial({ map: soft, color: index % 2 ? 0xbfc4ba : 0xf4ead8, transparent: true, opacity: 0, depthWrite: false });
    resources.add(mat);
    const puff = new THREE.Sprite(mat);
    model.object.add(puff);
    return { puff, index };
  });
  const resize = () => renderer.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return {
    render(pose, elapsed, progress) {
      model.update({ ...pose, elapsed, progress });
      for (const { puff, index } of puffs) {
        const life = (elapsed / 1650 + index / puffs.length) % 1;
        puff.position.set(.91 - life * 1.45, 2.12 + life * 1.35, Math.sin(life * 4 + index) * .13);
        puff.scale.setScalar(.19 + life * .92);
        puff.material.rotation = life * .4 + index;
        puff.material.opacity = Math.sin(life * Math.PI) * .37 * Math.min(1, elapsed / 180);
      }
      glow.material.opacity = .55 + Math.sin(elapsed * .004) * .06;
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      model.dispose();
      for (const value of resources) value.dispose();
      key.shadow.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
