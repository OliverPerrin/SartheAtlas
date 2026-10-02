import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cars } from "../src/data/cars.ts";
import { shapes } from "../src/three/shapes.ts";
import { Body } from "../src/three/body.ts";
import { glazingPanels } from "../src/three/glazing.ts";
import { projectedPatchGeometry } from "../src/three/projectedPatch.ts";
import { uncachedProjectedPatch } from "./fixtures/uncached-projected-patch.mjs";

function exactAttributes(actual, expected, description) {
  assert.deepEqual(
    Object.keys(actual.attributes).sort(),
    Object.keys(expected.attributes).sort(),
    `${description}: attribute contract`,
  );
  assert.equal(
    actual.index,
    expected.index,
    `${description}: unchanged non-indexed winding`,
  );
  for (const name of Object.keys(expected.attributes)) {
    const a = actual.getAttribute(name),
      e = expected.getAttribute(name);
    assert.equal(a.constructor, e.constructor, `${description}: ${name} type`);
    assert.equal(a.itemSize, e.itemSize);
    assert.deepEqual(
      a.array,
      e.array,
      `${description}: bit-exact ${name} and triangle ordering`,
    );
  }
}

test("cached glazing projection preserves every car's ordered positions and normals exactly", () => {
  for (const car of cars) {
    const shape = shapes[car.id];
    for (const side of [-1, 1])
      for (const panel of glazingPanels(shape)) {
        const reference = uncachedProjectedPatch(
          new Body(shape.body),
          panel,
          side,
          0.002,
          5,
        );
        const stats = { emittedVertices: 0, evaluatedSamples: 0 };
        const cached = projectedPatchGeometry(
          new Body(shape.body),
          panel,
          side,
          0.002,
          5,
          { stats },
        );
        exactAttributes(cached, reference, `${car.id}/${side}`);
        assert.equal(
          cached.getAttribute("uv"),
          undefined,
          "patches retain their existing absence of a UV attribute",
        );
        assert.ok(
          stats.evaluatedSamples < stats.emittedVertices / 3,
          "shared projection coordinates are actually deduplicated",
        );
        reference.dispose();
        cached.dispose();
      }
  }
});

test("curved lenses, strips and empty patches keep the legacy subdivision and winding", () => {
  const body = new Body(shapes.porsche.body);
  const round = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 24;
    return [0.059 + Math.cos(angle) * 0.032, 0.575 + Math.sin(angle) * 0.084];
  });
  const panels = [
    round,
    [
      [0.034, 0.526],
      [0.119, 0.547],
      [0.117, 0.635],
      [0.041, 0.641],
    ],
    [],
  ];
  for (const panel of panels)
    for (const side of [-1, 1])
      for (const detail of [0, 3, 4]) {
        const reference = uncachedProjectedPatch(
          body,
          panel,
          side,
          0.018,
          detail,
        );
        const cached = body.patch(panel, side, 0.018, detail);
        exactAttributes(cached, reference, `lens/${side}/${detail}`);
        reference.dispose();
        cached.dispose();
      }
});

test("projection cache is build-local and cannot return a prior surface's coordinates", () => {
  let height = 1;
  const surface = {
    pointAt: (t, v) => new THREE.Vector3(t, v, height),
    surfaceAt: (t, v, side, lift) => new THREE.Vector3(t, v, height + lift),
  };
  const panel = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const first = projectedPatchGeometry(surface, panel, 1, 0.003, 3);
  height = 10;
  const second = projectedPatchGeometry(surface, panel, 1, 0.003, 3);
  assert.ok(
    second
      .getAttribute("position")
      .array.every((value, i) => i % 3 !== 2 || value > 10),
  );
  assert.notDeepEqual(
    first.getAttribute("position").array,
    second.getAttribute("position").array,
  );
  first.dispose();
  second.dispose();
});

test("building cached detail does not change shell UVs, indices or surface normals", () => {
  for (const id of ["ferrari", "porsche", "m4"]) {
    const body = new Body(shapes[id].body);
    const before = body.geometry();
    const patches = glazingPanels(shapes[id]).map((panel) =>
      body.patch(panel, 1, 0.002, 5),
    );
    const after = body.geometry();
    for (const name of ["position", "normal", "uv"])
      assert.deepEqual(
        after.getAttribute(name).array,
        before.getAttribute(name).array,
        `${id}: shell ${name}`,
      );
    assert.deepEqual(
      after.index.array,
      before.index.array,
      `${id}: shell winding`,
    );
    before.dispose();
    after.dispose();
    patches.forEach((g) => g.dispose());
  }
});
