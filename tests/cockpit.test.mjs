import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seatShellGeometry,
  harnessRibbonGeometry,
} from "../src/three/cockpitGeometry.ts";

function assertSurface(geometry) {
  const position = geometry.getAttribute("position"),
    normal = geometry.getAttribute("normal");
  assert.ok(position.array.every(Number.isFinite));
  assert.ok(geometry.index.array.every((i) => i >= 0 && i < position.count));
  for (let i = 0; i < normal.count; i++)
    assert.ok(
      Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) <
        0.0001,
      "nondegenerate surface normals",
    );
}

test("prototype and GT seat shells remain open, curved cradles with finite surface coordinates", () => {
  for (const recline of [1, 0.78]) {
    const geometry = seatShellGeometry(recline);
    assertSurface(geometry);
    assert.ok(geometry.getAttribute("uv").array.every((v) => v >= 0 && v <= 1));
    geometry.computeBoundingBox();
    assert.ok(
      geometry.boundingBox.max.y >= 0.649 && geometry.boundingBox.max.y < 0.67,
    );
    assert.ok(
      geometry.boundingBox.min.x < -0.22 && geometry.boundingBox.max.x > 0.2,
    );
    assert.ok(
      Math.abs(geometry.boundingBox.max.z + geometry.boundingBox.min.z) <
        0.0001,
      "symmetric side support",
    );
    const p = geometry.getAttribute("position");
    assert.ok(
      p.getY(0) - p.getY(12) > 0.1,
      "thigh bolster rises beside the cushion",
    );
    const shoulder = 30 * 25;
    assert.ok(
      p.getX(shoulder) - p.getX(shoulder + 12) > 0.1,
      "shoulder cradle turns forward",
    );
    geometry.dispose();
  }
});

test("shoulder, lap and crotch belts preserve finite width and do not collapse along a path axis", () => {
  for (const points of [
    [
      [-0.22, 0.45, 0.085],
      [-0.11, 0.28, 0.07],
      [0.02, 0.1, 0.025],
    ],
    [
      [0, 0.025, 0.21],
      [0.025, 0.1, 0.15],
      [0.02, 0.108, 0.018],
    ],
    [
      [0.13, 0.0, 0.055],
      [0.135, 0.056, 0.045],
      [0.033, 0.105, 0.022],
    ],
    [
      [0, 0, 0],
      [0.1, 0, 0],
      [0.2, 0, 0],
    ],
  ]) {
    const geometry = harnessRibbonGeometry(points, 0.046);
    assertSurface(geometry);
    const p = geometry.getAttribute("position");
    for (let i = 0; i < p.count; i += 2)
      assert.ok(
        Math.abs(
          Math.hypot(
            p.getX(i) - p.getX(i + 1),
            p.getY(i) - p.getY(i + 1),
            p.getZ(i) - p.getZ(i + 1),
          ) - 0.046,
        ) < 0.000001,
      );
    geometry.dispose();
  }
});
