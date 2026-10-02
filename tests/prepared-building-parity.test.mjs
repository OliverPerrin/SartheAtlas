import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { buildTrack } from "../src/data/trackGeo.ts";
import {
  readBuildingMeshManifest,
  decodeBuildingMesh,
} from "../src/data/preparedBuildings.ts";
import { referenceBuildingGeometry } from "./helpers/referenceBuildings.mjs";

const sourceNames = {
  buildings: "circuit-buildings.geojson",
  circuit: "sarthe.geojson",
  context: "circuit-context.json",
};
const rawSources = Object.fromEntries(
  await Promise.all(
    Object.entries(sourceNames).map(async ([key, filename]) => [
      key,
      await readFile(new URL(`../public/data/${filename}`, import.meta.url)),
    ]),
  ),
);
const source = Object.fromEntries(
  Object.entries(rawSources).map(([key, bytes]) => [key, JSON.parse(bytes)]),
);
const manifest = readBuildingMeshManifest(
  JSON.parse(
    await readFile(
      new URL("../public/data/circuit-buildings-mesh.json", import.meta.url),
    ),
  ),
);
const compressed = await readFile(
  new URL(`../public${manifest.binary}`, import.meta.url),
);
const binary = gunzipSync(compressed);
const decoded = decodeBuildingMesh(
  binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Earcut implementations can choose different internal diagonals. Compare exact
// Float32 vertex sets and each plane's boundary plus area, which checks the actual
// rendered surfaces and hole boundaries independently of triangle order.
function surfaces(count, at) {
  const positions = new Set(),
    positionNormals = new Set(),
    planes = new Map();
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  let area = 0,
    signedVolume = 0;
  for (let i = 0; i < count; i += 3) {
    const points = [at(i), at(i + 1), at(i + 2)];
    for (const p of points) {
      positions.add(p.slice(0, 3).join(","));
      // Normal tolerance is 1e-6; positions remain exact source-derived Float32.
      positionNormals.add(
        [...p.slice(0, 3), ...p.slice(3).map((n) => Math.round(n * 1e6))].join(
          ",",
        ),
      );
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], p[axis]);
        max[axis] = Math.max(max[axis], p[axis]);
      }
    }
    const [a, b, c] = points;
    const u = b.map((v, j) => v - a[j]),
      v = c.map((v, j) => v - a[j]);
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const triangleArea = Math.hypot(...cross) / 2;
    area += triangleArea;
    signedVolume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    if (triangleArea < 1e-12) continue;
    const normal = a.slice(3),
      offset = a.slice(0, 3).reduce((sum, x, j) => sum + x * normal[j], 0);
    const plane = [
      ...normal.map((n) => Math.round(n * 1e6)),
      Math.round(offset * 1e4),
    ].join(",");
    let group = planes.get(plane);
    if (!group) {
      group = { area: 0, edges: new Map() };
      planes.set(plane, group);
    }
    group.area += triangleArea;
    for (let vertex = 0; vertex < 3; vertex++) {
      const edge = [
        points[vertex].slice(0, 3).join(","),
        points[(vertex + 1) % 3].slice(0, 3).join(","),
      ]
        .sort()
        .join(";");
      group.edges.set(edge, (group.edges.get(edge) ?? 0) + 1);
    }
  }
  return {
    positions,
    positionNormals,
    planes,
    area,
    signedVolume,
    bounds: { min, max },
  };
}
const boundary = (group) =>
  [...group.edges]
    .filter(([, count]) => count % 2)
    .map(([edge]) => edge)
    .sort();

test("prepared asset hashes match all three current geography inputs and its compressed and decoded bytes", () => {
  for (const [key, bytes] of Object.entries(rawSources))
    assert.equal(
      manifest.sourceHashes[key],
      sha256(bytes),
      `${key} changed; rebuild the prepared mesh`,
    );
  assert.equal(compressed.byteLength, manifest.compressedBytes);
  assert.equal(sha256(compressed), manifest.compressedSha256);
  assert.equal(binary.byteLength, manifest.binaryBytes);
  assert.equal(sha256(binary), manifest.binarySha256);
  const track = buildTrack(source.circuit.features, source.context);
  assert.deepEqual(manifest.origin, [
    track.origin.longitude,
    track.origin.latitude,
  ]);
  assert.equal(manifest.elevationBase, track.elevationBase);
  assert.equal(manifest.sceneScale, 0.1);
  assert.equal(manifest.corridorMetres, 600);
});

test("Rust meshes preserve previous building selection, exact positions, face normals, surfaces, holes and bounds", () => {
  const track = buildTrack(source.circuit.features, {
    ...source.context,
    buildings: source.buildings,
  });
  const reference = referenceBuildingGeometry(track);
  try {
    assert.equal(manifest.featureCount, reference.featureCount);
    for (const kind of ["solid", "footprint"]) {
      const old = reference[kind],
        mesh = decoded[kind],
        meta = manifest.meshes[kind];
      assert.equal(
        mesh.indices.length,
        old.attributes.position.count,
        `${kind} triangle count`,
      );
      assert.equal(mesh.positions.length / 3, meta.vertexCount);
      assert.equal(mesh.indices.length, meta.indexCount);
      const expected = surfaces(old.attributes.position.count, (i) => [
        ...old.attributes.position.array.slice(i * 3, i * 3 + 3),
        ...old.attributes.normal.array.slice(i * 3, i * 3 + 3),
      ]);
      const actual = surfaces(mesh.indices.length, (i) => [
        ...mesh.positions.slice(mesh.indices[i] * 3, mesh.indices[i] * 3 + 3),
        ...mesh.normals.slice(mesh.indices[i] * 3, mesh.indices[i] * 3 + 3),
      ]);
      assert.deepEqual(
        actual.positions,
        expected.positions,
        `${kind}: exact Float32 positions`,
      );
      assert.deepEqual(
        actual.positionNormals,
        expected.positionNormals,
        `${kind}: hard normals preserved`,
      );
      assert.deepEqual(actual.bounds, expected.bounds);
      assert.deepEqual(
        actual.bounds,
        meta.bounds,
        `${kind}: culling bounds enclose every vertex`,
      );
      assert.ok(
        Math.abs(actual.area - expected.area) < 1e-7,
        `${kind}: total surface area`,
      );
      assert.ok(
        Math.abs(actual.signedVolume - expected.signedVolume) < 1e-7,
        `${kind}: signed volume and winding`,
      );
      assert.equal(actual.planes.size, expected.planes.size);
      for (const [plane, a] of expected.planes) {
        const b = actual.planes.get(plane);
        assert.ok(b, `${kind}: missing face plane ${plane}`);
        assert.ok(
          Math.abs(a.area - b.area) < 1e-5,
          `${kind}: face area differs at ${plane}`,
        );
        assert.deepEqual(
          boundary(a),
          boundary(b),
          `${kind}: face or hole boundary differs at ${plane}`,
        );
      }
    }
  } finally {
    reference.solid?.dispose();
    reference.footprint?.dispose();
  }
});
