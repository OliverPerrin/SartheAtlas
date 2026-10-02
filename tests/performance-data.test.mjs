import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTrackLoader } from "../src/data/trackGeo.ts";
import { createLapStore } from "../src/data/lapStore.ts";
const geography = JSON.parse(
  await readFile(new URL("../public/data/sarthe.geojson", import.meta.url)),
);
const context = JSON.parse(
  await readFile(
    new URL("../public/data/circuit-context.json", import.meta.url),
  ),
);

function response(data) {
  return { ok: true, json: async () => data };
}
test("outline loading never requests context, and upgrading shares geometry and preserves elevations", async () => {
  const requested = [];
  let release;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const load = createTrackLoader(async (url) => {
    requested.push(url);
    return url.endsWith("sarthe.geojson") ? response(geography) : waiting;
  }, "/atlas/");
  const outline = await load({ context: false });
  assert.deepEqual(requested, ["/atlas/data/sarthe.geojson"]);
  assert.equal(outline.context, undefined);
  assert.equal(outline.contextStatus, "unavailable");
  assert.ok(outline.elevations.every((value) => value === null));
  const detailPromise = load();
  assert.equal(
    load(),
    detailPromise,
    "concurrent full consumers share the context request and track result",
  );
  assert.equal(
    await load({ context: false }),
    outline,
    "an outline consumer does not wait for pending context",
  );
  release(response(context));
  const detailed = await detailPromise;
  assert.deepEqual(requested, [
    "/atlas/data/sarthe.geojson",
    "/atlas/data/circuit-context.json",
  ]);
  assert.deepEqual(detailed.lngLat, outline.lngLat);
  assert.equal(detailed.context, context);
  assert.equal(detailed.contextStatus, "ready");
  assert.ok(detailed.elevations.every(Number.isFinite));
  assert.equal(detailed.corners.length, outline.corners.length);
});

test("failed geometry can retry, and unavailable context retains geographic fallback", async () => {
  let calls = 0;
  const load = createTrackLoader(async (url) => {
    if (url.endsWith("circuit-context.json")) throw Error("offline context");
    if (++calls === 1) throw Error("offline geometry");
    return response(geography);
  }, "/");
  await assert.rejects(load({ context: false }), /offline geometry/);
  const outline = await load({ context: false });
  const detailed = await load();
  assert.deepEqual(outline.lngLat, detailed.lngLat);
  assert.equal(detailed.contextStatus, "unavailable");
  assert.equal(calls, 2);
});

test("telemetry updates notify live consumers while page section snapshot stays stable", () => {
  const store = createLapStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  const tick = {
    cls: "Hypercar",
    fraction: 0.1,
    speed: 200,
    lap: 207,
    elapsed: 20,
  };
  store.publish(tick);
  const section = store.getSection();
  store.publish({ ...tick });
  assert.equal(
    notifications,
    1,
    "unchanged paused telemetry should not render again",
  );
  store.publish({ ...tick, fraction: 0.101, elapsed: 20.1 });
  assert.equal(notifications, 2);
  assert.equal(
    store.getSection(),
    section,
    "useSyncExternalStore page subscribers keep the same snapshot within a section",
  );
  store.publish({ ...tick, fraction: 0.8 });
  assert.notEqual(store.getSection(), section);
  unsubscribe();
  store.publish(null);
  assert.equal(notifications, 3);
  assert.equal(store.getSnapshot(), null);
  assert.equal(store.getSection(), null);
});

test("the indexed building corridor matches exhaustive segment distance, including closure and radius boundary", async () => {
  const { createTrackProximityTester } =
    await import("../src/data/trackProximity.ts");
  const points = [
    [0, 0],
    [1200, 0],
    [1200, 900],
    [700, 500],
    [0, 900],
  ];
  const radius = 600;
  const nearby = createTrackProximityTester({ points }, radius);
  const fullScan = (x, z) =>
    points.some((a, i) => {
      const b = points[(i + 1) % points.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
        ),
      );
      return (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2 <= radius ** 2;
    });
  for (let x = -900; x <= 2100; x += 37)
    for (let z = -900; z <= 1800; z += 43)
      assert.equal(
        nearby(x, z),
        fullScan(x, z),
        `corridor mismatch at ${x},${z}`,
      );
  assert.equal(nearby(-600, 450), true, "closing segment boundary included");
  assert.equal(nearby(-600.01, 450), false);
  assert.equal(nearby(Infinity, 0), false);
});
