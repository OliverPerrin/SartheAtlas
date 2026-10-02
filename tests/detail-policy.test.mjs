import { test } from "node:test";
import assert from "node:assert/strict";
import { studyDetailPolicy } from "../src/three/detailPolicy.ts";
import { rimGeometry, spokeMatrices } from "../src/three/wheelGeometry.ts";

const assembled = { xray: false, selected: null };

test("an opaque assembled study does not construct hidden detailed systems", () => {
  assert.deepEqual(studyDetailPolicy(assembled, 0), {
    internals: false,
    wheelEnds: false,
  });
  assert.deepEqual(studyDetailPolicy({ ...assembled, selected: "body" }, 0), {
    internals: false,
    wheelEnds: false,
  });
  assert.deepEqual(
    studyDetailPolicy({ ...assembled, wheelsRemoved: true }, 0),
    { internals: false, wheelEnds: true },
  );
});

test("all reveal controls and internal selection restore detailed assemblies", () => {
  for (const flag of ["xray", "bodyRemoved", "sectioned", "inspection"]) {
    assert.deepEqual(
      studyDetailPolicy({ ...assembled, [flag]: true }, 0),
      { internals: true, wheelEnds: true },
      flag,
    );
  }
  assert.deepEqual(studyDetailPolicy(assembled, 1), {
    internals: true,
    wheelEnds: true,
  });
  for (const selected of [
    "engine",
    "gearbox",
    "hybrid",
    "chassis",
    "fuel",
    "cooling",
    "cockpit",
  ])
    assert.equal(
      studyDetailPolicy({ ...assembled, selected }, 0).internals,
      true,
      selected,
    );
  for (const selected of ["brakes", "suspension"])
    assert.equal(
      studyDetailPolicy({ ...assembled, selected }, 0).wheelEnds,
      true,
      selected,
    );
  assert.deepEqual(
    studyDetailPolicy(assembled, 0),
    { internals: false, wheelEnds: false },
    "reset returns to assembled construction",
  );
});

test("instanced rim spokes retain both sides and the original radial orientation", () => {
  for (const design of ["ferrari", "porsche"]) {
    const { geometry, spokeCount } = rimGeometry(design, 0.34);
    const matrices = spokeMatrices(0.34, spokeCount);
    assert.equal(matrices.length, spokeCount * 2);
    assert.ok(
      matrices.every((matrix) => matrix.elements.every(Number.isFinite)),
    );
    for (const g of Object.values(geometry))
      assert.ok(g.getAttribute("position").array.every(Number.isFinite));
    // The front and rear rim faces keep the same centred depth as the former
    // separate meshes, so instancing cannot move them into the tyre shoulders.
    assert.ok(
      Math.abs(matrices[0].elements[13] + (0.34 * 0.395 - 0.009)) < 0.000001,
    );
    assert.ok(
      Math.abs(matrices[spokeCount].elements[13] - (0.34 * 0.395 - 0.009)) <
        0.000001,
    );
    Object.values(geometry).forEach((g) => g.dispose());
  }
});
