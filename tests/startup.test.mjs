import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { initialChunks } from "../scripts/check-startup.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("startup graph follows only static imports and counts shared chunks once", () => {
  const manifest = {
    "index.html": {
      file: "entry.js",
      imports: ["react", "shared"],
      dynamicImports: ["viewer"],
    },
    react: { file: "react.js", imports: ["shared"] },
    shared: { file: "shared.js", imports: ["react"] },
    viewer: { file: "viewer.js" },
  };
  assert.deepEqual(
    initialChunks(manifest).map((c) => c.file),
    ["entry.js", "react.js", "shared.js"],
  );
  assert.throws(
    () => initialChunks({ "index.html": { imports: ["missing"] } }),
    /Missing/,
  );
});

test("the first home render provides its poster and activation control without starting deferred viewers", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "sarthe-startup-test-"));
  const server = await createServer({
    cacheDir,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { default: Home } = await server.ssrLoadModule("/src/pages/Home.tsx");
    const html = renderToStaticMarkup(createElement(Home));
    assert.match(html, /Start 3D viewer/);
    assert.match(html, /fetchPriority="high"/i);
    assert.doesNotMatch(
      html,
      /<iframe|Preparing the studio|Map of the Circuit de la Sarthe/,
    );
    assert.match(html, /Built for/);
  } finally {
    await server.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
