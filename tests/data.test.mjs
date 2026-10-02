import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cars } from "../src/data/cars.ts";
import { entries, entriesFor } from "../src/data/entries.ts";
import { exteriorReferences } from "../src/data/references.ts";
import { systems, systemsFor, specsFor } from "../src/data/systems.ts";

test("the dated catalogue covers the 18 listed car families without duplicate IDs", () => {
  assert.equal(cars.length, 18);
  assert.equal(new Set(cars.map((car) => car.id)).size, 18);
  assert.deepEqual(
    ["Hypercar", "LMP2", "LMGT3"].map(
      (category) => cars.filter((car) => car.category === category).length,
    ),
    [8, 1, 9],
  );
  assert.equal(cars.find((car) => car.id === "toyota").name, "TR010 Hybrid");
  assert.ok(
    !cars.some((car) => car.category === "Hypercar" && car.make === "Porsche"),
  );
});

test("every car has a source and exterior references retain caveats and creators", () => {
  for (const car of cars) assert.equal(new URL(car.source).protocol, "https:");
  for (const [id, reference] of Object.entries(exteriorReferences)) {
    assert.ok(cars.some((car) => car.id === id));
    assert.match(reference.id, /^[a-f0-9]{32}$/);
    assert.ok(reference.note.length > 20);
    assert.ok(reference.author.length > 2);
  }
});

test("all 62 provisional entries resolve to a car and retain complete crew and colour metadata", () => {
  assert.equal(entries.length, 62);
  assert.equal(
    new Set(entries.map((entry) => entry.number)).size,
    entries.length,
  );
  for (const entry of entries) {
    assert.ok(cars.some((car) => car.id === entry.carId));
    assert.equal(entry.drivers.length, 3);
    assert.ok(entry.drivers.every((driver) => driver.length > 3));
    assert.ok(entry.team.length > 2);
    for (const color of [
      entry.livery.base,
      entry.livery.second,
      entry.livery.accent,
    ])
      assert.match(color, /^#[a-f\d]{6}$/i);
  }
  for (const car of cars) assert.ok(entriesFor(car.id).length > 0);
  assert.ok(entries.some((entry) => entry.number === "007"));
  assert.ok(entries.some((entry) => entry.number === "009"));
});

test("non-hybrid cars exclude hybrid components and specifications", () => {
  for (const car of cars) {
    assert.equal(
      systemsFor(car).some((system) => system.id === "hybrid"),
      Boolean(car.hybrid),
    );
    assert.equal(specsFor(car, "hybrid").length > 0, Boolean(car.hybrid));
    if (car.category !== "Hypercar" || car.id === "aston")
      assert.equal(car.hybrid, null);
  }
});

test("component IDs and educational descriptions are complete", () => {
  assert.equal(systems.length, 14);
  assert.equal(
    new Set(systems.map((system) => system.id)).size,
    systems.length,
  );
  for (const system of systems) {
    assert.ok(system.text.length > 80);
    assert.ok(system.endurance.length > 60);
  }
});

test("the circuit preserves geographic coordinates, a closed lap and named corners", async () => {
  const geo = JSON.parse(
    await readFile(
      new URL("../public/data/sarthe.geojson", import.meta.url),
      "utf8",
    ),
  );
  const outline = geo.features.find(
    (feature) => feature.properties.role === "outline",
  ).geometry.coordinates;
  assert.ok(outline.length > 100);
  for (const [lon, lat] of outline) {
    assert.ok(lon > 0 && lon < 1);
    assert.ok(lat > 47 && lat < 49);
  }
  const first = outline[0],
    last = outline.at(-1);
  assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.001);
  const corners = geo.features.filter(
    (feature) => feature.properties.role === "corner",
  );
  assert.equal(
    corners.find((corner) => corner.properties.number === 12).properties
      .display,
    "Arnage",
  );
  assert.equal(
    corners.find((corner) => corner.properties.number === 18).properties
      .display,
    "Ford Chicane",
  );
});

test("all 18 car families have detailed exterior metadata, source images and visible variant caveats", () => {
  assert.equal(Object.keys(exteriorReferences).length, cars.length);
  assert.equal(new Set(Object.values(exteriorReferences).map((reference) => reference.id)).size, cars.length);
  for (const car of cars) {
    const reference = exteriorReferences[car.id];
    assert.ok(reference, `${car.id}: exterior reference`);
    assert.ok(reference.assetLabel.length > 10, `${car.id}: visible variant label`);
    assert.ok(reference.modelTitle.length > 3);
    assert.ok(reference.triangles > 100000, `${car.id}: detailed mesh metadata`);
    assert.equal(new URL(reference.poster).hostname, "media.sketchfab.com");
    assert.ok(reference.poster.includes(`/models/${reference.id}/thumbnails/`));
    assert.equal(new URL(reference.sourceUrl).hostname, "sketchfab.com");
    assert.equal(new URL(reference.authorUrl).hostname, "sketchfab.com");
    assert.ok(Number.isFinite(Date.parse(reference.publishedAt)));
    if (reference.film) {
      assert.match(reference.film.id, /^[\w-]{11}$/);
      assert.equal(new URL(reference.film.poster).hostname, "i.ytimg.com");
      assert.ok(reference.film.author && reference.film.note);
    }
  }
});
