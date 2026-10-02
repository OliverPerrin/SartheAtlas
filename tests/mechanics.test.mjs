import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import {
  annularDiscGeometry,
  engineBanks,
  drivelineInterfaces,
  mechanicalLayout,
  rotatedBankPoint,
} from "../src/three/mechanicalGeometry.ts";

test("engine bank transforms retain the stated cylinder architecture", () => {
  for (const car of cars) {
    const banks = engineBanks(car, 0.7);
    assert.equal(
      banks.reduce((count, bank) => count + bank.cylinders.length, 0),
      car.engine.cylinders,
      `${car.id}: cylinder count`,
    );
    assert.equal(
      banks.length,
      car.engine.config === "I" ? 1 : 2,
      `${car.id}: bank count`,
    );
    for (const bank of banks) {
      assert.equal(
        new Set(bank.cylinders).size,
        bank.cylinders.length,
        `${car.id}: cylinders do not overlap`,
      );
      const point = rotatedBankPoint(0, 0.3, 0, bank.angle);
      assert.ok(
        Math.abs(Math.hypot(point[1], point[2]) - 0.3) < 0.000001,
        `${car.id}: rotation retains bank length`,
      );
      if (car.engine.config === "F")
        assert.ok(
          Math.abs(point[1]) < 0.000001,
          "flat engine heads lie horizontally",
        );
      if (car.engine.config === "I")
        assert.deepEqual(point, [0, 0.3, 0], "inline engine stays upright");
    }
  }
});

test("known drivetrain and fuel packaging exceptions survive the assembly layout", () => {
  const layout = (id) => {
    const car = cars.find((car) => car.id === id);
    const shape = shapes[id];
    const body = new Body(shape.body);
    return { body, ...mechanicalLayout(car, body, shape) };
  };
  const porsche = layout("porsche");
  assert.ok(
    porsche.engineX < porsche.body.rearX,
    "Porsche engine remains behind the rear axle",
  );
  assert.ok(
    porsche.gearboxX > porsche.engineX,
    "Porsche gearbox stays ahead of the rear engine",
  );
  const porscheInterface = drivelineInterfaces(
    cars.find((car) => car.id === "porsche"),
    porsche,
  );
  assert.equal(
    porscheInterface.direction,
    -1,
    "rear-engine bellhousing faces the rear-mounted engine",
  );
  assert.ok(
    porscheInterface.bellhousingX < porsche.gearboxX,
    "Porsche clutch interface is on the engine side of the gearbox",
  );
  assert.ok(
    porsche.fuelX > 0 && porsche.fuelX > porsche.engineX,
    "documented Porsche front fuel tank",
  );
  assert.equal(
    layout("lexus").rearTransaxle,
    false,
    "unverified Lexus gearbox location is not claimed as a rear transaxle",
  );
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const result = mechanicalLayout(car, body, shape);
    assert.equal(
      result.gearboxTransverse,
      car.platform === "LMDh" || car.id === "oreca",
      `${car.id}: documented transverse casing`,
    );
    assert.ok(
      Object.values(result).every(
        (value) => typeof value === "boolean" || Number.isFinite(value),
      ),
      `${car.id}: finite assembly layout`,
    );
    assert.ok(
      Math.abs(result.engineX) + result.engineLength / 2 < body.spec.length / 2,
      `${car.id}: engine inside longitudinal study envelope`,
    );
  }
});

test("brake rotors have a true central opening and separate thickness for ventilation", () => {
  const outer = 0.19,
    inner = 0.085,
    thickness = 0.006;
  const g = annularDiscGeometry(outer, inner, thickness);
  const p = g.getAttribute("position");
  const n = g.getAttribute("normal");
  assert.ok(p.array.every(Number.isFinite) && n.array.every(Number.isFinite));
  const radii = Array.from({ length: p.count }, (_, i) =>
    Math.hypot(p.getX(i), p.getY(i)),
  );
  assert.ok(
    radii.every((r) => r >= inner - 0.000001 && r <= outer + 0.000001),
    "no filled hub disc hides the annular rotor opening",
  );
  g.computeBoundingBox();
  assert.ok(
    Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - thickness) < 0.000001,
    "rotor skin thickness does not fill the ventilation gap",
  );
  g.dispose();
});
