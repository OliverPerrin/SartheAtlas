import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";

test("every catalogue car produces a finite, indexed body with valid normals and UV coordinates", () => {
  for (const car of cars) {
    assert.ok(shapes[car.id], `${car.id} has a dedicated shape`);
    const body = new Body(shapes[car.id].body);
    const geometry = body.geometry();
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    assert.ok(positions.count > 1000, car.id);
    assert.equal(normals.count, positions.count);
    assert.equal(uv.count, positions.count);
    for (const attribute of [positions, normals, uv])
      assert.ok(
        attribute.array.every(Number.isFinite),
        `${car.id}: finite ${attribute.name || "attribute"}`,
      );
    assert.ok(
      geometry.index.array.every(
        (index) => index >= 0 && index < positions.count,
      ),
      `${car.id}: valid indices`,
    );
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    assert.ok(
      Math.abs(bounds.max.x - bounds.min.x - body.spec.length) < 0.001,
      `${car.id}: length`,
    );
    assert.ok(
      bounds.max.y > body.spec.wheelR * 2,
      `${car.id}: roof clears the wheels`,
    );
    assert.ok(
      Math.abs(bounds.max.z + bounds.min.z) < 0.001,
      `${car.id}: symmetric body`,
    );
    assert.ok(body.frontX > body.rearX && body.rearX > -body.spec.length / 2);
    geometry.dispose();
  }
});

test("car families retain distinct silhouette parameters and the wheel arches clear slick tyres", () => {
  assert.equal(
    new Set(cars.map((car) => JSON.stringify(shapes[car.id].body))).size,
    cars.length,
  );
  for (const car of cars) {
    const body = new Body(shapes[car.id].body);
    for (const axle of [body.frontX, body.rearX]) {
      const floor = body.f.floorY(body.t(axle));
      assert.ok(
        body.archY(axle, floor) > body.spec.wheelR * 2,
        `${car.id}: wheel clearance`,
      );
    }
  }
});

test("glazing conforms to the shell apertures without invalid surface normals", async () => {
  const { glazingPanels } = await import("../src/three/glazing.ts");
  for (const car of cars) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    for (const panel of glazingPanels(shape)) {
      assert.ok(
        panel.every(([t, v]) => t >= 0 && t <= 1 && v >= 0 && v <= 1),
        `${car.id}: aperture in shell UV bounds`,
      );
      for (const side of [-1, 1]) {
        const g = body.patch(panel, side, 0.002, 2);
        const p = g.getAttribute("position");
        const n = g.getAttribute("normal");
        assert.ok(
          p.count >= 48 && p.array.every(Number.isFinite),
          `${car.id}: curved glazing`,
        );
        for (let i = 0; i < n.count; i++) {
          assert.ok(
            Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 0.0001,
            `${car.id}: unit glazing normal`,
          );
        }
        // Mirrored panes must stay on their own side of the centreline.
        assert.ok(
          Array.from({ length: p.count }, (_, i) => p.getZ(i) * side).every(
            (z) => z >= -0.0001,
          ),
          `${car.id}: glazing side`,
        );
        g.dispose();
      }
    }
  }
});

test("slick sidewall branding follows the rounded tyre rather than a flat disc", async () => {
  const { slickTyreGeometry } = await import("../src/three/tyre.ts");
  const { rubber, sidewalls } = slickTyreGeometry();
  for (const [i, g] of sidewalls.entries()) {
    const p = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    const ys = Array.from({ length: p.count }, (_, n) => Math.abs(p.getY(n)));
    assert.ok(
      Math.max(...ys) - Math.min(...ys) > 0.01,
      "sidewall keeps its curved profile",
    );
    assert.ok(
      ys.every((y) => y > 0.135 && y < 0.175),
      "branding remains on sidewall",
    );
    assert.ok(
      p.array.every(Number.isFinite) && uv.array.every((v) => v >= 0 && v <= 1),
    );
    assert.ok(
      Array.from(
        { length: p.count },
        (_, n) => p.getY(n) * (i === 0 ? -1 : 1),
      ).every((y) => y > 0),
    );
    g.dispose();
  }
  rubber.dispose();
});

test("GT bodies carry a full-width greenhouse, a waist between flared arches and rounded bumpers", () => {
  for (const car of cars.filter((c) => c.category === "LMGT3")) {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const { from } = shape.cockpit;
    const { header, back, deck, pillar } = shape.glass;
    assert.ok(
      from < header && header < pillar && pillar < back + (deck - back) && back < deck,
      `${car.id}: glazing stations in order`,
    );
    // The glass base stands close to the door skin, not on a wide shelf.
    const door = body.pointAt(pillar, 0.32).z;
    const glassBase = body.pointAt(pillar, 0.72).z;
    assert.ok(door - glassBase < 0.3, `${car.id}: shelf ${(door - glassBase).toFixed(2)} m`);
    assert.ok(glassBase > 0.58, `${car.id}: cabin width`);
    // The roof stands well clear of the belt line.
    assert.ok(
      body.pointAt(shape.cockpit.roof, 1).y - body.pointAt(pillar, 0.72).y > 0.22,
      `${car.id}: greenhouse height`,
    );
    // Fenders are the widest points; the doors sit inside them.
    const front = body.halfWidthAt(body.t(body.frontX));
    const rear = body.halfWidthAt(body.t(body.rearX));
    assert.ok(body.halfWidthAt(pillar) <= Math.max(front, rear) + 1e-9, `${car.id}: waist`);
    // Both bumpers turn their corners in plan.
    assert.ok(body.halfWidthAt(0) < body.halfWidthAt(0.08) - 0.1, `${car.id}: nose corner`);
    assert.ok(body.halfWidthAt(1) < body.halfWidthAt(0.93) - 0.1, `${car.id}: tail corner`);
  }
});

test("the light body used from the air keeps the same shape with a fraction of the triangles", () => {
  for (const id of ["ferrari", "oreca", "porsche"]) {
    const full = new Body(shapes[id].body).geometry();
    const light = new Body(shapes[id].body, "light").geometry();
    assert.ok(light.index.count < full.index.count * 0.4, `${id}: ${light.index.count / 3} triangles`);
    full.computeBoundingBox();
    light.computeBoundingBox();
    for (const axis of ["x", "y", "z"])
      assert.ok(
        Math.abs(full.boundingBox.max[axis] - light.boundingBox.max[axis]) < 0.03,
        `${id}: ${axis} extent`,
      );
    full.dispose();
    light.dispose();
  }
});
