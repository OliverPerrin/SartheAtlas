import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  decodeBuildingMesh,
  readBuildingMeshManifest,
  createPreparedBuildingLoader,
} from "../src/data/preparedBuildings.ts";

function fixture() {
  const buffer = new ArrayBuffer(32 + 3 * 6 * 4 + 3 * 4);
  new Uint8Array(buffer, 0, 8).set(new TextEncoder().encode("SATMESH1"));
  const header = new DataView(buffer);
  header.setUint32(8, 1, true);
  header.setUint32(12, 3, true);
  header.setUint32(16, 3, true);
  new Float32Array(buffer, 32, 9).set([0, 0, 0, 1, 0, 0, 0, 0, 1]);
  new Float32Array(buffer, 68, 9).set([0, 1, 0, 0, 1, 0, 0, 1, 0]);
  new Uint32Array(buffer, 104, 3).set([0, 1, 2]);
  const gzip = gzipSync(new Uint8Array(buffer));
  const compressed = gzip.buffer.slice(
    gzip.byteOffset,
    gzip.byteOffset + gzip.byteLength,
  );
  const manifest = {
    schemaVersion: 1,
    binary: "/data/circuit-study-buildings.mesh",
    compressedSha256: createHash("sha256")
      .update(new Uint8Array(compressed))
      .digest("hex"),
    compressedBytes: compressed.byteLength,
    binaryBytes: buffer.byteLength,
    binarySha256: createHash("sha256")
      .update(new Uint8Array(buffer))
      .digest("hex"),
    origin: [0.23, 47.94],
    elevationBase: 44.89,
    sceneScale: 0.1,
    corridorMetres: 600,
    featureCount: 1,
    solidFeatureCount: 1,
    footprintFeatureCount: 0,
    sourceHashes: {
      buildings: "a".repeat(64),
      context: "b".repeat(64),
      circuit: "c".repeat(64),
    },
  };
  const track = {
    origin: { longitude: 0.23, latitude: 47.94 },
    elevationBase: 44.89,
    context: {},
  };
  return { buffer, compressed, manifest, track };
}

test("prepared building sections use zero-copy position and normal arrays and preserve indices and normals", () => {
  const { buffer } = fixture();
  const mesh = decodeBuildingMesh(buffer);
  assert.equal(mesh.solid.positions.buffer, buffer);
  assert.equal(mesh.solid.indices.buffer, buffer);
  assert.equal(mesh.solid.normals.buffer, buffer);
  assert.deepEqual(Array.from(mesh.solid.indices), [0, 1, 2]);
  assert.deepEqual(Array.from(mesh.solid.normals.slice(0, 3)), [0, 1, 0]);
  assert.equal(mesh.footprint.positions.length, 0);
  assert.equal(mesh.footprint.indices.length, 0);
});

test("prepared binary rejects truncation, unsupported versions, nontriangles, bad indices and nonfinite positions", () => {
  assert.throws(() => decodeBuildingMesh(new ArrayBuffer(8)), /truncated/);
  for (const [offset, value, message] of [
    [8, 2, /unsupported/],
    [28, 1, /unsupported/],
    [16, 2, /lengths/],
    [104, 3, /invalid vertices or indices/],
  ]) {
    const { buffer } = fixture();
    new DataView(buffer).setUint32(offset, value, true);
    assert.throws(() => decodeBuildingMesh(buffer), message);
  }
  const { buffer } = fixture();
  new Float32Array(buffer, 32, 18)[0] = NaN;
  assert.throws(() => decodeBuildingMesh(buffer), /invalid vertices/);
});

test("manifest refuses coordinate changes, invented source identity and external binary locations", () => {
  const { manifest } = fixture();
  assert.equal(readBuildingMeshManifest(manifest), manifest);
  for (const mutation of [
    { schemaVersion: 2 },
    { sceneScale: 1 },
    { corridorMetres: 500 },
    { origin: [Infinity, 50] },
    { sourceHashes: {} },
    { binary: "https://external.example/mesh.bin" },
    { compressedSha256: "unknown" },
  ])
    assert.throws(
      () => readBuildingMeshManifest({ ...manifest, ...mutation }),
      /manifest is invalid/,
    );
});

test("loader requests only manifest and binary, shares concurrent work and refuses a different origin", async () => {
  const { compressed, manifest, track } = fixture();
  const calls = [];
  const load = createPreparedBuildingLoader(async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => manifest,
      arrayBuffer: async () => compressed,
    };
  }, "/atlas/");
  const [a, b] = await Promise.all([load(track), load(track)]);
  assert.equal(a, b);
  assert.deepEqual(calls, [
    "/atlas/data/circuit-buildings-mesh.json",
    "/atlas/data/circuit-study-buildings.mesh",
  ]);
  await assert.rejects(
    load({ ...track, origin: { ...track.origin, latitude: 48 } }),
    /coordinate origin or elevation datum/,
  );
  await assert.rejects(
    load({ ...track, elevationBase: 0 }),
    /coordinate origin or elevation datum/,
  );
  assert.equal(calls.length, 2);
});

test("loader checksum mismatch fails closed and a later successful fetch can retry", async () => {
  const { compressed, manifest, track } = fixture();
  let corrupt = true,
    requests = 0;
  const load = createPreparedBuildingLoader(async () => {
    requests++;
    return {
      ok: true,
      json: async () => ({
        ...manifest,
        compressedSha256: corrupt ? "0".repeat(64) : manifest.compressedSha256,
      }),
      arrayBuffer: async () => compressed,
    };
  }, "/");
  await assert.rejects(load(track), /checksum/);
  corrupt = false;
  assert.equal(
    (await load(track)).manifest.binarySha256,
    manifest.binarySha256,
  );
  assert.equal(requests, 4);
});

test("loader validates the decompressed payload separately from its gzip envelope", async () => {
  const { compressed, manifest, track } = fixture();
  const load = createPreparedBuildingLoader(
    async () => ({
      ok: true,
      json: async () => ({ ...manifest, binarySha256: "f".repeat(64) }),
      arrayBuffer: async () => compressed,
    }),
    "/",
  );
  await assert.rejects(load(track), /payload checksum/);
});

test("provided mesh bounds and section counts must be internally consistent", async () => {
  const { compressed, manifest, track } = fixture();
  const meshes = {
    solid: {
      vertexCount: 3,
      indexCount: 3,
      bounds: { min: [0, 0, 0], max: [1, 0, 1] },
    },
    footprint: { vertexCount: 0, indexCount: 0, bounds: null },
  };
  assert.equal(
    readBuildingMeshManifest({ ...manifest, meshes }).meshes,
    meshes,
  );
  assert.throws(
    () =>
      readBuildingMeshManifest({
        ...manifest,
        meshes: {
          ...meshes,
          solid: {
            ...meshes.solid,
            bounds: { min: [1, 0, 0], max: [0, 0, 1] },
          },
        },
      }),
    /bounds are invalid/,
  );
  const load = createPreparedBuildingLoader(
    async () => ({
      ok: true,
      json: async () => ({
        ...manifest,
        meshes: { ...meshes, solid: { ...meshes.solid, vertexCount: 4 } },
      }),
      arrayBuffer: async () => compressed,
    }),
    "/",
  );
  await assert.rejects(load(track), /section counts differ/);
});
