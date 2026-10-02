#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";
import { glazingPanels } from "../src/three/glazing.ts";
import { projectedPatchGeometry } from "../src/three/projectedPatch.ts";
import { uncachedProjectedPatch } from "../tests/fixtures/uncached-projected-patch.mjs";

const argv = process.argv.slice(2);
const value = (key, fallback) =>
  argv.includes(key) ? argv[argv.indexOf(key) + 1] : fallback;
const reps = Number(value("--repeats", 40));
const coldRuns = Number(value("--cold-runs", 5));
const ids = ["ferrari", "porsche", "m4"];

function build(id, variant) {
  const shape = shapes[id],
    body = new Body(shape.body);
  const buildPatch =
    variant === "reference" ? uncachedProjectedPatch : projectedPatchGeometry;
  return [-1, 1].flatMap((side) =>
    glazingPanels(shape).map((panel) =>
      buildPatch(body, panel, side, 0.002, 5),
    ),
  );
}
function time(id, variant) {
  const start = performance.now();
  const geometries = build(id, variant);
  const elapsed = performance.now() - start;
  geometries.forEach((g) => g.dispose());
  return elapsed;
}
function summary(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50_ms: +sorted[Math.floor(sorted.length * 0.5)].toFixed(3),
    p95_ms:
      +sorted[
        Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
      ].toFixed(3),
  };
}

// Separate processes isolate first-construction/JIT state; imports and process
// startup are outside the measured interval. This is CPU geometry work only.
if (argv.includes("--cold-case")) {
  const id = value("--cold-case"),
    variant = value("--variant");
  process.stdout.write(JSON.stringify({ ms: time(id, variant) }));
} else {
  const report = [];
  for (const id of ids) {
    for (let i = 0; i < 6; i++) {
      time(id, "reference");
      time(id, "cached");
    }
    const reference = [],
      cached = [];
    for (let i = 0; i < reps; i++) {
      // Alternate ordering to avoid giving one variant a consistent GC/cache bias.
      if (i % 2) {
        cached.push(time(id, "cached"));
        reference.push(time(id, "reference"));
      } else {
        reference.push(time(id, "reference"));
        cached.push(time(id, "cached"));
      }
    }
    const cold = { reference: [], cached: [] };
    for (let i = 0; i < coldRuns; i++)
      for (const variant of ["reference", "cached"]) {
        const output = execFileSync(
          process.execPath,
          [
            fileURLToPath(import.meta.url),
            "--cold-case",
            id,
            "--variant",
            variant,
          ],
          { encoding: "utf8" },
        );
        cold[variant].push(JSON.parse(output).ms);
      }
    const stats = { emittedVertices: 0, evaluatedSamples: 0 };
    let emittedVertices = 0,
      evaluatedSamples = 0;
    const body = new Body(shapes[id].body);
    for (const side of [-1, 1])
      for (const panel of glazingPanels(shapes[id])) {
        const geometry = projectedPatchGeometry(body, panel, side, 0.002, 5, {
          stats,
        });
        emittedVertices += stats.emittedVertices;
        evaluatedSamples += stats.evaluatedSamples;
        geometry.dispose();
      }
    const oldWarm = summary(reference),
      newWarm = summary(cached);
    report.push({
      id,
      emittedVertices,
      evaluatedSamples,
      warm: {
        reference: oldWarm,
        cached: newWarm,
        speedup: +(oldWarm.p50_ms / newWarm.p50_ms).toFixed(2),
      },
      cold: {
        reference: summary(cold.reference),
        cached: summary(cold.cached),
        runs: coldRuns,
      },
    });
  }
  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: cpus()[0]?.model,
        repetitions: reps,
        measured:
          "Fresh body/profile + all glazing projection buffers; excludes process/import, React, GPU and network time.",
        report,
      },
      null,
      2,
    ),
  );
}
