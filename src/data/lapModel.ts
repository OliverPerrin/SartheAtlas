import { lapTargets } from "./track.ts";
import { pointAt, unprojectXZ } from "./trackGeo.ts";
import type { TrackGeo } from "./trackGeo.ts";
import type { ClassName } from "./cars.ts";

/**
 * An illustrative lap: a smoothed driving line inside a narrow band around the
 * mapped centreline, and a quasi-steady-state speed trace along it for each
 * class. Nothing here is telemetry. The line never leaves the band, because
 * the source data has no asphalt widths and the project does not guess them.
 */

/** Furthest the line may sit from the mapped centreline, in metres. */
export const LINE_BAND = 3;
/** The public-road part of the lap is narrower than the permanent circuit. */
const ROAD_BAND = 2.6;
const ROAD_FROM = 0.16,
  ROAD_TO = 0.76;

export type RacingLine = {
  /** Samples around the lap, evenly spaced along the centreline. */
  n: number;
  /** Centreline metres between samples. */
  step: number;
  x: Float32Array;
  z: Float32Array;
  /** Metres right (+) or left (−) of the centreline, facing along the lap. */
  offset: Float32Array;
  /** Direction of travel, radians from east toward south, unwrapped. */
  heading: Float32Array;
  /** Signed curvature of the line, 1/m (+ turns right). */
  curvature: Float32Array;
  /** Length of the line from sample i to i + 1. */
  segment: Float32Array;
  length: number;
};

const lines = new WeakMap<TrackGeo, RacingLine>();

function bandAt(fraction: number) {
  // Ease between the two widths so the limit itself never kinks the line.
  const edge = 0.012;
  const inRoad =
    Math.min(1, Math.max(0, (fraction - ROAD_FROM) / edge)) *
    Math.min(1, Math.max(0, (ROAD_TO - fraction) / edge));
  return LINE_BAND + (ROAD_BAND - LINE_BAND) * inRoad;
}

export function racingLine(track: TrackGeo): RacingLine {
  const cached = lines.get(track);
  if (cached) return cached;
  const n = Math.round(track.length / 4);
  const step = track.length / n;
  const cx = new Float64Array(n),
    cz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = pointAt(track, i / n);
    cx[i] = p.x;
    cz[i] = p.z;
  }
  // Right-hand normals from a tangent taken across ±3 samples, which rides
  // over the 11 m facets of the source polyline.
  const nx = new Float64Array(n),
    nz = new Float64Array(n),
    band = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 3 + n) % n,
      b = (i + 3) % n;
    const tx = cx[b] - cx[a],
      tz = cz[b] - cz[a];
    const len = Math.hypot(tx, tz) || 1;
    nx[i] = -tz / len;
    nz[i] = tx / len;
    band[i] = bandAt(i / n);
  }
  // Minimum-curvature line: relax the second differences of the path, moving
  // each sample only along its normal and never past the band. Coarse passes
  // first, so the line can set up a corner from far back on the straight.
  const offset = new Float64Array(n);
  for (const stride of [32, 16, 8, 4, 2, 1]) {
    const count = Math.floor(n / stride);
    const at = (j: number) => (((j % count) + count) % count) * stride;
    const sweeps = stride === 1 ? 160 : 260;
    // Curvature is the second difference over the spacing squared, and the
    // spacing shrinks on the inside of a corner. Weighting each term by its
    // own spacing keeps the line from simply hugging the apex to save metres.
    const weight = new Float64Array(count);
    const px = (k: number) => cx[k] + offset[k] * nx[k],
      pz = (k: number) => cz[k] + offset[k] * nz[k];
    for (let sweep = 0; sweep < sweeps; sweep++) {
      if (sweep % 4 === 0)
        for (let j = 0; j < count; j++) {
          const a = at(j - 1),
            i = at(j),
            b = at(j + 1);
          const ds =
            (Math.hypot(px(i) - px(a), pz(i) - pz(a)) +
              Math.hypot(px(b) - px(i), pz(b) - pz(i))) /
            2;
          weight[j] = 1 / (ds * ds * ds || 1);
        }
      for (let j = 0; j < count; j++) {
        const i = at(j),
          a2 = at(j - 2),
          a1 = at(j - 1),
          b1 = at(j + 1),
          b2 = at(j + 2);
        const wa = weight[(j - 1 + count) % count],
          wi = weight[j],
          wb = weight[(j + 1) % count];
        const total = wa + 4 * wi + wb;
        const sx =
          wa * (2 * px(a1) - px(a2)) +
          2 * wi * (px(a1) + px(b1)) +
          wb * (2 * px(b1) - px(b2));
        const sz =
          wa * (2 * pz(a1) - pz(a2)) +
          2 * wi * (pz(a1) + pz(b1)) +
          wb * (2 * pz(b1) - pz(b2));
        const e = (sx / total - cx[i]) * nx[i] + (sz / total - cz[i]) * nz[i];
        offset[i] = Math.max(-band[i], Math.min(band[i], e));
      }
    }
    // Hand the coarse answer to the next level by linear interpolation.
    if (stride > 1)
      for (let j = 0; j < count; j++) {
        const a = j * stride,
          b = j + 1 < count ? a + stride : n;
        const end = offset[b % n];
        for (let i = a + 1; i < b; i++) {
          const u = (i - a) / (b - a);
          offset[i] = Math.max(
            -band[i],
            Math.min(band[i], offset[a] + (end - offset[a]) * u),
          );
        }
      }
  }
  const x = new Float32Array(n),
    z = new Float32Array(n),
    segment = new Float32Array(n),
    heading = new Float32Array(n),
    raw = new Float64Array(n),
    curvature = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = cx[i] + offset[i] * nx[i];
    z[i] = cz[i] + offset[i] * nz[i];
  }
  let length = 0;
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n,
      b = (i + 1) % n;
    segment[i] = Math.hypot(x[b] - x[i], z[b] - z[i]);
    length += segment[i];
    // Three-point (Menger) curvature, signed so a right-hander is positive.
    const ux = x[i] - x[a],
      uz = z[i] - z[a],
      vx = x[b] - x[i],
      vz = z[b] - z[i];
    const cross = ux * vz - uz * vx;
    const chord = Math.hypot(x[b] - x[a], z[b] - z[a]);
    raw[i] =
      (2 * cross) / (Math.hypot(ux, uz) * Math.hypot(vx, vz) * chord || 1);
    const angle = Math.atan2(z[b] - z[a], x[b] - x[a]);
    if (i === 0) heading[i] = angle;
    else {
      const turn = angle - heading[i - 1];
      heading[i] = heading[i - 1] + Math.atan2(Math.sin(turn), Math.cos(turn));
    }
  }
  // A light binomial filter takes the last sampling noise out of the curvature.
  let pass = raw;
  for (let k = 0; k < 2; k++) {
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++)
      next[i] =
        (pass[(i - 2 + n) % n] +
          4 * pass[(i - 1 + n) % n] +
          6 * pass[i] +
          4 * pass[(i + 1) % n] +
          pass[(i + 2) % n]) /
        16;
    pass = next;
  }
  curvature.set(pass);
  const line: RacingLine = {
    n,
    step,
    x,
    z,
    offset: Float32Array.from(offset),
    heading,
    curvature,
    segment,
    length,
  };
  lines.set(track, line);
  return line;
}

/** Where a car on the line is at a lap fraction (measured along the centreline). */
export function lineAt(track: TrackGeo, fraction: number) {
  const line = racingLine(track);
  const f = ((fraction % 1) + 1) % 1;
  const at = f * line.n;
  const i = Math.min(line.n - 1, Math.floor(at)),
    j = (i + 1) % line.n,
    u = at - i;
  const x = line.x[i] + (line.x[j] - line.x[i]) * u,
    z = line.z[i] + (line.z[j] - line.z[i]) * u;
  // The unwrapped heading jumps by a whole turn where the lap closes.
  const turn = line.heading[j] - line.heading[i];
  const heading =
    line.heading[i] + Math.atan2(Math.sin(turn), Math.cos(turn)) * u;
  const [longitude, latitude] = unprojectXZ(track, x, z);
  return {
    x,
    z,
    heading,
    offset: line.offset[i] + (line.offset[j] - line.offset[i]) * u,
    longitude,
    latitude,
  };
}

/**
 * Illustrative class figures, in the range the regulations and published
 * speed-trap and sector data imply. Mass is race weight with driver and fuel;
 * power is at the wheels.
 */
type Machine = {
  mass: number;
  power: number;
  /** Drag and downforce areas, m². */
  dragArea: number;
  liftArea: number;
  /** Tyre grip: cornering, traction and braking. */
  grip: number;
  traction: number;
  braking: number;
};
export const machines: Record<ClassName, Machine> = {
  Hypercar: {
    mass: 1140,
    power: 500e3,
    dragArea: 0.9,
    liftArea: 3.1,
    grip: 1.72,
    traction: 1.05,
    braking: 1.3,
  },
  LMP2: {
    mass: 1040,
    power: 405e3,
    dragArea: 0.845,
    liftArea: 2.9,
    grip: 1.59,
    traction: 1.05,
    braking: 1.28,
  },
  LMGT3: {
    mass: 1410,
    power: 388e3,
    dragArea: 1.04,
    liftArea: 1.7,
    grip: 1.66,
    traction: 1,
    braking: 1.24,
  },
};

const G = 9.81,
  AIR = 1.2,
  ROLLING = 0.014 * G;

export type SpeedModel = {
  /** Speed at each sample, m/s. */
  speeds: Float32Array;
  /** Centreline metres between samples. */
  step: number;
  lapTime: number;
  /** Time at each sample; one more entry than `speeds` closes the lap. */
  times: Float32Array;
  /** Longitudinal acceleration at each sample, m/s² (negative under braking). */
  accel: Float32Array;
  /** Peak braking the class can produce, for scaling the brake lights. */
  maxBrake: number;
  /** The cornering-grip trim used to land on the class lap time. */
  trim: number;
};

function trace(line: RacingLine, car: Machine, trim: number) {
  const { n, curvature, segment } = line;
  const aero = (AIR * car.liftArea) / (2 * car.mass * G); // downforce / weight per v²
  const drag = (AIR * car.dragArea) / (2 * car.mass);
  const grip = car.grip * trim;
  const ceiling = 110; // m/s; never reached, only a guard
  const limit = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.abs(curvature[i]);
    const spare = k - grip * G * aero;
    limit[i] =
      spare > 1e-6 ? Math.min(ceiling, Math.sqrt((grip * G) / spare)) : ceiling;
  }
  // How much of the tyre is left for driving or braking while cornering.
  const spare = (v: number, i: number) => {
    const lateral = v * v * Math.abs(curvature[i]);
    const most = grip * G * (1 + aero * v * v);
    return Math.sqrt(Math.max(0, 1 - Math.min(1, lateral / most) ** 2));
  };
  const v = Float64Array.from(limit);
  let start = 0;
  for (let i = 1; i < n; i++) if (limit[i] < limit[start]) start = i;
  // Forward from the slowest point: traction- then power-limited, against drag.
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n,
      j = (i + 1) % n;
    const speed = Math.max(8, v[i]);
    const drive = Math.min(
      car.traction * G * (1 + aero * speed * speed) * spare(speed, i),
      car.power / (car.mass * speed),
    );
    const a = drive - drag * speed * speed - ROLLING;
    v[j] = Math.min(
      v[j],
      Math.sqrt(Math.max(64, speed * speed + 2 * a * segment[i])),
    );
  }
  // Backward: aero-assisted braking, helped by drag.
  for (let k = 0; k < n; k++) {
    const j = (start - k + n) % n,
      i = (j - 1 + n) % n;
    const speed = v[j];
    const a =
      car.braking * G * (1 + aero * speed * speed) * spare(speed, j) +
      drag * speed * speed +
      ROLLING;
    v[i] = Math.min(v[i], Math.sqrt(speed * speed + 2 * a * segment[i]));
  }
  let lap = 0;
  for (let i = 0; i < n; i++) lap += (2 * segment[i]) / (v[i] + v[(i + 1) % n]);
  return { v, lap };
}

const models = new WeakMap<TrackGeo, Partial<Record<ClassName, SpeedModel>>>();

/**
 * Speed around the lap for one class. The physics sets the shape; a trim of a
 * few percent on cornering grip alone lands it on the class's typical race lap,
 * so top speed is whatever power and drag give, never a scaled figure.
 */
export function speedModel(track: TrackGeo, cls: ClassName): SpeedModel {
  const cache = models.get(track) ?? {};
  models.set(track, cache);
  if (cache[cls]) return cache[cls];
  const line = racingLine(track);
  const car = machines[cls];
  const target = lapTargets[cls].lap;
  let low = 0.94,
    high = 1.06,
    trim = 1,
    result = trace(line, car, trim);
  if (trace(line, car, low).lap > target && trace(line, car, high).lap < target)
    for (let i = 0; i < 14; i++) {
      trim = (low + high) / 2;
      result = trace(line, car, trim);
      if (result.lap > target) low = trim;
      else high = trim;
    }
  else {
    trim = trace(line, car, low).lap <= target ? low : high;
    result = trace(line, car, trim);
  }
  const { n, segment } = line;
  const speeds = Float32Array.from(result.v);
  const times = new Float32Array(n + 1);
  const accel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const next = speeds[(i + 1) % n];
    times[i + 1] = times[i] + (2 * segment[i]) / (speeds[i] + next);
    accel[i] = (next * next - speeds[i] * speeds[i]) / (2 * segment[i]);
  }
  const top = 95;
  const model: SpeedModel = {
    speeds,
    step: line.step,
    lapTime: times[n],
    times,
    accel,
    maxBrake:
      car.braking *
      G *
      (1 + ((AIR * car.liftArea) / (2 * car.mass * G)) * top * top),
    trim,
  };
  cache[cls] = model;
  return model;
}

export function fractionAtTime(m: SpeedModel, t: number, length: number) {
  const tt = ((t % m.lapTime) + m.lapTime) % m.lapTime;
  let lo = 0,
    hi = m.times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (m.times[mid] <= tt) lo = mid;
    else hi = mid;
  }
  const u = (tt - m.times[lo]) / (m.times[lo + 1] - m.times[lo]);
  return Math.min(1, ((lo + u) * m.step) / length);
}

/** Time into the lap at which a car reaches a lap fraction. */
export function timeAtFraction(m: SpeedModel, fraction: number) {
  const n = m.speeds.length;
  const at = (((fraction % 1) + 1) % 1) * n;
  const i = Math.min(n - 1, Math.floor(at));
  return m.times[i] + (m.times[i + 1] - m.times[i]) * (at - i);
}

/** Speed in m/s at a lap fraction, interpolated between samples. */
export function speedAt(m: SpeedModel, fraction: number) {
  const n = m.speeds.length;
  const at = (((fraction % 1) + 1) % 1) * n;
  const i = Math.min(n - 1, Math.floor(at)),
    j = (i + 1) % n;
  return m.speeds[i] + (m.speeds[j] - m.speeds[i]) * (at - i);
}

/** 0 to 1: how hard the car is on the brakes at a lap fraction. */
export function brakeAt(m: SpeedModel, fraction: number) {
  const n = m.accel.length;
  const i = Math.min(n - 1, Math.floor((((fraction % 1) + 1) % 1) * n));
  // Lifting alone (drag) does not light the brake lamps.
  return Math.min(1, Math.max(0, (-m.accel[i] - 4) / (m.maxBrake * 0.45)));
}
