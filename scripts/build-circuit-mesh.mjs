#!/usr/bin/env node
// Compile the frozen sourced driving-study buildings before shipping the site.
// Ordinary npm builds consume checked-in assets and need no Rust toolchain.
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrack } from "../src/data/trackGeo.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDirectory = join(root, "public/data");
const filenames = {
  circuit: "sarthe.geojson",
  context: "circuit-context.json",
  buildings: "circuit-buildings.geojson",
};

export async function prepareCircuitMeshInput(directory = dataDirectory) {
  const sources = await Promise.all(
    Object.entries(filenames).map(async ([key, filename]) => [
      key,
      await readFile(join(directory, filename)),
    ]),
  );
  const raw = Object.fromEntries(sources);
  const context = JSON.parse(raw.context.toString("utf8"));
  const circuit = JSON.parse(raw.circuit.toString("utf8"));
  const track = buildTrack(circuit.features, context);
  const degree = Math.PI / 180;
  const latitude = track.origin.latitude * degree;
  const earthRadius = 6378137;
  const eccentricity = 0.00669437999014;
  const w = Math.sqrt(1 - eccentricity * Math.sin(latitude) ** 2);
  return {
    schemaVersion: 1,
    origin: track.origin,
    elevationBase: track.elevationBase,
    points: track.points,
    terrainGrid: context.terrainGrid,
    provenance: context.source,
    projectionScale: [
      ((degree * earthRadius) / w) * Math.cos(latitude),
      (degree * earthRadius * (1 - eccentricity)) / w ** 3,
    ],
    sceneScale: 0.1,
    corridorMetres: 600,
    sourceHashes: Object.fromEntries(
      sources.map(([key, buffer]) => [
        key,
        createHash("sha256").update(buffer).digest("hex"),
      ]),
    ),
  };
}

function runCompiler(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      "cargo",
      [
        "run", "--locked", "--release", "--manifest-path",
        join(root, "tools/circuit-mesh/Cargo.toml"), "--", ...args,
      ],
      { cwd: root, stdio: "inherit" },
    );
    child.on("error", (error) =>
      reject(new Error(`Rust compiler could not start: ${error.message}`)),
    );
    child.on("exit", (code) =>
      code === 0 ? resolveRun() : reject(new Error(`Compiler exited ${code}`)),
    );
  });
}

export async function buildCircuitMesh({ check = false } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), "sarthe-circuit-mesh-"));
  try {
    const inputPath = join(temporary, "input.json");
    await writeFile(inputPath, JSON.stringify(await prepareCircuitMeshInput()));
    const binaryPath = join(temporary, "mesh.bin");
    const compressedPath = join(temporary, "mesh.bin.gz");
    const manifestPath = join(temporary, "manifest.json");
    await runCompiler([
      "--input", inputPath,
      "--buildings", join(dataDirectory, filenames.buildings),
      "--output", binaryPath,
      "--gzip-output", compressedPath,
      "--binary-url", "/data/circuit-study-buildings.mesh",
      "--manifest", manifestPath,
    ]);
    for (const [source, filename] of [
      [compressedPath, "circuit-study-buildings.mesh"],
      [manifestPath, "circuit-buildings-mesh.json"],
    ]) {
      const generated = await readFile(source);
      const destination = join(dataDirectory, filename);
      if (check) {
        const existing = await readFile(destination);
        if (!existing.equals(generated))
          throw new Error(`${filename} is stale; run npm run mesh:build`);
      } else await writeFile(destination, generated);
    }
    console.log(check ? "Prepared circuit mesh is reproducible." : "Prepared circuit mesh updated.");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prepareIndex = process.argv.indexOf("--prepare-only");
  if (prepareIndex >= 0) {
    const target = process.argv[prepareIndex + 1];
    if (!target) throw new Error("--prepare-only needs an output path");
    await mkdir(dirname(resolve(target)), { recursive: true });
    await writeFile(target, JSON.stringify(await prepareCircuitMeshInput()));
    console.log(`Prepared compiler input: ${target}`);
  } else await buildCircuitMesh({ check: process.argv.includes("--check") });
}
