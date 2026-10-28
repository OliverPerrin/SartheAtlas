import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { bodyOutlines } from "../src/data/bodyOutlines.ts";
import { exteriorReferences } from "../src/data/references.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";

const top = (body, t) =>
  Math.max(body.f.spineY(t), body.f.crestY(t), body.f.tubY(t));

test("every car with an exterior reference has a measured outline", () => {
  for (const car of cars) {
    if (!exteriorReferences[car.id]) continue;
    const outline = bodyOutlines[car.id];
    assert.ok(outline, car.id);
    assert.equal(outline.top.length, 41);
    assert.equal(outline.half.length, 41);
    assert.ok(
      outline.top.every((v) => v >= 0 && v < 1.6),
      car.id,
    );
    assert.ok(
      outline.half.every((v) => v >= 0 && v <= 1.1),
      car.id,
    );
    assert.ok(outline.heightUntil > 0.2 && outline.heightUntil < 0.9);
  }
});

test("fitted studies follow their reference outlines ahead of the wing or canopy", () => {
  for (const car of cars) {
    const outline = bodyOutlines[car.id];
    const fitted = new Body(shapes[car.id].body);
    let error = 0;
    let n = 0;
    outline.top.forEach((measured, i) => {
      const t = i / (outline.top.length - 1);
      if (t < 0.05 || t > outline.heightUntil - 0.05) return;
      error += Math.abs(top(fitted, t) - measured);
      n++;
    });
    if (!n) continue;
    assert.ok(
      error / n < 0.08,
      `${car.id} mean height error ${(error / n).toFixed(3)} m`,
    );
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      for (const key of ["spineY", "crestY", "tubY", "outerZ", "valleyZ"])
        assert.ok(Number.isFinite(fitted.f[key](t)), `${car.id} ${key}`);
      assert.ok(fitted.f.outerZ(t) <= fitted.spec.width / 2 + 1e-9);
    }
  }
});
