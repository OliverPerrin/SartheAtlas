import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function initialChunks(manifest, entry = "index.html") {
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    if (!manifest[key]) throw new Error(`Missing build chunk: ${key}`);
    seen.add(key);
    for (const dependency of manifest[key].imports ?? []) visit(dependency);
  };
  visit(entry);
  return [...seen].map((key) => ({ key, ...manifest[key] }));
}

export async function checkStartup(directory = "dist") {
  const manifest = JSON.parse(
    await readFile(resolve(directory, ".vite/manifest.json"), "utf8"),
  );
  const chunks = initialChunks(manifest);
  const heavy =
    /^(CarScene|CarModel|CockpitAssembly|MechanicalAssemblies|MachinerySections|primitives|CircuitGeoMap|TrackScene|TrackMap|exteriorTuning|ExteriorViewer)$/;
  let rawBytes = 0,
    gzipBytes = 0;
  const assets = [];
  for (const chunk of chunks) {
    if (heavy.test(chunk.name ?? ""))
      throw new Error(`Heavy viewer entered startup graph: ${chunk.name}`);
    if (!chunk.file.endsWith(".js")) continue;
    const bytes = await readFile(resolve(directory, chunk.file));
    if (bytes.includes(Buffer.from("THREE.WebGLRenderer")))
      throw new Error(`Three.js entered startup: ${chunk.file}`);
    const compressed = gzipSync(bytes).length;
    rawBytes += bytes.length;
    gzipBytes += compressed;
    assets.push({ file: chunk.file, bytes: bytes.length, gzip: compressed });
  }
  const budget = 120 * 1024;
  if (gzipBytes > budget)
    throw new Error(
      `Startup JS ${gzipBytes} bytes exceeds ${budget}-byte gzip budget`,
    );
  const report = {
    initialJavaScriptBytes: rawBytes,
    initialJavaScriptGzipBytes: gzipBytes,
    budgetGzipBytes: budget,
    assets,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await checkStartup(process.argv[2] ?? "dist");
