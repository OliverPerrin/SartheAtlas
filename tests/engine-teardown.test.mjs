import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cars } from "../src/data/cars.ts";
import { engineeringLayoutFor } from "../src/data/engineeringDetails.ts";
import {
  engineBanks,
  mechanicalLayout,
  rotatedBankPoint,
} from "../src/three/mechanicalGeometry.ts";
import {
  engineMechanism,
  sleeveSectionGeometry,
} from "../src/three/machineryGeometry.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import { inspectionFrame } from "../src/three/inspectionCamera.ts";
import {
  bankNormal,
  barrelTubeRadius,
  barrelTubeGeometry,
  camCoverColor,
  coverDistances,
  coverLayer,
  coverLayerDelay,
  cylinderDeckGeometry,
  drivelineCoverBand,
  engineArchitecture,
  engineCoverPhase,
  engineCoverTravel,
  gasketFrameGeometry,
  headerPaths,
  intakePaths,
  jacketInspectionTilt,
  linerOuterRadius,
  openCoverGeometry,
  plenumPlacement,
  sleeveOpeningDirection,
  turboStudyPositions,
} from "../src/three/engineTeardown.ts";

test("deck apertures and tilted jackets expose near-bank crowns in the powertrain view", () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const jacketGeometry = barrelTubeGeometry();
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const layout = mechanicalLayout(car, body, shape);
    const mechanism = engineMechanism(car, layout.engineLength);
    const model = new THREE.Group();
    model.position.set(layout.engineX, layout.engineY, 0);
    model.scale.setScalar(layout.engineScale);
    const jackets = [];
    const decks = [];
    for (const bank of mechanism.banks) {
      const cylinders = mechanism.cylinders.filter(
        (c) => c.angle === bank.angle,
      );
      const xs = cylinders.map((c) => c.x);
      const width =
        car.engine.config === "I"
          ? 0.2
          : car.engine.config === "F"
            ? 0.15
            : 0.17;
      const group = new THREE.Group();
      group.rotation.x = bank.angle;
      model.add(group);
      const deck = new THREE.Mesh(
        cylinderDeckGeometry(layout.engineLength, width * 0.92, xs),
        material,
      );
      deck.position.y = 0.2;
      group.add(deck);
      decks.push(deck);
      deck.updateMatrixWorld(true);
      // Test triangle intersections through each machined bore, not just vertices.
      for (const x of xs) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(x, 1, 0),
          new THREE.Vector3(0, -1, 0),
        );
        const flatDeck = new THREE.Mesh(deck.geometry, material);
        flatDeck.position.y = 0.2;
        flatDeck.updateMatrixWorld(true);
        assert.equal(
          ray.intersectObject(flatDeck).length,
          0,
          `${car.id}: bore at ${x} is open`,
        );
      }
      for (const cylinder of cylinders) {
        const jacket = new THREE.Mesh(jacketGeometry, material);
        jacket.position.set(cylinder.x, 0.147, engineCoverTravel.barrel);
        jacket.quaternion.copy(jacketInspectionTilt(bank.angle, 1));
        group.add(jacket);
        jackets.push(jacket);
      }
    }
    model.updateMatrixWorld(true);
    const camera = new THREE.Vector3(
      ...inspectionFrame(car, body, shape, "powertrain", 0).position,
    );
    const nearBank = mechanism.banks.find((bank) => bank.side >= 0);
    for (const cylinder of mechanism.cylinders.filter(
      (c) => c.angle === nearBank.angle,
    )) {
      const crown = new THREE.Vector3(
        ...rotatedBankPoint(cylinder.x, 0.199, 0, cylinder.angle),
      ).applyMatrix4(model.matrixWorld);
      const direction = crown.clone().sub(camera);
      const ray = new THREE.Raycaster(
        camera,
        direction.clone().normalize(),
        0,
        direction.length() - 0.0001,
      );
      assert.equal(
        ray.intersectObjects([...jackets, ...decks], false).length,
        0,
        `${car.id}: crown at ${cylinder.x} is exposed`,
      );
    }
    decks.forEach((deck) => deck.geometry.dispose());
  }
  jacketGeometry.dispose();
  material.dispose();
});

test("engine covers finish the driveline band and open housings force full lift", () => {
  assert.equal(engineCoverPhase(0, false), 0);
  assert.equal(engineCoverPhase(drivelineCoverBand.start, false), 0);
  assert.equal(engineCoverPhase(drivelineCoverBand.end, false), 1);
  assert.equal(engineCoverPhase(1, false), 1);
  assert.equal(engineCoverPhase(0, true), 1);
  assert.equal(engineCoverPhase(0.2, true), 1);
  const mid = engineCoverPhase(0.625, false);
  assert.ok(mid > 0.45 && mid < 0.55, `smoothstep midpoint ${mid}`);
  assert.ok(engineCoverPhase(0.56, false) < engineCoverPhase(0.7, false));
  assert.equal(engineCoverPhase(0.7, false), engineCoverPhase(0.7, false));
});

test("delayed cover layers are seated at 0 and fully clear at 1", () => {
  for (const delay of Object.values(coverLayerDelay)) {
    assert.equal(coverLayer(0, delay), 0, `delay ${delay}`);
    assert.equal(coverLayer(1, delay), 1, `delay ${delay}`);
    assert.equal(coverLayer(delay, delay), 0);
  }
  const closed = coverDistances(0);
  const open = coverDistances(1);
  for (const key of Object.keys(engineCoverTravel)) {
    assert.equal(closed[key], 0, key);
    assert.equal(open[key], engineCoverTravel[key], key);
  }
  const mid = coverDistances(0.62);
  assert.ok(mid.camCover > mid.compressorCover);
  assert.ok(mid.sump < mid.camCover);
});

test("cover normals match inline, vee and opposed banks", () => {
  const up = bankNormal(0);
  assert.ok(Math.abs(up[1] - 1) < 1e-9 && Math.abs(up[2]) < 1e-9);
  const flat = engineBanks(
    cars.find((car) => car.id === "porsche"),
    0.6,
  );
  assert.deepEqual(
    flat.map((bank) => Math.sign(bankNormal(bank.angle)[2])),
    [-1, 1],
  );
  const wide = engineBanks(
    cars.find((car) => car.id === "ferrari"),
    0.54,
  );
  for (const bank of wide) {
    const normal = bankNormal(bank.angle);
    const opening = sleeveOpeningDirection(bank.angle);
    assert.ok(Math.abs(normal[1] * opening[1] + normal[2] * opening[2]) < 1e-9);
    assert.ok(Math.abs(normal[2]) > 0.8, "120° covers move mostly sideways");
  }
  const inline = bankNormal(0);
  const inlineOpening = sleeveOpeningDirection(0);
  assert.ok(inline[1] > 0.99);
  assert.ok(inlineOpening[2] > 0.99);
});

test("architecture follows published configuration without adding turbos", () => {
  const families = new Map();
  for (const car of cars) {
    const architecture = engineArchitecture(car);
    const layout = engineeringLayoutFor(car);
    assert.equal(architecture.turboCount, layout.turboCount, car.id);
    families.set(
      architecture.family,
      (families.get(architecture.family) ?? 0) + 1,
    );
    if (car.id === "porsche") {
      assert.equal(architecture.family, "flat-six");
      assert.equal(architecture.singleThrottle, true);
      assert.equal(architecture.crankcaseOpening, "valley");
      assert.equal(architecture.turboCount, 0);
    }
    if (car.id === "m4") {
      assert.equal(architecture.family, "inline-six");
      assert.equal(architecture.intake, "inline-side");
      assert.equal(architecture.turboCount, 2);
    }
    if (car.id === "alpine") {
      assert.equal(architecture.family, "single-turbo-vee-six");
      assert.equal(architecture.turboSite, "single-collector");
      assert.equal(turboStudyPositions(car, 0.54).length, 1);
    }
    if (car.id === "aston") {
      assert.equal(architecture.family, "vee-twelve");
      assert.equal(architecture.intake, "airbox");
      assert.equal(architecture.turboCount, 0);
    }
    if (!car.engine.turbo) assert.equal(architecture.turboSite, "none", car.id);
    const travel = engineCoverTravel.camCover;
    for (const bank of engineBanks(car, 0.6)) {
      const normal = bankNormal(bank.angle);
      const offset = normal.map((axis) => axis * travel);
      assert.ok(Math.hypot(...offset) > 0.1 && Math.hypot(...offset) < 0.16);
    }
  }
  assert.equal(families.get("flat-six"), 1);
  assert.equal(families.get("inline-six"), 1);
  assert.equal(families.get("vee-twelve"), 1);
  assert.equal(families.get("single-turbo-vee-six"), 1);
  assert.equal(
    camCoverColor(cars.find((car) => car.id === "ferrari")),
    "#9e2027",
  );
});

test("covers are open shells and the barrel tube can seal the liner", () => {
  const cover = openCoverGeometry(0.4, 0.18, 0.06);
  const seat = cover.getAttribute("position");
  let centerOnSeat = 0;
  let lid = 0;
  let flange = 0;
  for (let i = 0; i < seat.count; i++) {
    const x = seat.getX(i);
    const y = seat.getY(i);
    const z = seat.getZ(i);
    if (y < 0.008 && Math.hypot(x, z) < 0.04) centerOnSeat += 1;
    if (y > 0.05) lid += 1;
    if (Math.abs(z) > 0.09) flange += 1;
  }
  assert.equal(centerOnSeat, 0, "gasket seat stays open");
  assert.ok(lid > 0 && flange > 0);
  cover.dispose();

  const gasket = gasketFrameGeometry(0.4, 0.16);
  const frame = gasket.getAttribute("position");
  let gasketCenter = 0;
  for (let i = 0; i < frame.count; i++) {
    if (Math.hypot(frame.getX(i), frame.getZ(i)) < 0.04) gasketCenter += 1;
  }
  assert.equal(gasketCenter, 0);
  gasket.dispose();

  const sleeve = sleeveSectionGeometry();
  const liner = sleeve.getAttribute("position");
  for (let i = 0; i < liner.count; i++) {
    assert.ok(liner.getZ(i) <= 0.000001);
    assert.ok(
      Math.hypot(liner.getX(i), liner.getZ(i)) <= linerOuterRadius + 0.001,
    );
  }
  assert.ok(barrelTubeRadius > linerOuterRadius);
  sleeve.dispose();
});

test("intake flanges stop at the plenum and headers reach a collector", () => {
  for (const car of cars) {
    const length = car.engine.cylinders >= 12 ? 0.82 : 0.6;
    const plenum = plenumPlacement(car, length);
    for (const path of intakePaths(car, length)) {
      const end = path.at(-1);
      const dx = Math.abs(end[0] - plenum.center[0]) - plenum.size[0] / 2;
      const dy = Math.abs(end[1] - plenum.center[1]) - plenum.size[1] / 2;
      const dz = Math.abs(end[2] - plenum.center[2]) - plenum.size[2] / 2;
      assert.ok(
        Math.max(dx, dy, dz) < 0.02,
        `${car.id} intake enters the plenum`,
      );
      assert.ok(path.flat().every(Number.isFinite), car.id);
    }
    const headers = headerPaths(car, length);
    assert.equal(headers.length, car.engine.cylinders, car.id);
    assert.ok(
      headers.some((path) => Math.abs(path[1][2]) > 0.2),
      car.id,
    );
    if (car.id === "alpine")
      assert.equal(turboStudyPositions(car, length).length, 1);
  }
});
