import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
export function readPng(file) {
  const b = readFileSync(file);
  let o = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), name = b.toString("ascii", o + 4, o + 8), data = b.subarray(o + 8, o + 8 + len);
    if (name === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; }
    if (name === "IDAT") idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4), line = w * bpp;
  let prev = new Uint8Array(line);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (line + 1)], cur = new Uint8Array(raw.subarray(y * (line + 1) + 1, (y + 1) * (line + 1)));
    for (let i = 0; i < line; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { for (let k = 0; k < 3; k++) out[(y * w + x) * 4 + k] = cur[x * bpp + k]; out[(y * w + x) * 4 + 3] = 255; }
    prev = cur;
  }
  return { w, h, data: out };
}
/** Opaque car mask from a magenta-background capture. */
export function carMask(img) {
  const { w, h, data } = img, m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const magenta = r > 50 && b > 50 && g < 0.45 * Math.min(r, b) && Math.abs(r - b) < 0.3 * Math.max(r, b);
    m[i] = magenta ? 0 : 1;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y < 70 || y > h - 150 || x < 60 || x > w - 60) m[y * w + x] = 0;
  return m;
}
