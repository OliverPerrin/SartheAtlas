import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import { mechanicalLayout } from "../src/three/mechanicalGeometry.ts";
import {
  engineMechanism,
  pistonStudyGeometry,
  sleeveSectionGeometry,
  transmissionGearCount,
  transmissionMechanism,
  toothedGearGeometry,
  gearHalfThickness,
} from "../src/three/machineryGeometry.ts";

test("study gear flanks preserve pitch thickness and taper along the involute", () => {
  for (const teeth of [24, 30, 36]) {
    const module = 0.004,
      pitch = (teeth * module) / 2;
    assert.ok(
      Math.abs(
        2 * pitch * gearHalfThickness(teeth, module, pitch) -
          (Math.PI * module) / 2,
      ) < 1e-9,
    );
    const base = pitch * Math.cos((20 * Math.PI) / 180);
    assert.ok(
      gearHalfThickness(teeth, module, base) >
        gearHalfThickness(teeth, module, pitch),
    );
    assert.ok(
      gearHalfThickness(teeth, module, pitch) >
        gearHalfThickness(teeth, module, pitch + module),
    );
    assert.ok(gearHalfThickness(teeth, module, pitch + module) > 0);
  }
});

test("sectioned engine topology retains cylinder counts and actual bank orientations", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const { engineLength } = mechanicalLayout(car, body, shape);
    const mechanism = engineMechanism(car, engineLength);
    assert.equal(mechanism.cylinders.length, car.engine.cylinders, car.id);
    assert.equal(mechanism.banks.length, car.engine.config === "I" ? 1 : 2);
    for (const cylinder of mechanism.cylinders) {
      assert.ok(
        [cylinder.piston, cylinder.wristPin, cylinder.crankPin]
          .flat()
          .every(Number.isFinite),
      );
      const rodLength = Math.hypot(
        ...cylinder.wristPin.map((v, i) => v - cylinder.crankPin[i]),
      );
      assert.ok(
        rodLength > 0.1 && rodLength < 0.2,
        `${car.id}: connected rod study`,
      );
      if (car.engine.config === "F")
        assert.ok(
          Math.abs(cylinder.piston[1]) < 0.000001,
          "flat pistons stay horizontal",
        );
      if (car.engine.config === "I")
        assert.equal(
          cylinder.piston[2],
          0,
          "inline pistons share one upright bank",
        );
    }
    // These are explicitly generic educational valve arrangements, not sources.
    assert.equal(mechanism.illustratedValvesPerCylinder, 4);
    assert.equal(mechanism.illustratedCamsPerBank, 2);
  }
});

test("sectioned transmission respects published gear counts and three-shaft LMDh topology", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    const mechanism = transmissionMechanism(car, new Body(shape.body), shape);
    assert.equal(
      mechanism.countDocumented,
      transmissionGearCount(car) !== null,
    );
    assert.equal(mechanism.pairs.length, transmissionGearCount(car) ?? 4);
    assert.equal(mechanism.shafts.length, car.platform === "LMDh" ? 3 : 2);
    assert.equal(
      mechanism.transverse,
      car.platform === "LMDh" || car.id === "oreca",
    );
    const shaftGap = Math.hypot(
      ...mechanism.shafts[0].map((v, i) => v - mechanism.shafts[1][i]),
    );
    for (const pair of mechanism.pairs) {
      assert.ok(
        Math.abs(((pair.teethA + pair.teethB) * pair.module) / 2 - shaftGap) <
          0.000001,
        `${car.id}: pitch radii meet at the shaft separation`,
      );
    }
  }
  const unknown = { ...cars[0], gearbox: "Sequential racing gearbox" };
  assert.equal(
    transmissionGearCount(unknown),
    null,
    "missing count cannot become documented through a visual fallback",
  );
});

test("liner section is genuinely open and mechanism geometry keeps central apertures", () => {
  const sleeve = sleeveSectionGeometry();
  const piston = pistonStudyGeometry();
  const gear = toothedGearGeometry(24, 0.004);
  for (const g of [sleeve, piston, gear]) {
    assert.ok(g.getAttribute("position").array.every(Number.isFinite));
    assert.ok(g.getAttribute("normal").array.every(Number.isFinite));
  }
  const linerPositions = sleeve.getAttribute("position");
  assert.ok(
    Array.from({ length: linerPositions.count }, (_, i) =>
      linerPositions.getZ(i),
    ).every((z) => z <= 0.000001),
    "near half of the liner is removed rather than made transparent",
  );
  const gears = gear.getAttribute("position");
  assert.ok(
    Array.from({ length: gears.count }, (_, i) =>
      Math.hypot(gears.getX(i), gears.getY(i)),
    ).every((r) => r >= 0.011),
    "gear bore remains open",
  );
  sleeve.dispose();
  piston.dispose();
  gear.dispose();
});
