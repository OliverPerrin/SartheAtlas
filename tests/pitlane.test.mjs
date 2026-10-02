import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readPitLane } from "../src/data/pitLane.ts";
import {
  buildPitLane,
  distanceMetres,
  PIT_WAY_IDS,
} from "../scripts/fetch-circuit-pitlane.mjs";

const pit = JSON.parse(
  await readFile(
    new URL("../public/data/circuit-pitlane.geojson", import.meta.url),
    "utf8",
  ),
);
const circuit = JSON.parse(
  await readFile(
    new URL("../public/data/sarthe.geojson", import.meta.url),
    "utf8",
  ),
);
const route = pit.features.find((f) => f.properties.role === "pit_lane");
const coordinates = route.geometry.coordinates;
const outline = circuit.features.find((f) => f.properties.role === "outline")
  .geometry.coordinates;

test("map inspection retains the source route and locates the service close-up on its mapped lane", () => {
  const parsed = readPitLane(pit);
  assert.deepEqual(parsed.coordinates, coordinates);
  assert.ok(
    Math.abs(parsed.lengthMetres - route.properties.lengthMetres) < 0.01,
  );
  assert.ok(
    parsed.serviceCentre[0] > 0.20773 && parsed.serviceCentre[0] < 0.20786,
  );
  assert.ok(
    parsed.serviceCentre[1] > 47.9502 && parsed.serviceCentre[1] < 47.95267,
  );
  const unknownSegments = structuredClone(pit);
  delete unknownSegments.source.segments;
  assert.equal(readPitLane(unknownSegments).serviceCentre, undefined);
  const invalid = structuredClone(pit);
  invalid.features[0].geometry.coordinates[0][0] = Infinity;
  assert.throws(() => readPitLane(invalid), /unavailable/);
});

test("the mapped pit route is one connected directed source chain with every source vertex retained", () => {
  assert.equal(pit.type, "FeatureCollection");
  assert.equal(route.geometry.type, "LineString");
  assert.deepEqual(
    pit.source.segments.map((s) => s.wayId),
    PIT_WAY_IDS,
  );
  assert.equal(pit.source.nodeIds.length, coordinates.length);
  assert.equal(
    pit.source.geometrySha256,
    createHash("sha256").update(JSON.stringify(coordinates)).digest("hex"),
  );
  let previous;
  for (const segment of pit.source.segments) {
    assert.equal(segment.tags.oneway, "yes");
    assert.equal(segment.tags.highway, "raceway");
    assert.equal(pit.source.nodeIds[segment.startIndex], segment.startNode);
    assert.equal(pit.source.nodeIds[segment.endIndex], segment.endNode);
    assert.ok(segment.endIndex > segment.startIndex);
    if (previous) {
      assert.equal(segment.startNode, previous.endNode);
      assert.equal(segment.startIndex, previous.endIndex);
    } else assert.equal(segment.startIndex, 0);
    previous = segment;
  }
  assert.equal(previous.endIndex, coordinates.length - 1);
  for (let i = 0; i < coordinates.length; i++) {
    assert.equal(coordinates[i].length, 2);
    assert.ok(coordinates[i].every(Number.isFinite));
    assert.ok(coordinates[i][0] > 0.207 && coordinates[i][0] < 0.211);
    assert.ok(coordinates[i][1] > 47.944 && coordinates[i][1] < 47.956);
    if (i)
      assert.ok(
        distanceMetres(coordinates[i - 1], coordinates[i]) > 0 &&
          distanceMetres(coordinates[i - 1], coordinates[i]) < 350,
        "no duplicate vertices or implausible connector jump",
      );
  }
});

test("pit markers are true route endpoints and mapped main-track junctions", () => {
  for (const [index, role] of ["pit_entry", "pit_exit"].entries()) {
    const marker = pit.features.find((f) => f.properties.role === role);
    const endpoint = index ? coordinates.at(-1) : coordinates[0];
    assert.deepEqual(marker.geometry.coordinates, endpoint);
    assert.deepEqual(pit.source.junctions[index].coordinate, endpoint);
    assert.equal(
      marker.properties.sourceNodeId,
      pit.source.junctions[index].nodeId,
    );
    assert.ok(pit.source.junctions[index].trackWays.length > 0);
    assert.ok(
      Math.min(...outline.map((p) => distanceMetres(endpoint, p))) < 1,
      "pit route connects to the independently stored circuit outline without a fabricated connector",
    );
  }
  assert.equal(pit.source.junctions[0].trackWays[0].wayId, 226901635);
  assert.equal(pit.source.junctions[1].trackWays[0].wayId, 773623628);
});

test("length describes the mapped entry-to-exit route and physical unknowns remain unknown", () => {
  const length = coordinates
    .slice(1)
    .reduce((sum, p, i) => sum + distanceMetres(coordinates[i], p), 0);
  assert.ok(Math.abs(route.properties.lengthMetres - length) <= 0.0051);
  assert.ok(length > 1150 && length < 1300);
  assert.equal(route.properties.widthMetres, null);
  assert.equal(route.properties.speedLimitKmh, null);
  assert.equal(pit.source.accuracy, null);
  assert.equal(route.properties.license, "ODbL 1.0");
  assert.ok(
    pit.source.segments.every(
      (s) => s.url === `https://www.openstreetmap.org/way/${s.wayId}`,
    ),
  );
});

// Reconstruct a source graph to test refresh refusal at its safety boundary.
function sourceGraph() {
  return {
    elements: [
      ...coordinates.map(([lon, lat], i) => ({
        type: "node",
        id: pit.source.nodeIds[i],
        lon,
        lat,
      })),
      ...pit.source.segments.map((s) => ({
        type: "way",
        id: s.wayId,
        version: s.version,
        timestamp: s.timestamp,
        tags: s.tags,
        nodes: pit.source.nodeIds.slice(s.startIndex, s.endIndex + 1),
      })),
      ...pit.source.junctions.flatMap((j) =>
        j.trackWays.map((w) => ({
          type: "way",
          id: w.wayId,
          version: w.version,
          tags: { highway: "raceway", name: w.name },
          nodes: [j.nodeId],
        })),
      ),
    ],
  };
}
test("refresh refuses missing nodes, disconnected ways, changed direction and a detached circuit junction", () => {
  assert.deepEqual(buildPitLane(sourceGraph(), {}).features, pit.features);
  const missing = sourceGraph();
  missing.elements = missing.elements.filter(
    (e) => !(e.type === "node" && e.id === pit.source.nodeIds[5]),
  );
  assert.throws(() => buildPitLane(missing, {}), /Missing coordinate/);
  const broken = sourceGraph();
  broken.elements.find(
    (e) => e.type === "way" && e.id === PIT_WAY_IDS[1],
  ).nodes[0] = pit.source.nodeIds[0];
  assert.throws(() => buildPitLane(broken, {}), /Disconnected pit ways/);
  const reverse = sourceGraph();
  const reversedWay = reverse.elements.find(
    (e) => e.type === "way" && e.id === PIT_WAY_IDS[1],
  );
  reversedWay.tags = { ...reversedWay.tags, oneway: "-1" };
  assert.throws(() => buildPitLane(reverse, {}), /changed directed pit way/);
  const detached = sourceGraph();
  detached.elements = detached.elements.filter((e) => e.id !== 226901635);
  assert.throws(
    () => buildPitLane(detached, {}),
    /no mapped main-track junction/,
  );
});
