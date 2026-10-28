import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cars } from "../src/data/cars.ts";
import { shapes } from "../src/three/shapes.ts";
import { Body } from "../src/three/body.ts";
import {
  inspectionFrame,
  setCameraProjection,
} from "../src/three/inspectionCamera.ts";
import { cockpitLayout } from "../src/three/cockpitLayout.ts";
import { mechanicalLayout } from "../src/three/mechanicalGeometry.ts";
import { layerWeights } from "../src/three/layerPlan.ts";
import { specsFor } from "../src/data/systems.ts";

const close = (value, expected) => Math.abs(value - expected) < 1e-9;

test("inspection cameras follow the same staged weights as the parts for every car", () => {
  const samples = [0, 0.125, 0.25, 0.375, 0.5, 0.6, 0.75, 0.86, 1];
  for (const car of cars) {
    const shape = shapes[car.id],
      body = new Body(shape.body);
    const layout = cockpitLayout(car, body, shape);
    const engine = mechanicalLayout(car, body, shape).engineX;
    for (const preset of ["cockpit", "pedals", "powertrain", "running"]) {
      for (const exploded of samples) {
        const frame = inspectionFrame(car, body, shape, preset, exploded);
        const layers = layerWeights(exploded);
        const cabinRise = 0.72 * layers.cabin;
        assert.ok(
          [...frame.position, ...frame.target, frame.fov].every(Number.isFinite),
        );
        assert.ok(
          new THREE.Vector3(...frame.position).distanceTo(
            new THREE.Vector3(...frame.target),
          ) > 0.3,
        );
        assert.ok(frame.fov > 30 && frame.fov < 90);
        if (preset === "cockpit") {
          assert.ok(close(frame.target[0], layout.wheel[0]));
          assert.ok(close(frame.target[1], layout.wheel[1] + cabinRise));
          assert.ok(close(frame.target[2], layout.wheel[2]));
          assert.ok(close(frame.position[1], layout.wheel[1] + 0.78 + cabinRise));
          assert.ok(
            frame.position[0] < layout.wheel[0],
            "instrument faces remain visible from the driver side",
          );
        } else if (preset === "pedals" && layout.prototype) {
          const roof = body.x(shape.cockpit.roof);
          assert.ok(close(frame.target[0], roof + 0.82));
          assert.ok(close(frame.target[1], 0.15 + cabinRise));
          assert.ok(close(frame.target[2], layout.z));
        } else if (preset === "pedals") {
          assert.ok(close(frame.target[0], layout.pedals[0] + 0.02));
          assert.ok(close(frame.target[1], layout.pedals[1] + 0.1 + cabinRise));
          assert.ok(close(frame.target[2], layout.z + 0.02));
        } else if (preset === "powertrain") {
          const rear = car.engine.position === "rear";
          const frontQuarter = car.engine.position === "front-mid";
          assert.ok(
            close(
              frame.target[0],
              rear
                ? engine + 0.04
                : frontQuarter
                  ? engine - 0.08 * layers.cabin
                  : engine,
            ),
          );
          assert.ok(
            close(
              frame.target[1],
              (rear ? 0.45 : frontQuarter ? 0.47 : 0.4) + 0.5 * layers.cabin,
            ),
          );
        } else {
          assert.ok(close(frame.position[1], 1.02 + 0.05 * layers.bodywork));
          assert.ok(close(frame.position[2], 0.32 + 0.35 * layers.cabin));
          assert.ok(close(frame.target[1], 0.35 + 0.04 * layers.cabin));
          assert.ok(
            close(
              frame.target[2],
              body.wheelZ * 0.65 + 0.5 * layers.cabin,
            ),
          );
        }
      }
    }
    // Cabin cameras hold still through the bodywork/cooling stops, then move
    // once with the cabin and stay put while the structure separates.
    for (const preset of ["cockpit", "pedals", "powertrain"]) {
      const assembled = inspectionFrame(car, body, shape, preset, 0);
      const bodyLifted = inspectionFrame(car, body, shape, preset, 0.25);
      const cooled = inspectionFrame(car, body, shape, preset, 0.5);
      const cabinLifted = inspectionFrame(car, body, shape, preset, 0.75);
      const structure = inspectionFrame(car, body, shape, preset, 1);
      assert.deepEqual(bodyLifted, assembled);
      assert.deepEqual(cooled, assembled);
      assert.notDeepEqual(cabinLifted.target, assembled.target);
      assert.deepEqual(structure, cabinLifted);
    }
  }
});

test("prototype pedal sightlines clear the opaque tub walls through lifting and lowering", () => {
  for (const car of cars.filter((car) => car.category !== "LMGT3")) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const xFrom = body.x(shape.cockpit.from);
    const xTo = body.x(shape.cockpit.to);
    // Opaque chassis sidewalls and upper rails, as rendered by CarModel.
    for (const lift of [0, 0.25, 0.5, 0.625, 0.75, 1, 0.75, 0.5, 0]) {
      const frame = inspectionFrame(car, body, shape, "pedals", lift);
      const origin = new THREE.Vector3(...frame.position);
      const target = new THREE.Vector3(...frame.target);
      const direction = target.clone().sub(origin).normalize();
      const ray = new THREE.Ray(origin, direction);
      const rise = 0.32 * layerWeights(lift).structure;
      for (const side of [-1, 1]) {
        for (const [y, height, width] of [[0.32, 0.46, 0.075], [0.55, 0.035, 0.09]]) {
          const wall = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3((xFrom + xTo) / 2, y + rise, side * 0.35),
            new THREE.Vector3(xFrom - xTo, height, width),
          );
          const hit = ray.intersectBox(wall, new THREE.Vector3());
          assert.ok(!hit || hit.distanceTo(origin) > target.distanceTo(origin),
            `${car.id} at ${lift}: chassis wall obscures pedals`);
        }
      }
    }
  }
});

test("close camera projection preserves a usable near plane and architecture corrections reach specifications", () => {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  setCameraProjection(camera, 68, 0.012);
  assert.equal(camera.fov, 68);
  assert.equal(camera.near, 0.012);
  assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
  const alpine = cars.find((car) => car.id === "alpine");
  assert.equal(
    specsFor(alpine, "engine").find(([label]) => label === "Aspiration")[1],
    "Single turbocharger",
  );
  const porsche = cars.find((car) => car.id === "porsche");
  assert.match(
    specsFor(porsche, "suspension").find(
      ([label]) => label === "Architecture",
    )[1],
    /multi-link/i,
  );
});
