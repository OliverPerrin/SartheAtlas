import { readPng, carMask } from "./png.mjs";
/** Half-width profile along the silhouette's principal axis, nose first, in px. */
export function planProfile(file, noseLeft, samples = 200) {
  const img = readPng(file), m = carMask(img), { w, h } = img;
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { n++; sx += x; sy += y; }
  const cx = sx / n, cy = sy / n;
  let xx = 0, yy = 0, xy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { const dx = x - cx, dy = y - cy; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  let ux = Math.cos(angle), uy = Math.sin(angle);
  if ((ux < 0) !== Boolean(noseLeft)) { ux = -ux; uy = -uy; } // u points from tail to nose... set below
  // u points toward the nose.
  if (noseLeft && ux > 0) { ux = -ux; uy = -uy; }
  if (!noseLeft && ux < 0) { ux = -ux; uy = -uy; }
  const vx = -uy, vy = ux;
  const pts = [];
  let a0 = Infinity, a1 = -Infinity;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    const a = (x - cx) * ux + (y - cy) * uy, b = (x - cx) * vx + (y - cy) * vy;
    pts.push([a, b]); if (a < a0) a0 = a; if (a > a1) a1 = a;
  }
  const lo = new Array(samples).fill(Infinity), hi = new Array(samples).fill(-Infinity);
  for (const [a, b] of pts) {
    const i = Math.min(samples - 1, Math.floor(((a1 - a) / (a1 - a0)) * samples)); // 0 = nose
    if (b < lo[i]) lo[i] = b; if (b > hi[i]) hi[i] = b;
  }
  const half = lo.map((l, i) => (hi[i] > l ? (hi[i] - l) / 2 : null));
  return { half, lengthPx: a1 - a0, angle: (angle * 180) / Math.PI };
}
