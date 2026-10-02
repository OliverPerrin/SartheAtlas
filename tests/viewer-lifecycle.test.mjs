import test from "node:test";
import assert from "node:assert/strict";
import {
  ViewerStartupQueue,
  viewerStartupOptions,
  viewerPostProcessing,
} from "../src/data/viewerLifecycle.ts";

test("hosted startup streams textures and omits unused inspector/wireframe work without a permanent detail cap", () => {
  const options = viewerStartupOptions(false);
  assert.equal(options.autostart, 0);
  assert.equal(options.preload, 0);
  assert.equal(options.ui_inspector, 0);
  assert.equal(options.wireframe_preload, 0);
  assert.equal(options.animation_autoplay, 0);
  assert.equal(options.max_texture_size, undefined);
  assert.equal(options.scrollwheel, 1);
  assert.equal(viewerStartupOptions(true).scrollwheel, 0);
});

test("standard presentation defers screen effects and high detail restores source/recipe settings", () => {
  const source = {
    enable: true,
    ssaoEnable: true,
    ssaoIntensity: 0.5,
    ssrEnable: true,
    grainEnable: true,
    dofEnable: true,
    toneMappingExposure: 2,
  };
  const snapshot = structuredClone(source);
  const recipe = {
    ssaoEnable: true,
    ssaoIntensity: 0.24,
    toneMappingExposure: 0.86,
    unknown: 99,
  };
  const standard = viewerPostProcessing(source, recipe, "standard");
  assert.equal(standard.ssaoEnable, false);
  assert.equal(standard.ssrEnable, false);
  assert.equal(standard.grainEnable, false);
  assert.equal(standard.dofEnable, false);
  assert.equal(standard.unknown, undefined);
  const high = viewerPostProcessing(source, recipe, "high");
  assert.equal(high.ssaoEnable, true);
  assert.equal(high.ssaoIntensity, 0.24);
  assert.equal(high.ssrEnable, true);
  assert.equal(high.toneMappingExposure, 0.86);
  assert.deepEqual(source, snapshot);
});

test("startup queue admits one viewer, skips cancelled navigation, and releases exactly once", async () => {
  const queue = new ViewerStartupQueue();
  const first = new AbortController(),
    abandoned = new AbortController(),
    last = new AbortController();
  const releaseFirst = await queue.acquire(first.signal);
  let admitted = false;
  const cancelled = queue.acquire(abandoned.signal);
  const cancellation = assert.rejects(cancelled, { name: "AbortError" });
  const final = queue.acquire(last.signal).then((release) => {
    admitted = true;
    return release;
  });
  await Promise.resolve();
  assert.equal(admitted, false);
  abandoned.abort();
  await cancellation;
  releaseFirst();
  const releaseLast = await final;
  assert.equal(admitted, true);
  releaseFirst();
  let nextAdmitted = false;
  const next = queue.acquire(new AbortController().signal).then((release) => {
    nextAdmitted = true;
    return release;
  });
  await Promise.resolve();
  assert.equal(
    nextAdmitted,
    false,
    "double release cannot bypass a live startup",
  );
  releaseLast();
  (await next)();
});

test("an already cancelled request cannot consume the startup slot", async () => {
  const queue = new ViewerStartupQueue(),
    cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(queue.acquire(cancelled.signal), { name: "AbortError" });
  const release = await queue.acquire(new AbortController().signal);
  release();
});
