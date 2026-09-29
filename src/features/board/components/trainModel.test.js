import test from "node:test";
import assert from "node:assert/strict";
import { createTrainModel } from "./trainModel.js";

test("기관차와 석탄차, 두 객차의 바퀴는 시간 대신 이동 거리에 맞춰 회전한다", () => {
  const model = createTrainModel();
  const wheels = [];
  model.object.traverse(child => { if (child.name.endsWith("wheel")) wheels.push(child); });
  assert.equal(wheels.length, 20);
  model.update({ distance: 100, elapsed: 500, progress: .3 });
  const angles = wheels.map(wheel => wheel.rotation.z);
  model.update({ distance: 100, elapsed: 900, progress: .3 });
  assert.deepEqual(wheels.map(wheel => wheel.rotation.z), angles);
  model.update({ distance: 200, elapsed: 1100, progress: .6 });
  wheels.forEach((wheel, index) => assert.ok(Math.abs(wheel.rotation.z - angles[index] * 2) < 1e-9));
  model.dispose();
});

test("석탄차 관절은 급격한 커브에서도 제한되고 정지 후 차체 흔들림이 남지 않는다", () => {
  const model = createTrainModel();
  const body = model.object.getObjectByName("locomotive-body");
  const tender = model.object.getObjectByName("articulated-tender");
  for (const turn of [-10, -.1, 0, .1, 10]) {
    model.update({ heading: 1.3, progress: 1, turn, elapsed: 1837, distance: 740 });
    assert.ok(Math.abs(tender.rotation.y) <= .22);
    assert.equal(body.position.y, 0);
    assert.equal(Math.abs(body.rotation.x), 0);
    assert.equal(model.object.rotation.y, 1.3);
  }
  model.dispose();
});

test("기차의 반복 디테일은 GPU 리소스를 공유하고 종료할 때 한 번만 해제한다", () => {
  const model = createTrainModel();
  const meshes = [];
  model.object.traverse(child => { if (child.isMesh) meshes.push(child); });
  const geometries = new Set(meshes.map(mesh => mesh.geometry));
  const materials = new Set(meshes.map(mesh => mesh.material));
  assert.ok(meshes.length < 170);
  assert.ok(geometries.size <= 90);
  assert.ok(materials.size <= 12);
  assert.equal(model.object.getObjectByName("coal-load").count, 24);
  assert.ok(model.object.getObjectByName("headlamp").material.emissiveIntensity > 0);
  const disposed = new Map();
  for (const resource of [...geometries, ...materials]) resource.addEventListener("dispose", () => disposed.set(resource, (disposed.get(resource) || 0) + 1));
  model.dispose();
  model.dispose();
  // 합치기 전 캐시 지오메트리까지 함께 해제한다
  assert.equal(disposed.size, geometries.size + materials.size);
  for (const count of disposed.values()) assert.equal(count, 1);
});
