import type { TrackGeo } from "./trackGeo.ts";

export type MeshBounds = {
  min: [number, number, number];
  max: [number, number, number];
};
export type PreparedMeshMetadata = {
  vertexCount: number;
  indexCount: number;
  bounds: MeshBounds | null;
};
export type BuildingMeshManifest = {
  schemaVersion: 1;
  binary: string;
  compressedSha256: string;
  compressedBytes: number;
  binarySha256: string;
  binaryBytes: number;
  origin: [number, number];
  elevationBase: number;
  sceneScale: number;
  corridorMetres: number;
  featureCount: number;
  solidFeatureCount: number;
  footprintFeatureCount: number;
  sourceHashes: { buildings: string; context: string; circuit: string };
  meshes?: { solid: PreparedMeshMetadata; footprint: PreparedMeshMetadata };
  [key: string]: unknown;
};
export type PreparedMeshSection = {
  positions: Float32Array; // Local x,y,z in scene units.
  normals: Float32Array;
  indices: Uint32Array;
};
export type PreparedBuildings = {
  manifest: BuildingMeshManifest;
  solid: PreparedMeshSection;
  footprint: PreparedMeshSection;
};
const MAGIC = "SATMESH1";
const HEADER_BYTES = 32;
const HASH = /^[a-f0-9]{64}$/;

export function readBuildingMeshManifest(value: unknown): BuildingMeshManifest {
  const manifest = value as BuildingMeshManifest | undefined;
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    typeof manifest.binary !== "string" ||
    !/^\/?data\/[a-zA-Z0-9_.-]+\.mesh$/.test(manifest.binary) ||
    !HASH.test(manifest.compressedSha256) ||
    !HASH.test(manifest.binarySha256) ||
    ![manifest.compressedBytes, manifest.binaryBytes].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ) ||
    !Array.isArray(manifest.origin) ||
    manifest.origin.length !== 2 ||
    !manifest.origin.every(Number.isFinite) ||
    Math.abs(manifest.origin[0]) > 180 ||
    Math.abs(manifest.origin[1]) > 90 ||
    !Number.isFinite(manifest.elevationBase) ||
    manifest.sceneScale !== 0.1 ||
    manifest.corridorMetres !== 600 ||
    ![
      manifest.featureCount,
      manifest.solidFeatureCount,
      manifest.footprintFeatureCount,
    ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    !manifest.sourceHashes ||
    ![
      manifest.sourceHashes.buildings,
      manifest.sourceHashes.context,
      manifest.sourceHashes.circuit,
    ].every((hash) => typeof hash === "string" && HASH.test(hash))
  ) {
    throw Error("Prepared building manifest is invalid");
  }
  if (manifest.meshes) {
    for (const kind of ["solid", "footprint"] as const) {
      const mesh = manifest.meshes[kind];
      const bounds = mesh?.bounds;
      if (
        !mesh ||
        !Number.isSafeInteger(mesh.vertexCount) ||
        mesh.vertexCount < 0 ||
        !Number.isSafeInteger(mesh.indexCount) ||
        mesh.indexCount < 0 ||
        (mesh.vertexCount > 0 &&
          (!bounds ||
            !Array.isArray(bounds.min) ||
            !Array.isArray(bounds.max) ||
            bounds.min.length !== 3 ||
            bounds.max.length !== 3 ||
            ![...bounds.min, ...bounds.max].every(Number.isFinite) ||
            bounds.min.some((v, axis) => v > bounds.max[axis])))
      )
        throw Error("Prepared building mesh bounds are invalid");
    }
  }
  return manifest;
}

export function decodeBuildingMesh(
  buffer: ArrayBuffer,
): Pick<PreparedBuildings, "solid" | "footprint"> {
  if (buffer.byteLength < HEADER_BYTES)
    throw Error("Prepared building mesh is truncated");
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 8));
  if (
    magic !== MAGIC ||
    view.getUint32(8, true) !== 1 ||
    view.getUint32(28, true) !== 0
  ) {
    throw Error("Prepared building mesh format is unsupported");
  }
  if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1)
    throw Error("Prepared building mesh requires little-endian typed arrays");
  const counts = [12, 16, 20, 24].map((offset) => view.getUint32(offset, true));
  const [solidVertices, solidIndices, footprintVertices, footprintIndices] =
    counts;
  const required =
    HEADER_BYTES +
    (solidVertices + footprintVertices) * 24 +
    (solidIndices + footprintIndices) * 4;
  if (
    required !== buffer.byteLength ||
    solidIndices % 3 !== 0 ||
    footprintIndices % 3 !== 0
  ) {
    throw Error("Prepared building mesh lengths are invalid");
  }
  let offset = HEADER_BYTES;
  const section = (
    vertexCount: number,
    indexCount: number,
  ): PreparedMeshSection => {
    const positions = new Float32Array(buffer, offset, vertexCount * 3);
    offset += positions.byteLength;
    const normals = new Float32Array(buffer, offset, vertexCount * 3);
    offset += normals.byteLength;
    const indices = new Uint32Array(buffer, offset, indexCount);
    offset += indices.byteLength;
    if (
      !positions.every(Number.isFinite) ||
      !normals.every(Number.isFinite) ||
      !indices.every((index) => index < vertexCount)
    ) {
      throw Error(
        "Prepared building mesh contains invalid vertices or indices",
      );
    }
    return { positions, normals, indices };
  };
  return {
    solid: section(solidVertices, solidIndices),
    footprint: section(footprintVertices, footprintIndices),
  };
}

function assertAlignment(manifest: BuildingMeshManifest, track: TrackGeo) {
  if (
    !track.context ||
    Math.abs(manifest.origin[0] - track.origin.longitude) > 1e-10 ||
    Math.abs(manifest.origin[1] - track.origin.latitude) > 1e-10 ||
    Math.abs(manifest.elevationBase - track.elevationBase) > 1e-8
  ) {
    throw Error(
      "Prepared buildings do not match the circuit coordinate origin or elevation datum",
    );
  }
}

export function createPreparedBuildingLoader(
  request: typeof fetch = fetch,
  base = import.meta.env?.BASE_URL ?? "/",
) {
  let pending: Promise<PreparedBuildings> | undefined;
  return async (track: TrackGeo): Promise<PreparedBuildings> => {
    pending ??= (async () => {
      const response = await request(
        `${base}data/circuit-buildings-mesh.json`,
        {
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok)
        throw Error(`Prepared building manifest HTTP ${response.status}`);
      const manifest = readBuildingMeshManifest(await response.json());
      assertAlignment(manifest, track);
      const binaryResponse = await request(
        `${base}${manifest.binary.replace(/^\//, "")}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!binaryResponse.ok)
        throw Error(`Prepared building mesh HTTP ${binaryResponse.status}`);
      const compressed = await binaryResponse.arrayBuffer();
      const checksum = async (buffer: ArrayBuffer) => {
        const digest = await crypto.subtle.digest("SHA-256", buffer);
        return Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
      };
      if (
        compressed.byteLength !== manifest.compressedBytes ||
        (await checksum(compressed)) !== manifest.compressedSha256
      )
        throw Error(
          "Prepared building compressed checksum does not match its manifest",
        );
      if (typeof DecompressionStream === "undefined")
        throw Error("Prepared building decompression is unavailable");
      const stream = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      const buffer = await new Response(stream).arrayBuffer();
      if (
        buffer.byteLength !== manifest.binaryBytes ||
        (await checksum(buffer)) !== manifest.binarySha256
      )
        throw Error(
          "Prepared building payload checksum does not match its manifest",
        );
      const decoded = decodeBuildingMesh(buffer);
      if (manifest.meshes)
        for (const kind of ["solid", "footprint"] as const) {
          const meta = manifest.meshes[kind];
          if (
            meta.vertexCount !== decoded[kind].positions.length / 3 ||
            meta.indexCount !== decoded[kind].indices.length
          )
            throw Error(
              "Prepared building section counts differ from its manifest",
            );
        }
      return { manifest, ...decoded };
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
    const result = await pending;
    assertAlignment(result.manifest, track);
    return result;
  };
}
export const loadPreparedBuildings = createPreparedBuildingLoader();
