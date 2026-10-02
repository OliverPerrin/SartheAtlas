#!/usr/bin/env node
// Offline verification of geolocation identity, height provenance and encoded DEM artifacts.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const directory = fileURLToPath(new URL("../public/data/", import.meta.url));
const context = JSON.parse(
  await readFile(`${directory}circuit-context.json`, "utf8"),
);
const manifest = JSON.parse(
  await readFile(`${directory}circuit-terrain-manifest.json`, "utf8"),
);
const original = JSON.parse(
  await readFile(`${directory}sarthe.geojson`, "utf8"),
);
const coordinates = original.features.find(
  (f) => f.properties.role === "outline",
).geometry.coordinates;
assert.deepEqual(context.elevation.trackCoordinates, coordinates);
assert.equal(context.elevation.trackSamples.length, coordinates.length);
assert.deepEqual(coordinates[0], coordinates.at(-1));
assert.equal(
  context.elevation.trackSamples[0],
  context.elevation.trackSamples.at(-1),
);
assert.equal(context.elevation.samples[0].fraction, 0);
assert.equal(context.elevation.samples.at(-1).fraction, 1);
assert.equal(
  context.elevation.samples.filter((p) => p.elevation === null).length,
  context.elevation.missingCount,
);
assert.equal(
  context.terrainGrid.values.length,
  context.terrainGrid.columns * context.terrainGrid.rows,
);
assert.equal(context.terrainGrid.rowOrder, "north-to-south");
assert.equal(context.terrainGrid.columnOrder, "west-to-east");

const buildings = JSON.parse(
  await readFile(
    `${directory}${context.layers.buildings.split("/").at(-1)}`,
    "utf8",
  ),
);
assert.equal(buildings.features.length, context.counts.buildings);
assert.equal(
  new Set(buildings.features.map((f) => f.id)).size,
  buildings.features.length,
);
assert.equal(
  buildings.features.filter((f) => f.properties.height !== null).length,
  context.counts.buildingsWithHeight,
);
assert.equal(
  buildings.features.filter((f) => f.properties.height === null).length,
  context.counts.buildingsWithoutHeight,
);
for (const f of buildings.features) {
  assert.equal(f.properties.source, "IGN BD TOPO");
  if (f.properties.height !== null) {
    assert.ok(f.properties.height >= 0);
    assert.equal(f.properties.heightSource, "IGN BD TOPO attribute hauteur");
  }
  assert.notEqual(f.properties.verticalAccuracyMetres, 9999);
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let n = i;
  for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  table[i] = n >>> 0;
}
const crc = (bytes) => {
  let n = 0xffffffff;
  for (const b of bytes) n = table[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
};
let totalBytes = 0,
  pixels = 0,
  minimum = Infinity,
  maximum = -Infinity;
assert.equal(manifest.outputTiles.length, context.terrain.tileCount);
assert.equal(
  Math.min(...manifest.outputTiles.map((t) => t.z)),
  context.terrain.minzoom,
);
for (const tile of manifest.outputTiles) {
  const bytes = await readFile(
    `${directory}terrain/${tile.z}/${tile.x}/${tile.y}.png`,
  );
  assert.equal(createHash("sha256").update(bytes).digest("hex"), tile.sha256);
  assert.equal(bytes.length, tile.byteLength);
  totalBytes += bytes.length;
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  let offset = 8,
    idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset),
      type = bytes.toString("ascii", offset + 4, offset + 8);
    assert.equal(
      crc(bytes.subarray(offset + 4, offset + 8 + length)),
      bytes.readUInt32BE(offset + 8 + length),
    );
    if (type === "IHDR") {
      assert.equal(bytes.readUInt32BE(offset + 8), 256);
      assert.equal(bytes.readUInt32BE(offset + 12), 256);
      assert.equal(bytes[offset + 17], 2);
    }
    if (type === "IDAT")
      idat.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  assert.equal(raw.length, 256 * (1 + 256 * 3));
  for (let y = 0; y < 256; y++) {
    assert.equal(raw[y * 769], 0);
    for (let x = 0; x < 256; x++) {
      const at = y * 769 + 1 + x * 3,
        height =
          -10000 + 0.1 * (raw[at] * 65536 + raw[at + 1] * 256 + raw[at + 2]);
      assert.ok(Number.isFinite(height) && height > -500 && height < 9000);
      minimum = Math.min(minimum, height);
      maximum = Math.max(maximum, height);
      pixels++;
    }
  }
}
assert.equal(totalBytes, context.terrain.byteLength);
assert.ok(context.validation.maximumPointRasterDifferenceMetres < 1);
let bridgeSamples = 0;
if (context.elevation.bridgeEvidence) {
  const evidence = JSON.parse(
    await readFile(
      `${directory}${context.elevation.bridgeEvidence.split("/").at(-1)}`,
      "utf8",
    ),
  );
  assert.equal(evidence.groundProfileChanged, false);
  for (const sample of evidence.surfaceSamples) {
    assert.equal(
      sample.groundElevation,
      context.elevation.trackSamples[sample.trackIndex],
    );
    assert.deepEqual(
      [sample.lng, sample.lat],
      context.elevation.trackCoordinates[sample.trackIndex],
    );
  }
  for (const feature of evidence.bridges.features)
    assert.equal(feature.properties.deckElevation, null);
  bridgeSamples = evidence.surfaceSamples.length;
}
console.log(
  JSON.stringify(
    {
      status: "verified",
      profileSamples: context.elevation.samples.length,
      indexedTrackSamples: context.elevation.trackSamples.length,
      mappedBuildings: buildings.features.length,
      missingBuildingHeights: context.counts.buildingsWithoutHeight,
      terrainTiles: manifest.outputTiles.length,
      verifiedTerrainPixels: pixels,
      terrainBytes: totalBytes,
      encodedOutputRange: [minimum, maximum],
      maximumPointRasterDifferenceMetres:
        context.validation.maximumPointRasterDifferenceMetres,
      separateBridgeSurfaceSamples: bridgeSamples,
    },
    null,
    2,
  ),
);
