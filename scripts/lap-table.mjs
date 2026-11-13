// Prints the modelled lap for each class: lap time, top speed on each long
// straight and the minimum speed through each corner.
// Usage: node scripts/lap-table.mjs
import { readFile } from "node:fs/promises";
import { buildTrack } from "../src/data/trackGeo.ts";
import { racingLine, speedModel } from "../src/data/lapModel.ts";

const geo = JSON.parse(
  await readFile(
    new URL("../public/data/sarthe.geojson", import.meta.url),
    "utf8",
  ),
);
const track = buildTrack(geo.features);
const line = racingLine(track);
const classes = ["Hypercar", "LMP2", "LMGT3"];
const models = classes.map((cls) => speedModel(track, cls));
const clock = (s) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const pick = (model, fromKm, toKm, kind) => {
  const n = model.speeds.length;
  let best = kind === "min" ? Infinity : 0;
  for (
    let i = Math.floor((fromKm * 1000 * n) / track.length);
    i < (toKm * 1000 * n) / track.length;
    i++
  )
    best = (kind === "min" ? Math.min : Math.max)(best, model.speeds[i] * 3.6);
  return String(Math.round(best)).padStart(9);
};
let far = 0;
for (const e of line.offset) far = Math.max(far, Math.abs(e));
console.log(
  `centreline ${track.length.toFixed(0)} m · driving line ${line.length.toFixed(0)} m · ` +
    `never more than ${far.toFixed(2)} m from the centreline\n`,
);
const row = (label, cells) => console.log(label.padEnd(34) + cells.join(""));
row(
  "",
  classes.map((c) => c.padStart(9)),
);
row(
  "lap time",
  models.map((m) => clock(m.lapTime).padStart(9)),
);
row(
  "cornering-grip trim",
  models.map((m) => m.trim.toFixed(3).padStart(9)),
);
console.log("\ntop speed, km/h");
for (const [name, a, b] of [
  ["pit straight", 0, 0.5],
  ["Hunaudières, before chicane 1", 2, 4],
  ["Hunaudières, before chicane 2", 4.2, 5.9],
  ["Hunaudières, before Mulsanne", 6.2, 7.6],
  ["Mulsanne to Indianapolis", 8, 9.6],
  ["Arnage to Porsche Curves", 10.3, 11.4],
])
  row(
    "  " + name,
    models.map((m) => pick(m, a, b, "max")),
  );
console.log("\nminimum speed, km/h");
for (const [name, a, b] of [
  ["Dunlop chicane", 0.6, 0.9],
  ["Esses", 1.25, 1.5],
  ["Tertre Rouge", 1.7, 1.95],
  ["first chicane", 3.9, 4.15],
  ["second chicane", 5.9, 6.1],
  ["Mulsanne corner", 7.5, 7.8],
  ["Indianapolis (left)", 9.65, 9.85],
  ["Arnage", 9.95, 10.15],
  ["Porsche Curves, entry", 11.35, 11.55],
  ["Porsche Curves, middle", 11.8, 11.95],
  ["Karting", 12.0, 12.2],
  ["Corvette", 12.25, 12.4],
  ["Ford chicanes", 13.1, 13.45],
])
  row(
    "  " + name,
    models.map((m) => pick(m, a, b, "min")),
  );
