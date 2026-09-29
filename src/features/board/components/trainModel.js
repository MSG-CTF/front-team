import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TRAIN_CAR_OFFSETS, TRAIN_WORLD_SCALE } from "../utils/trainLayout.js";

// 장식 재질과 지오메트리를 공유하는 황동 증기 기관차
export function createTrainModel() {
  const object = new THREE.Group();
  object.name = "msg-express";
  const body = new THREE.Group();
  body.name = "locomotive-body";
  object.add(body);
  const tender = new THREE.Group();
  tender.name = "articulated-tender";
  tender.position.x = -1.38;
  object.add(tender);
  const geometries = new Map();
  const materials = new Set();
  const geometry = (key, build) => {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  };
  const material = (color, metalness = 0, roughness = .5, options = {}) => {
    const value = new THREE.MeshPhysicalMaterial({ color, metalness, roughness, ...options });
    materials.add(value);
    return value;
  };
  const enamel = material(0x153c30, .32, .29, { clearcoat: .7, clearcoatRoughness: .24 });
  const wine = material(0x5a211c, .18, .4);
  const brass = material(0xbf9049, .78, .28);
  const edge = material(0xe9c878, .65, .24);
  const copper = material(0x9c5330, .65, .36);
  const iron = material(0x293330, .7, .32);
  const soot = material(0x121916, .25, .62);
  const coal = material(0x111714, .13, .84);
  const glass = material(0xffd58a, .16, .25, { emissive: 0xffb953, emissiveIntensity: .45 });
  const lampGlass = material(0xfff3c7, .1, .18, { emissive: 0xffcd79, emissiveIntensity: 2 });
  const mesh = (geo, mat, x, y, z, parent = body) => {
    const value = new THREE.Mesh(geo, mat);
    value.position.set(x, y, z);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  };
  const box = (w, h, d, mat, x, y, z, radius = .025, parent = body) =>
    mesh(geometry(`box:${w},${h},${d},${radius}`, () => new RoundedBoxGeometry(w, h, d, 2, radius)), mat, x, y, z, parent);
  const cylinder = (r1, r2, height, mat, x, y, z, axis = "y", parent = body) => {
    const value = mesh(geometry(`cylinder:${r1},${r2},${height}`, () => new THREE.CylinderGeometry(r1, r2, height, 32)), mat, x, y, z, parent);
    if (axis === "x") value.rotation.z = Math.PI / 2;
    if (axis === "z") value.rotation.x = Math.PI / 2;
    return value;
  };
  const ring = (radius, tube, mat, x, y, z, axis = "z", parent = body) => {
    const value = mesh(geometry(`ring:${radius},${tube}`, () => new THREE.TorusGeometry(radius, tube, 8, 32)), mat, x, y, z, parent);
    if (axis === "x") value.rotation.y = Math.PI / 2;
    return value;
  };
  const sphere = (radius, mat, x, y, z, parent = body) =>
    mesh(geometry(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 20, 12)), mat, x, y, z, parent);
  const pipe = (points, radius, mat, parent = body) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return mesh(geometry(`pipe:${radius}:${JSON.stringify(points)}`, () => new THREE.TubeGeometry(curve, 18, radius, 6, false)), mat, 0, 0, 0, parent);
  };
  const rivets = (points, parent = body) => {
    const bolts = new THREE.InstancedMesh(geometry("rivet", () => new THREE.SphereGeometry(.021, 8, 6)), brass, points.length);
    const matrix = new THREE.Matrix4();
    points.forEach((point, i) => { matrix.makeTranslation(...point); bolts.setMatrixAt(i, matrix); });
    bolts.name = "brass-rivets";
    bolts.instanceMatrix.needsUpdate = true;
    parent.add(bolts);
  };
  box(2.77, .17, .84, wine, .07, .47, 0);
  box(2.92, .075, 1.03, brass, .08, .6, 0, .012);
  box(2.67, .055, 1.07, enamel, .06, .65, 0, .014);
  cylinder(.425, .425, 1.64, enamel, .56, 1.06, 0, "x");
  cylinder(.434, .434, .24, soot, 1.27, 1.06, 0, "x");
  for (const x of [-.12, .48, 1.13]) {
    cylinder(.435, .435, .055, brass, x, 1.06, 0, "x");
    ring(.44, .012, edge, x - .023, 1.06, 0, "x");
  }
  cylinder(.414, .414, .07, iron, 1.415, 1.06, 0, "x");
  ring(.377, .028, brass, 1.458, 1.06, 0, "x");
  cylinder(.092, .092, .095, brass, 1.49, 1.06, 0, "x");
  box(.06, .24, .037, iron, 1.54, 1.06, 0, .01);
  box(.06, .037, .24, iron, 1.54, 1.06, 0, .01);
  rivets(Array.from({ length: 18 }, (_, i) => [1.46, 1.06 + Math.cos(i * Math.PI / 9) * .33, Math.sin(i * Math.PI / 9) * .33]));
  // 운전실 창틀은 유리보다 앞에, 곡면 지붕은 창 위에 둔다
  box(.91, 1.08, .91, enamel, -.78, 1.12, 0);
  for (const side of [-1, 1]) {
    const z = side * .467;
    box(.66, .53, .035, brass, -.79, 1.3, z, .045);
    box(.57, .435, .035, soot, -.79, 1.3, z + side * .022, .025);
    box(.5, .38, .035, glass, -.79, 1.3, z + side * .043, .02);
    box(.032, .395, .038, brass, -.79, 1.3, z + side * .069, .009);
    box(.53, .028, .038, brass, -.79, 1.31, z + side * .069, .008);
    box(.71, .065, .065, edge, -.79, 1.015, z, .018);
    box(.39, .15, .03, brass, -.8, .82, z + side * .012, .045);
    box(.31, .094, .033, wine, -.8, .82, z + side * .029, .027);
    for (let i = 0; i < 3; i += 1) box(.015, .056, .013, edge, -.845 + i * .045, .82, z + side * .052, .005);
    for (const y of [.32, .47]) box(.42, .043, .18, iron, -1.04, y, side * .59, .012);
    pipe([[-1.18, .69, side * .54], [-1.18, .94, side * .54], [-1.1, .98, side * .54]], .018, brass);
    pipe([[-.28, .9, side * .46], [.0, 1.24, side * .43], [1.05, 1.24, side * .43]], .023, brass);
    cylinder(.15, .15, .47, iron, .95, .44, side * .37, "x");
    cylinder(.155, .155, .045, copper, 1.18, .44, side * .37, "x");
  }
  const roofSection = new THREE.Shape();
  roofSection.moveTo(-.62, 0);
  roofSection.quadraticCurveTo(0, .26, .62, 0);
  roofSection.lineTo(.62, -.055);
  roofSection.quadraticCurveTo(0, .19, -.62, -.055);
  roofSection.closePath();
  const roofGeometry = geometry("arched-roof", () => new THREE.ExtrudeGeometry(roofSection, { depth: 1.12, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 2, steps: 1, curveSegments: 18 }));
  const roof = mesh(roofGeometry, soot, -1.35, 1.68, 0);
  roof.rotation.y = Math.PI / 2;
  for (const x of [-1.35, -.23]) pipe([[x, 1.675, -.62], [x, 1.79, 0], [x, 1.675, .62]], .018, brass);
  rivets([-1.16, -.4].flatMap(x => [-.469, .469].flatMap(z => [.74, .94, 1.62].map(y => [x, y, z]))));
  cylinder(.135, .2, .48, iron, .91, 1.64, 0);
  cylinder(.24, .135, .19, copper, .91, 1.975, 0);
  ring(.222, .034, brass, .91, 2.08, 0).rotation.x = Math.PI / 2;
  cylinder(.185, .185, .012, soot, .91, 2.083, 0);
  cylinder(.21, .24, .11, brass, .17, 1.49, 0);
  sphere(.205, brass, .17, 1.57, 0).scale.y = .78;
  cylinder(.036, .036, .25, brass, -.16, 1.56, .16);
  cylinder(.14, .065, .16, brass, -.16, 1.755, .16);
  sphere(.035, copper, -.16, 1.83, .16);
  cylinder(.18, .18, .2, brass, 1.455, 1.48, 0, "x");
  cylinder(.143, .143, .026, lampGlass, 1.572, 1.48, 0, "x").name = "headlamp";
  ring(.145, .016, edge, 1.59, 1.48, 0, "x");
  box(.12, .13, 1.1, wine, 1.52, .32, 0);
  for (const z of [-.42, -.21, 0, .21, .42]) box(.45, .048, .049, brass, 1.59, .32, z, .012).rotation.z = .38;
  // 석탄차의 피벗을 연결부에 둬 커브를 따라 꺾는다
  box(1.04, .14, .86, iron, -.65, .41, 0, .025, tender);
  box(.97, .57, .88, enamel, -.65, .755, 0, .03, tender);
  box(1.03, .055, .94, brass, -.65, 1.064, 0, .016, tender);
  box(.82, .018, .74, soot, -.65, 1.095, 0, .02, tender);
  for (const z of [-.452, .452]) {
    box(.84, .22, .015, wine, -.65, .79, z, .025, tender);
    for (const x of [-1.06, -.24]) box(.027, .43, .022, brass, x, .79, z, .008, tender);
    box(.86, .022, .025, edge, -.65, .965, z, .008, tender);
    rivets([-1.08, -.81, -.54, -.22].flatMap(x => [.56, 1.01].map(y => [x, y, z])), tender);
  }
  const coals = new THREE.InstancedMesh(geometry("coal", () => new THREE.DodecahedronGeometry(.11, 0)), coal, 24);
  coals.name = "coal-load";
  const coalMatrix = new THREE.Object3D();
  for (let i = 0; i < 24; i += 1) {
    coalMatrix.position.set(-.98 + i % 6 * .13, 1.12 + Math.sin(i * 1.7) * .035, -.25 + Math.floor(i / 6) * .16);
    coalMatrix.rotation.set(i * .7, i * 1.2, i * .35);
    coalMatrix.scale.setScalar(.75 + (i % 4) * .12);
    coalMatrix.updateMatrix();
    coals.setMatrixAt(i, coalMatrix.matrix);
  }
  coals.castShadow = true;
  tender.add(coals);
  box(.29, .055, .08, brass, .06, .42, 0, .014, tender);
  const wheels = [];
  const rods = [];
  const coaches = [];
  const driverRadius = .335;
  const wheel = (x, z, radius, parent, name) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(x, radius + .025, z);
    parent.add(pivot);
    const front = z < 0 ? -.09 : .09;
    ring(radius - .038, .044, iron, 0, 0, 0, "z", pivot);
    ring(radius - .039, .016, edge, 0, 0, front, "z", pivot);
    cylinder(.078, .078, .16, wine, 0, 0, 0, "z", pivot);
    for (let spoke = 0; spoke < 6; spoke += 1) box(radius * 1.65, .034, .03, brass, 0, 0, front * .62, .008, pivot).rotation.z = spoke * Math.PI / 6;
    cylinder(.047, .047, .2, brass, 0, 0, 0, "z", pivot);
    cylinder(.026, .026, .035, edge, 0, radius * .43, front * 1.26, "z", pivot);
    wheels.push({ pivot, radius });
  };
  for (const side of [-1, 1]) {
    for (const x of [-.88, -.16, .56]) wheel(x, side * .545, driverRadius, object, "driving-wheel");
    wheel(1.21, side * .405, .17, object, "pilot-wheel");
    for (const x of [-.98, -.35]) wheel(x, side * .48, .21, tender, "tender-wheel");
    const rod = box(1.49, .06, .048, brass, -.16, driverRadius + .025, side * .678, .023, object);
    rod.name = "connecting-rod";
    rods.push(rod);
    for (const x of [-.88, -.16, .56]) cylinder(.047, .047, .045, copper, x + .16, 0, 0, "z", rod);
  }
  for (let index = 0; index < 2; index += 1) {
    const coach = new THREE.Group();
    coach.name = `passenger-coach-${index + 1}`;
    coach.position.x = -TRAIN_CAR_OFFSETS[index + 1];
    object.add(coach);
    coaches.push(coach);
    const paint = index === 0 ? wine : enamel;
    box(2.2, .12, .86, iron, 0, .42, 0, .025, coach);
    box(1.96, .83, .87, paint, 0, .91, 0, .045, coach);
    box(2.08, .065, .99, brass, 0, .51, 0, .015, coach);
    box(2.04, .065, .97, edge, 0, 1.33, 0, .015, coach);
    const coachRoof = mesh(roofGeometry, soot, -1.12, 1.43, 0, coach);
    coachRoof.rotation.y = Math.PI / 2;
    coachRoof.scale.z = 2;
    for (const side of [-1, 1]) {
      for (const x of [-.66, -.22, .22, .66]) {
        box(.355, .47, .025, brass, x, 1.015, side * .451, .035, coach);
        box(.291, .393, .03, glass, x, 1.025, side * .475, .023, coach);
        box(.018, .4, .027, brass, x, 1.025, side * .494, .006, coach);
      }
      box(1.89, .025, .025, edge, 0, .722, side * .456, .007, coach);
      for (const x of [-1.08, 1.08]) {
        box(.025, .38, .025, brass, x, .74, side * .43, .008, coach);
        box(.15, .045, .22, iron, x, .29, side * .48, .01, coach);
      }
      for (const x of [-.68, .68]) wheel(x, side * .5, .21, coach, "coach-wheel");
    }
    for (const x of [-1.1, 1.1]) {
      box(.035, .035, .88, brass, x, .94, 0, .01, coach);
      box(.19, .06, .12, iron, x, .4, 0, .015, coach);
    }
    for (const x of [-.7, 0, .7]) box(.12, .055, .4, iron, x, 1.63, 0, .025, coach);
    if (index === 1) for (const z of [-.34, .34]) cylinder(.058, .058, .055, glass, -1.025, .98, z, "x", coach);
  }

  // 고정 부품은 재질별로 묶어 객차를 늘려도 드로 콜이 급증하지 않게 한다
  const combine = (parent, label) => {
    const groups = new Map();
    for (const child of [...parent.children]) {
      if (!child.isMesh || child.isInstancedMesh || child.name) continue;
      if (!groups.has(child.material)) groups.set(child.material, []);
      groups.get(child.material).push(child);
    }
    for (const [mat, children] of groups) {
      if (children.length < 2) continue;
      const geo = geometry(`combined:${label}:${mat.id}`, () => {
        const parts = children.map(child => {
          child.updateMatrix();
          const part = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
          return part.applyMatrix4(child.matrix);
        });
        const merged = mergeGeometries(parts);
        parts.forEach(part => part.dispose());
        return merged;
      });
      children.forEach(child => parent.remove(child));
      mesh(geo, mat, 0, 0, 0, parent);
    }
  };
  combine(body, "body");
  combine(tender, "tender");
  coaches.forEach((coach, index) => combine(coach, `coach-${index}`));
  wheels.forEach(({ pivot, radius }) => combine(pivot, `wheel-${radius}-${Math.sign(pivot.position.z)}`));
  let disposed = false;
  return {
    object,
    update({ heading = 0, distance = 0, elapsed = 0, progress = 0, turn = 0, cars }) {
      const speed = Math.max(0, 4 * progress * (1 - progress));
      object.rotation.y = heading;
      body.position.y = Math.sin(elapsed * .028) * .009 * speed;
      body.rotation.x = Math.sin(elapsed * .014) * .007 * speed;
      tender.rotation.y = Math.max(-.22, Math.min(.22, turn));
      if (cars?.length === 3) {
        [tender, ...coaches].forEach((car, index) => {
          const pose = cars[index];
          const center = index === 0 ? -.65 : 0;
          car.rotation.y = pose.heading;
          car.position.x = pose.x - center * Math.cos(pose.heading);
          car.position.z = pose.z + center * Math.sin(pose.heading);
        });
      }
      const worldUnits = distance / TRAIN_WORLD_SCALE;
      for (const { pivot, radius } of wheels) pivot.rotation.z = -worldUnits / radius;
      const phase = -worldUnits / driverRadius;
      for (const rod of rods) {
        rod.position.x = -.16 + Math.cos(phase) * driverRadius * .43;
        rod.position.y = driverRadius + .025 + Math.sin(phase) * driverRadius * .43;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      object.traverse(child => { if (child.isInstancedMesh) child.dispose(); });
      for (const value of geometries.values()) value.dispose();
      for (const value of materials) value.dispose();
    },
  };
}
