import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cars, exteriorReferences, systems } from "../src/data.ts";

test("the dated catalogue covers the 18 listed car families without duplicate IDs", () => {
  assert.equal(cars.length, 18);
  assert.equal(new Set(cars.map((c) => c.id)).size, 18);
  assert.deepEqual(
    ["Hypercar", "LMP2", "LMGT3"].map(
      (k) => cars.filter((c) => c.category === k).length,
    ),
    [8, 1, 9],
  );
  assert.equal(cars.find((c) => c.id === "toyota").name, "TR010 Hybrid");
  assert.ok(
    !cars.some((c) => c.category === "Hypercar" && c.make === "Porsche"),
  );
});
test("every car has a source and every exterior reference retains its caveat and creator", () => {
  for (const car of cars) {
    assert.ok(new URL(car.source).protocol === "https:");
    if (car.model) {
      assert.match(car.model, /^[a-f0-9]{32}$/);
      assert.ok(exteriorReferences[car.id].note);
      assert.ok(car.author);
    }
  }
});
test("non-hybrid and GT entries do not receive hybrid classification", () => {
  for (const car of cars.filter(
    (c) => c.category !== "Hypercar" || c.id === "aston",
  ))
    assert.ok(!car.architecture.includes("· hybrid"));
});
test("component IDs and educational descriptions are complete", () => {
  assert.equal(new Set(systems.map((s) => s.id)).size, systems.length);
  for (const s of systems) {
    assert.ok(s.text.length > 80);
    assert.ok(s.detail.length > 60);
  }
});
test("the circuit preserves real geographic coordinates, a closed lap and named corners", async () => {
  const geo = JSON.parse(
    await readFile(
      new URL("../public/data/sarthe.geojson", import.meta.url),
      "utf8",
    ),
  );
  const outline = geo.features.find((f) => f.properties.role === "outline")
    .geometry.coordinates;
  assert.ok(outline.length > 100);
  for (const [lon, lat] of outline) {
    assert.ok(lon > 0 && lon < 1);
    assert.ok(lat > 47 && lat < 49);
  }
  const first = outline[0],
    last = outline.at(-1);
  assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.001);
  const corners = geo.features.filter((f) => f.properties.role === "corner");
  assert.equal(
    corners.find((c) => c.properties.number === 12).properties.display,
    "Arnage",
  );
  assert.equal(
    corners.find((c) => c.properties.number === 18).properties.display,
    "Ford Chicane",
  );
});
