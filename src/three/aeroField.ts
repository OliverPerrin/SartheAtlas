import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";

/**
 * Illustrative airflow for the wind-tunnel view. Paths follow the study
 * body's own surface, so each car's silhouette shapes its flow, but this is
 * a geometric approximation: there is no pressure solve, separation model or
 * turbulence. Air travels from +X (nose) toward −X (tail).
 */
export type Streamline = {
  kind: "over" | "side" | "under" | "wing" | "vortex";
  /** xyz triples. */
  points: Float32Array;
  /** Relative local speed, 1 = free stream. */
  speed: Float32Array;
  /** Cumulative travel time at each point (arc length / speed). */
  time: Float32Array;
};

const STEP = 0.04;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Field = {
  x0: number;
  nx: number;
  z0: number;
  nz: number;
  dz: number;
  h: Float32Array;
};

/** Highest body surface above each floor cell, sampled from the loft. */
function heightField(body: Body): Field {
  const L = body.spec.length;
  const halfW = body.spec.width / 2;
  const x0 = -L / 2 - 0.2;
  const nx = Math.ceil((L + 0.4) / STEP) + 1;
  const dz = 0.05;
  const z0 = -halfW - 0.1;
  const nz = Math.ceil((2 * halfW + 0.2) / dz) + 1;
  const h = new Float32Array(nx * nz);
  for (let ti = 0; ti <= 260; ti++) {
    const t = ti / 260;
    for (let vi = 0; vi <= 90; vi++) {
      const v = vi / 90;
      for (const side of [-1, 1]) {
        const p = body.pointAt(t, v, side);
        const i = Math.round((p.x - x0) / STEP);
        const j = Math.round((p.z - z0) / dz);
        if (i < 0 || i >= nx || j < 0 || j >= nz) continue;
        const k = i * nz + j;
        if (p.y > h[k]) h[k] = p.y;
      }
    }
  }
  // Close sampling gaps between loft stations.
  const filled = new Float32Array(h);
  for (let i = 1; i < nx - 1; i++)
    for (let j = 1; j < nz - 1; j++) {
      let m = h[i * nz + j];
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++) m = Math.max(m, h[(i + a) * nz + j + b]);
      filled[i * nz + j] = m;
    }
  return { x0, nx, z0, nz, dz, h: filled };
}

function columnAt(field: Field, z: number) {
  const j = clamp(Math.round((z - field.z0) / field.dz), 0, field.nz - 1);
  const out = new Float32Array(field.nx);
  for (let i = 0; i < field.nx; i++) out[i] = field.h[i * field.nz + j];
  return out;
}

/** Height of the stream's lower bound at x, with an upstream ramp and a slow wake descent. */
function envelope(field: Field, column: Float32Array, x: number) {
  const at = (px: number) => {
    const i = Math.round((px - field.x0) / STEP);
    return i < 0 || i >= field.nx ? 0 : column[i];
  };
  let ramp = 0;
  for (let s = 0; s <= 0.7; s += STEP)
    ramp = Math.max(ramp, at(x - s) - 0.85 * s);
  let wake = ramp;
  for (let s = STEP; s <= 2.4; s += STEP) {
    let up = 0;
    for (let r = 0; r <= 0.7; r += STEP * 2)
      up = Math.max(up, at(x + s - r) - 0.85 * r);
    wake = Math.max(wake, up - 0.3 * s);
  }
  return wake;
}

function finish(
  kind: Streamline["kind"],
  pts: number[],
  speeds: number[],
): Streamline {
  const n = speeds.length;
  const time = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const dx = pts[i * 3] - pts[i * 3 - 3];
    const dy = pts[i * 3 + 1] - pts[i * 3 - 2];
    const dz = pts[i * 3 + 2] - pts[i * 3 - 1];
    const v = Math.max(0.2, (speeds[i] + speeds[i - 1]) / 2);
    time[i] = time[i - 1] + Math.hypot(dx, dy, dz) / v;
  }
  return {
    kind,
    points: new Float32Array(pts),
    speed: new Float32Array(speeds),
    time,
  };
}

function smoothY(ys: number[], radius: number) {
  const out = ys.slice();
  for (let i = 0; i < ys.length; i++) {
    let sum = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const v = ys[clamp(i + k, 0, ys.length - 1)];
      sum += v;
      count++;
    }
    out[i] = Math.max(ys[i], sum / count);
  }
  return out;
}

export function buildStreamlines(body: Body, shape: Shape): Streamline[] {
  const L = body.spec.length;
  const W = body.spec.width;
  const gt = body.spec.kind === "gt";
  const field = heightField(body);
  const xStart = L / 2 + 1.5;
  const xEnd = -L / 2 - 3.4;
  const xTail = -L / 2;
  const xs: number[] = [];
  for (let x = xStart; x >= xEnd; x -= STEP) xs.push(x);
  const lines: Streamline[] = [];

  const w = shape.wing;
  const wingX = body.x(w.t);
  const lead = wingX + w.chord / 2;
  const trail = wingX - w.chord / 2;

  // Over-body streams across the width, from bumper height to above the roof.
  const heights = [0.3, 0.48, 0.66, 0.84, 1.02, 1.2, 1.42];
  const lanes = 11;
  for (let li = 0; li < lanes; li++) {
    const z = ((li / (lanes - 1)) * 2 - 1) * W * 0.4;
    const column = columnAt(field, z);
    const colTop = Math.max(...column);
    const env = xs.map((x) => envelope(field, column, x));
    for (const y0 of heights) {
      if (y0 > colTop + 0.55) continue;
      const above = Math.max(0, y0 - colTop);
      const ys = xs.map((_, i) => {
        const surface = env[i] + 0.04;
        const lift = Math.max(0, surface - y0);
        // Streams above the roof are displaced a little as the car passes.
        const displaced =
          0.16 * clamp(env[i] / colTop, 0, 1) * Math.exp(-above / 0.35);
        return y0 + lift + displaced;
      });
      const smoothed = smoothY(ys, 3);
      // The wing turns air upward behind it: the reaction is downforce.
      const inSpan = Math.abs(z) < w.span / 2 - 0.04;
      const near = Math.exp(-(((y0 - w.y) / 0.42) ** 2));
      const speeds: number[] = [];
      const pts: number[] = [];
      smoothed.forEach((y, i) => {
        const x = xs[i];
        let yy = y;
        let s = 1 + 0.55 * clamp((y - y0) / 0.55, 0, 1);
        if (inSpan && x < lead + 0.5) {
          const behind = Math.max(0, trail - x);
          yy +=
            near *
            (0.07 * clamp((lead + 0.5 - x) / 0.6, 0, 1) +
              0.3 * (1 - Math.exp(-behind / 0.55)));
          if (x < lead && x > trail) s += near * (y < w.y ? 0.6 : -0.2);
        }
        const rise = i > 0 ? (yy - (pts[(i - 1) * 3 + 1] ?? yy)) / STEP : 0;
        s -= 0.5 * clamp(rise * 1.4, 0, 1);
        if (x < xTail && y0 < colTop + 0.1)
          s *=
            1 -
            0.55 *
              Math.exp(-(xTail - x) / 1.8) *
              clamp((colTop + 0.2 - y0) / 0.6, 0, 1);
        pts.push(x, yy, z);
        speeds.push(clamp(s, 0.25, 1.85));
      });
      lines.push(
        finish(
          y0 > colTop ? "over" : inSpan && near > 0.6 ? "wing" : "over",
          pts,
          speeds,
        ),
      );
    }
  }

  // Streams that run past the flanks and bow out around the wheels.
  for (const side of [-1, 1])
    for (const k of [0, 1, 2])
      for (const y0 of [0.22, 0.5, 0.8]) {
        const z0 = side * (W / 2 + 0.1 + k * 0.24);
        const pts: number[] = [];
        const speeds: number[] = [];
        for (const x of xs) {
          const bulge =
            Math.exp(-(((x - body.frontX) / 0.55) ** 2)) +
            Math.exp(-(((x - body.rearX) / 0.55) ** 2));
          const along =
            x < L / 2 && x > xTail
              ? 1
              : Math.exp(-Math.abs(x < xTail ? xTail - x : x - L / 2) / 0.5);
          const z = z0 + (side * (0.05 * along + 0.07 * bulge)) / (1 + k);
          let s = 1 + (0.18 * along) / (1 + k);
          if (x < xTail)
            s *= 1 - (0.35 * Math.exp(-(xTail - x) / 1.4)) / (1 + k);
          pts.push(x, y0, z);
          speeds.push(s);
        }
        lines.push(finish("side", pts, speeds));
      }

  // Underfloor: squeezed under the splitter, fastest under the floor, then
  // slowed and turned upward by the diffuser.
  const floorY = gt ? 0.085 : 0.05;
  const splitter = body.x(0.03);
  const diffuser = body.rearX + 0.1;
  for (let li = 0; li < 7; li++) {
    const z = ((li / 6) * 2 - 1) * W * 0.36;
    const pts: number[] = [];
    const speeds: number[] = [];
    for (const x of xs) {
      let y: number;
      let s: number;
      if (x > splitter) {
        const t = clamp((xStart - x) / (xStart - splitter), 0, 1);
        y = 0.2 - (0.2 - floorY * 0.55) * t * t;
        s = 1 + 0.4 * t * t;
      } else if (x > diffuser) {
        y = floorY * 0.55;
        s = 1.8;
      } else if (x > xTail) {
        const t = (diffuser - x) / (diffuser - xTail);
        y = floorY * 0.55 + t * 0.26;
        s = 1.8 - 0.6 * t;
      } else {
        const t = xTail - x;
        y = floorY * 0.55 + 0.26 + 0.42 * (1 - Math.exp(-t / 0.9));
        s = 1.2 - 0.6 * (1 - Math.exp(-t / 1.2));
      }
      pts.push(x, y, z);
      speeds.push(s);
    }
    lines.push(finish("under", pts, speeds));
  }

  // Wing-tip vortices, from the pressure difference across the endplates.
  for (const side of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const pts: number[] = [];
      const speeds: number[] = [];
      const phase = (k / 4) * Math.PI * 2;
      for (let x = trail + 0.15; x >= xEnd; x -= STEP) {
        const d = trail + 0.15 - x;
        const r = 0.035 + 0.035 * d;
        const a = phase + side * d * Math.PI * 2 * 1.4;
        const yc = w.y - 0.02 + 0.22 * (1 - Math.exp(-d / 1.1));
        const zc = side * (w.span / 2 - 0.02 * d);
        pts.push(x, yc + r * Math.sin(a), zc + r * Math.cos(a));
        speeds.push(1.35 - 0.5 * clamp(d / 3, 0, 1));
      }
      lines.push(finish("vortex", pts, speeds));
    }

  return lines;
}

/** Slow blue → cyan → white → amber → red, by relative speed. */
export function speedColor(speed: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.3, [0.13, 0.32, 0.95]],
    [0.85, [0.14, 0.78, 0.96]],
    [1.15, [0.88, 0.95, 1]],
    [1.45, [1, 0.74, 0.2]],
    [1.8, [0.98, 0.24, 0.22]],
  ];
  if (speed <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [b, cb] = stops[i];
    const [a, ca] = stops[i - 1];
    if (speed <= b) {
      const t = (speed - a) / (b - a);
      return [0, 1, 2].map((c) => ca[c] + (cb[c] - ca[c]) * t) as [
        number,
        number,
        number,
      ];
    }
  }
  return stops[stops.length - 1][1];
}
