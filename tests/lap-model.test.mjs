import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildTrack, pointAt } from "../src/data/trackGeo.ts";
import {
  LINE_BAND,
  brakeAt,
  fractionAtTime,
  lineAt,
  racingLine,
  speedAt,
  speedModel,
  timeAtFraction,
} from "../src/data/lapModel.ts";
import { lapTargets } from "../src/data/track.ts";

const geography = JSON.parse(
  await readFile(
    new URL("../public/data/sarthe.geojson", import.meta.url),
    "utf8",
  ),
);
const track = buildTrack(geography.features);
const line = racingLine(track);
const classes = ["Hypercar", "LMP2", "LMGT3"];
const models = Object.fromEntries(
  classes.map((cls) => [cls, speedModel(track, cls)]),
);
const kmh = (model, fromKm, toKm, pick) => {
  const n = model.speeds.length;
  let best = pick === "min" ? Infinity : 0;
  for (
    let i = Math.floor((fromKm * 1000 * n) / track.length);
    i < (toKm * 1000 * n) / track.length;
    i++
  )
    best = (pick === "min" ? Math.min : Math.max)(best, model.speeds[i] * 3.6);
  return best;
};
const within = (value, low, high, label) =>
  assert.ok(
    value >= low && value <= high,
    `${label}: ${value.toFixed(1)} is outside ${low}–${high}`,
  );

test("the driving line stays inside its band around the mapped centreline", () => {
  for (let i = 0; i < line.n; i++) {
    assert.ok(Math.abs(line.offset[i]) <= LINE_BAND + 1e-6);
    const centre = pointAt(track, i / line.n);
    // The band is measured along a smoothed normal, so allow a little slack.
    assert.ok(
      Math.hypot(line.x[i] - centre.x, line.z[i] - centre.z) <=
        LINE_BAND + 0.05,
    );
  }
  // It uses the road: both sides are reached, and the lap gets shorter.
  assert.ok(Math.max(...line.offset) > LINE_BAND - 0.2);
  assert.ok(Math.min(...line.offset) < -LINE_BAND + 0.2);
  within(track.length - line.length, 20, 120, "metres saved by the line");
});

test("the line is smooth enough to steer a car along", () => {
  let sharpest = 0;
  for (let i = 0; i < line.n; i++) {
    const turn = Math.abs(line.heading[(i + 1) % line.n] - line.heading[i]);
    if (i + 1 < line.n) sharpest = Math.max(sharpest, turn);
  }
  // Arnage is about a 25 m radius: 4 m of line there turns roughly 10°.
  assert.ok(sharpest < 0.3, `sharpest step ${sharpest.toFixed(3)} rad`);
  const here = lineAt(track, 0.5);
  const centre = pointAt(track, 0.5);
  assert.ok(
    Math.hypot(here.x - centre.x, here.z - centre.z) <= LINE_BAND + 0.05,
  );
});

test("each class laps at its typical race pace with only a small grip trim", () => {
  for (const cls of classes) {
    const model = models[cls];
    within(
      model.lapTime,
      lapTargets[cls].lap - 1,
      lapTargets[cls].lap + 1,
      `${cls} lap`,
    );
    within(model.trim, 0.96, 1.04, `${cls} grip trim`);
  }
  assert.ok(models.Hypercar.lapTime < models.LMP2.lapTime);
  assert.ok(models.LMP2.lapTime < models.LMGT3.lapTime);
});

test("top speed comes from power and drag, not from scaling the lap", () => {
  // Before the first Hunaudières chicane.
  within(kmh(models.Hypercar, 2, 4, "max"), 334, 346, "Hypercar top speed");
  within(kmh(models.LMP2, 2, 4, "max"), 318, 331, "LMP2 top speed");
  within(kmh(models.LMGT3, 2, 4, "max"), 288, 301, "LMGT3 top speed");
  for (const cls of classes)
    within(
      kmh(models[cls], 2, 4, "max"),
      lapTargets[cls].top - 6,
      lapTargets[cls].top + 6,
      `${cls} against its labelled top speed`,
    );
});

test("corner speeds sit in the range the real cars are known for", () => {
  const hyper = models.Hypercar;
  within(kmh(hyper, 0.6, 0.9, "min"), 80, 105, "Dunlop chicane");
  within(kmh(hyper, 1.7, 1.95, "min"), 145, 180, "Tertre Rouge");
  within(kmh(hyper, 3.9, 4.15, "min"), 95, 120, "first chicane");
  within(kmh(hyper, 5.9, 6.1, "min"), 95, 115, "second chicane");
  within(kmh(hyper, 7.5, 7.8, "min"), 70, 88, "Mulsanne corner");
  within(kmh(hyper, 9.65, 9.85, "min"), 92, 115, "Indianapolis");
  within(kmh(hyper, 9.95, 10.15, "min"), 70, 88, "Arnage");
  within(
    kmh(hyper, 11.35, 12.4, "min"),
    180,
    215,
    "slowest of the Porsche Curves",
  );
  within(
    kmh(hyper, 11.35, 12.4, "max"),
    230,
    265,
    "fastest of the Porsche Curves",
  );
  within(kmh(hyper, 13.1, 13.45, "min"), 78, 115, "Ford chicanes");
  // Slower classes are slower everywhere that grip decides.
  for (const [from, to] of [
    [1.7, 1.95],
    [11.35, 12.4],
  ])
    assert.ok(kmh(models.LMGT3, from, to, "min") < kmh(hyper, from, to, "min"));
});

test("time and distance agree, and braking shows where it should", () => {
  for (const cls of classes) {
    const model = models[cls];
    for (const fraction of [0.01, 0.3, 0.62, 0.975]) {
      const t = timeAtFraction(model, fraction);
      assert.ok(
        Math.abs(fractionAtTime(model, t, track.length) - fraction) < 1e-4,
      );
    }
    assert.ok(speedAt(model, 0.3) > 0);
  }
  const hyper = models.Hypercar;
  // Flat out halfway down the first part of the straight, hard on the brakes
  // into the first chicane.
  assert.equal(brakeAt(hyper, 3000 / track.length), 0);
  let hardest = 0;
  for (let m = 3750; m < 4050; m += 10)
    hardest = Math.max(hardest, brakeAt(hyper, m / track.length));
  assert.ok(hardest > 0.7, `peak brake signal ${hardest.toFixed(2)}`);
});
