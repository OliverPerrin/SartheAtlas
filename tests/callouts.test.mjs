import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { systemsFor } from "../src/data/systems.ts";
import {
  engineeringDetailsFor,
  engineeringLayoutFor,
} from "../src/data/engineeringDetails.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import { calloutAnchors } from "../src/three/calloutAnchors.ts";
import { mechanicalLayout } from "../src/three/mechanicalGeometry.ts";

test("lubrication markers target a present reservoir or sump pump", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const layout = mechanicalLayout(car, body, shape);
    const anchor = calloutAnchors(car, body, shape, "engine").find((a) =>
      a.match.includes("circuit"),
    );
    const local = engineeringLayoutFor(car).drySump
      ? [layout.engineLength * 0.43, 0.2, -0.29]
      : [layout.engineLength * 0.36, -0.0825, 0.13];
    const expected = [
      layout.engineX + local[0] * layout.engineScale,
      layout.engineY + local[1] * layout.engineScale,
      local[2] * layout.engineScale,
    ];
    assert.deepEqual(anchor.at, expected, car.id);
  }
});

test("every 3D callout names a listed component at a finite point near the car", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    for (const system of systemsFor(car)) {
      const names = engineeringDetailsFor(car, system.id).components.map(
        (part) => part.name.toLowerCase(),
      );
      const anchors = calloutAnchors(car, body, shape, system.id);
      assert.ok(anchors.length >= 2, `${car.id}/${system.id} has callouts`);
      const matched = new Set();
      for (const anchor of anchors) {
        const index = names.findIndex(
          (name, i) =>
            !matched.has(i) && anchor.match.some((word) => name.includes(word)),
        );
        assert.ok(
          index >= 0,
          `${car.id}/${system.id}: "${anchor.match.join("|")}" matches no component`,
        );
        matched.add(index);
        assert.ok(anchor.at.every(Number.isFinite));
        assert.ok(Math.abs(anchor.at[0]) < body.spec.length / 2 + 0.3);
        assert.ok(anchor.at[1] > -0.1 && anchor.at[1] < 1.6);
        assert.ok(Math.abs(anchor.at[2]) < body.spec.width / 2 + 0.3);
      }
    }
  }
});
