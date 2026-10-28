import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { systems, systemsFor } from "../src/data/systems.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import {
  BUILD_STEPS,
  createBuildClock,
  currentStep,
  detachedAmount,
  liveryApplied,
  packGarage,
} from "../src/three/teardown.ts";
import { buildStreamlines } from "../src/three/aeroField.ts";

test("the build sequence installs every system exactly once, structure first and wheels last", () => {
  const listed = BUILD_STEPS.flatMap((step) => step.systems);
  assert.deepEqual([...listed].sort(), systems.map((s) => s.id).sort());
  assert.equal(new Set(listed).size, listed.length);
  assert.ok(BUILD_STEPS[0].systems.includes("chassis"));
  assert.deepEqual(BUILD_STEPS.at(-1).systems, ["wheels"]);
  for (const car of cars)
    for (const step of BUILD_STEPS) assert.ok(step.detail(car).length > 30);
});

test("parts stay on the floor until their step, then travel monotonically onto the car", () => {
  for (const system of systems.map((s) => s.id)) {
    assert.equal(detachedAmount(system, 0), 1, system);
    assert.equal(detachedAmount(system, 1), 0, system);
    let previous = 1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const away = detachedAmount(system, p);
      assert.ok(away <= previous + 1e-9, `${system} moves back at ${p}`);
      previous = away;
    }
  }
  // Steps go in order: the tub is fitted before the engine moves.
  const engineStarts = [...Array(101).keys()].find(
    (i) => detachedAmount("engine", i / 100) < 1,
  );
  assert.equal(detachedAmount("chassis", engineStarts / 100), 0);
  assert.equal(currentStep(0), 0);
  assert.equal(currentStep(1), BUILD_STEPS.length - 1);
  assert.ok(!liveryApplied(0.5) && liveryApplied(1));
  assert.equal(detachedAmount("engine", Number.NaN), 1);
});

test("the playback clock restarts a finished build and stops at the end", () => {
  const clock = createBuildClock(1);
  let events = 0;
  clock.subscribe(() => events++);
  clock.play();
  assert.equal(clock.get(), 0);
  assert.ok(clock.isPlaying());
  for (let i = 0; i < 2000 && clock.tick(0.05); i++);
  assert.equal(clock.get(), 1);
  assert.ok(!clock.isPlaying());
  assert.ok(events > 10);
  clock.set(4);
  assert.equal(clock.get(), 1);
});

test("the garage layout keeps assemblies apart, on the floor and inside labelled zones", () => {
  const box = (system, key, min, max) => ({ key, system, min, max });
  const items = [
    box("body", "b", [-2.5, 0.08, -1], [2.5, 1.05, 1]),
    box("lights", "l", [-2.5, 0.3, -0.8], [2.5, 0.8, 0.8]),
    box("wing", "w", [-2.6, 0.9, -0.95], [-2.2, 1.1, 0.95]),
    box("floor", "f", [-2.4, 0.02, -0.9], [2.3, 0.1, 0.9]),
    box("chassis", "c", [-1, 0.1, -0.45], [1.6, 0.9, 0.45]),
    box("engine", "e", [-1.8, 0.15, -0.3], [-1.1, 0.7, 0.3]),
    box("gearbox", "g", [-2.4, 0.15, -0.2], [-1.8, 0.5, 0.2]),
    box("cockpit", "k", [-0.6, 0.1, -0.3], [0.9, 1, 0.4]),
    ...[0, 1, 2, 3].flatMap((i) => [
      box("wheels", `wh${i}`, [1.2, 0, 0.6], [1.9, 0.7, 1]),
      box("brakes", `br${i}`, [1.3, 0.2, 0.5], [1.8, 0.6, 0.7]),
      box("suspension", `su${i}`, [1.2, 0.1, 0.2], [1.8, 0.6, 0.8]),
    ]),
  ];
  const layout = packGarage(items);
  const placed = items
    .filter((item) => item.system !== "lights")
    .map((item) => {
      const [dx, dy, dz] = layout.offsets.get(item.key);
      assert.ok(
        Math.abs(item.min[1] + dy) < 1e-9,
        `${item.key} rests on the floor`,
      );
      return {
        key: item.key,
        x0: item.min[0] + dx,
        x1: item.max[0] + dx,
        z0: item.min[2] + dz,
        z1: item.max[2] + dz,
      };
    });
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const overlap =
        Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.01 &&
        Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 0.01;
      assert.ok(!overlap, `${a.key} overlaps ${b.key}`);
    }
  for (const p of placed)
    assert.ok(
      layout.zones.some(
        (z) =>
          z.label !== "Build bay" &&
          p.x0 >= z.x0 &&
          p.x1 <= z.x1 &&
          p.z0 >= z.z0 &&
          p.z1 <= z.z1,
      ),
      `${p.key} inside a zone`,
    );
  assert.deepEqual(layout.offsets.get("l"), layout.offsets.get("b"));
  assert.ok(layout.zones.filter((z) => z.label).length >= 4);
  const wheelTag = layout.tags.find((tag) => tag.system === "wheels");
  assert.equal(wheelTag.count, 4);
  assert.ok(layout.bounds.x1 - layout.bounds.x0 <= 12.5);
  // The build bay at the car's own position stays clear of laid-out parts.
  const bay = layout.zones.find((z) => z.label === "Build bay");
  for (const p of placed) assert.ok(p.z1 < bay.z0, `${p.key} clear of the bay`);
});

test("wind-tunnel paths are finite, stay off the ground and pass over the body", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const lines = buildStreamlines(body, shape);
    assert.ok(lines.length > 80, car.id);
    const kinds = new Set(lines.map((line) => line.kind));
    for (const kind of ["over", "side", "under", "vortex"])
      assert.ok(kinds.has(kind), `${car.id} ${kind}`);
    for (const line of lines) {
      assert.ok(line.points.every(Number.isFinite));
      for (let i = 1; i < line.time.length; i++)
        assert.ok(line.time[i] > line.time[i - 1]);
      for (let i = 1; i < line.points.length; i += 3)
        assert.ok(line.points[i] > 0.01);
      assert.ok(line.speed.every((s) => s >= 0.2 && s <= 2));
    }
    // A centreline stream at bumper height must clear the roof, not cut through it.
    const roofT = shape.cockpit.roof;
    const roofX = body.x(roofT);
    const top = body.topAt(roofT);
    const centre = lines.find(
      (line) =>
        line.kind !== "side" &&
        line.kind !== "under" &&
        Math.abs(line.points[2]) < 0.1 &&
        Math.abs(line.points[1] - 0.48) < 0.01,
    );
    assert.ok(centre, `${car.id} centre stream`);
    let nearest = 0;
    for (let i = 0; i < centre.speed.length; i++)
      if (
        Math.abs(centre.points[i * 3] - roofX) <
        Math.abs(centre.points[nearest * 3] - roofX)
      )
        nearest = i;
    assert.ok(
      centre.points[nearest * 3 + 1] > top,
      `${car.id} clears the roof`,
    );
    assert.ok(
      centre.speed[nearest] > 1.1,
      `${car.id} accelerates over the roof`,
    );
  }
});

test("every catalogued car has a build step for each of its systems", () => {
  for (const car of cars)
    for (const system of systemsFor(car))
      assert.ok(
        BUILD_STEPS.some((step) => step.systems.includes(system.id)),
        `${car.id}/${system.id}`,
      );
});
