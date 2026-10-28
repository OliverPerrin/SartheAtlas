// Turns captured silhouettes into per-station top height and half width (metres).
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { planProfile } from "./planpca.mjs";
const ROOT = process.env.ROOT ?? "/Users/oliverperrin/SartheAtlas";
const { shapes } = await import(`${ROOT}/src/three/shapes.ts`);
const { Body } = await import(`${ROOT}/src/three/body.ts`);
const N = 40;
const results = {};
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function opening(values, win) {
  const n = values.length, min = new Array(n), out = new Array(n);
  for (let i = 0; i < n; i++) { let m = Infinity; for (let k = -win; k <= win; k++) { const v = values[i + k]; if (v != null) m = Math.min(m, v); } min[i] = m === Infinity ? null : m; }
  for (let i = 0; i < n; i++) { let m = -Infinity; for (let k = -win; k <= win; k++) { const v = min[i + k]; if (v != null) m = Math.max(m, v); } out[i] = m === -Infinity ? null : m; }
  return out;
}
for (const car of Object.keys(shapes)) {
  const file = `/tmp/sa-qa/sil/out/${car}.json`;
  if (!existsSync(file)) continue;
  const cap = JSON.parse(readFileSync(file, "utf8"));
  const spec = shapes[car].body, body = new Body(spec);
  const cols = cap.sideCols;
  const valid = cols.map((c, x) => (c ? x : -1)).filter((x) => x >= 0);
  const ground = Math.max(...valid.map((x) => cols[x][0]));
  // Wing: columns where a separate structure sits above a gap over the body.
  const roughS = (valid.at(-1) - valid[0]) / spec.length;
  const wingCols0 = valid.filter((x) => cols[x][2] < cols[x][1] - 0.06 * roughS);
  const wingX0 = wingCols0.length ? median(wingCols0) : null;
  const mid = (valid[0] + valid.at(-1)) / 2;
  const frontRight0 = wingX0 == null ? true : wingX0 < mid;
  // Axle centres were read off ruled side-view crops (axles.json).
  const manual = JSON.parse(readFileSync("/tmp/sa-qa/sil/axles.json", "utf8"))[car];
  if (!manual) { console.log(car, "no axle reading"); continue; }
  const [axL, axR] = manual;
  const expF = 0, expR = 0, fA = 0, rA = 0;
  const s = (axR - axL) / spec.wheelbase; // px per metre
  const frontRight = Boolean(JSON.parse(readFileSync("/tmp/sa-qa/sil/front.json", "utf8"))[car]);
  const xf = frontRight ? axR : axL;
  const toX = (px) => body.frontX + (frontRight ? 1 : -1) * (px - xf) / s;
  const toPx = (X) => xf + (frontRight ? 1 : -1) * (X - body.frontX) * s;
  // Highest silhouette pixel per column; a 5-column median drops single-pixel
  // noise and the opening below removes antennas, mirrors and wing supports.
  const first = cols.map((c) => (c ? (ground - c[2]) / s : null));
  const topRaw = first.map((_, i) => {
    const win = first.slice(Math.max(0, i - 2), i + 3).filter((v) => v != null);
    return win.length ? win.sort((a, b) => a - b)[Math.floor(win.length / 2)] : null;
  });
  const top = opening(topRaw, Math.round(0.14 * s));
  // Plan: widths along the plan silhouette's own long axis, nose first. Its
  // extent is matched to the side view's, so stations line up along the car.
  const overhead = ["bmw", "corvette", "296"].includes(car);
  const plan = planProfile(
    overhead ? `/tmp/sa-qa/sil/ax-${car}-pz.png` : `/tmp/sa-qa/sil/out/${car}-plan.png`,
    overhead ? true : !frontRight,
    400,
  );
  const sv = valid;
  const sa = sv[0], sb = sv.at(-1);
  const sideLenPx = sb - sa;
  const perM = plan.lengthPx / (sideLenPx / s);
  const halfRaw = plan.half.map((v) => (v == null ? null : v / perM));
  const half = opening(halfRaw, Math.round((0.16 * plan.half.length * s) / sideLenPx));
  const at = (arr, X, toIdx) => { const i = Math.round(toIdx(X)); return arr[Math.min(arr.length - 1, Math.max(0, i))]; };
  const sideIdx = (X) => toPx(X);
  const noseSide = frontRight ? sb : sa;
  const planIdx = (X) => (Math.abs(toPx(X) - noseSide) / sideLenPx) * plan.half.length;
  const stations = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, X = body.x(t);
    stations.push([t, at(top, X, sideIdx), at(half, X, planIdx)]);
  }
  const len = Math.abs(toX(sb) - toX(sa));
  results[car] = { stations, measuredLength: len, specLength: spec.length, frontRight, axles: [axL, axR], expected: [expF, expR], pxPerM: s };
  console.log(car.padEnd(9), "len", len.toFixed(2), "/", spec.length, "front", frontRight ? "R" : "L", "maxTop", Math.max(...stations.map((q) => q[1] ?? 0)).toFixed(2), "maxHalf", Math.max(...stations.map((q) => q[2] ?? 0)).toFixed(2), "/", (spec.width / 2).toFixed(2), "missing", stations.filter((q) => q[1] == null || q[2] == null).length, "snap", Math.round(fA - expF), Math.round(rA - expR));
}
writeFileSync("/tmp/sa-qa/sil/fits.json", JSON.stringify(results));
