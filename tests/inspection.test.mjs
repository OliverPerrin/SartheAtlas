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
import { specsFor } from "../src/data/systems.ts";

test("inspection cameras follow the actual study layout and its exploded offsets for every car", () => {
  for (const car of cars) {
    const shape = shapes[car.id],
      body = new Body(shape.body);
    const layout = cockpitLayout(car, body, shape);
    for (const preset of ["cockpit", "pedals", "powertrain", "running"]) {
      const frame = inspectionFrame(car, body, shape, preset, 0);
      const raised = inspectionFrame(car, body, shape, preset, 1);
      assert.ok(
        [...frame.position, ...frame.target, frame.fov].every(Number.isFinite),
      );
      assert.ok(
        new THREE.Vector3(...frame.position).distanceTo(
          new THREE.Vector3(...frame.target),
        ) > 0.3,
      );
      assert.ok(frame.fov > 30 && frame.fov < 90);
      const lift =
        preset === "powertrain" ? 0.75 : preset === "running" ? 0.05 : 0.9;
      assert.ok(Math.abs(raised.target[1] - frame.target[1] - lift) < 1e-9);
    }
    const cockpit = inspectionFrame(car, body, shape, "cockpit", 0);
    assert.ok(
      new THREE.Vector3(...cockpit.target).distanceTo(
        new THREE.Vector3(...layout.wheel),
      ) < 0.06,
    );
    assert.ok(
      cockpit.position[0] < layout.wheel[0],
      "instrument faces remain visible from the driver side",
    );
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
