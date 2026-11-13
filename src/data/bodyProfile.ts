// Keyframes along the car: [t, value], where t = 0 at the nose and 1 at the tail.
export type Keys = [number, number][];

export type BodySpec = {
  kind: "proto" | "gt";
  length: number;
  width: number;
  frontAxle: number;
  wheelbase: number;
  wheelR: number;
  tyreW: number;
  archGap: number;
  floorY: Keys;
  outerZ: Keys;
  shoulderY: Keys;
  crestY: Keys;
  crestZ: Keys;
  valleyY: Keys;
  valleyZ: Keys;
  tubY: Keys;
  tubZ: Keys;
  spineY: Keys;
  tailCap: "paint" | "dark";
  /** Plan corner radius at the nose and tail, metres (GT bumpers). */
  noseRound?: number;
  tailRound?: number;
  /** How far the sill tucks under the doors between the arches, metres. */
  tuck?: number;
};

// v coordinate of each section control point: floor → wheel well → side → fender crest → valley → cockpit → spine.
const CONTROL_V = [0, 0.08, 0.14, 0.2, 0.45, 0.62, 0.67, 0.72, 0.85, 1];
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const V = {
  side: [0.2, 0.45] as const,
  crest: [0.45, 0.62] as const,
  upper: [0.62, 0.72] as const,
  window: [0.72, 0.85] as const,
  top: [0.85, 1] as const,
};

export function monotone(keys: Keys) {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  const xs = k.map((p) => p[0]);
  const ys = k.map((p) => p[1]);
  const n = k.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++)
    d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) m.push(d[0] ?? 0);
    else if (i === n - 1) m.push(d[n - 2] ?? 0);
    else if (d[i - 1] * d[i] <= 0) m.push(0);
    else m.push(2 / (1 / d[i - 1] + 1 / d[i]));
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const s = (t - xs[i]) / h;
    const s2 = s * s,
      s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * ys[i] +
      (s3 - 2 * s2 + s) * h * m[i] +
      (-2 * s3 + 3 * s2) * ys[i + 1] +
      (s3 - s2) * h * m[i + 1]
    );
  };
}

type P = [number, number, number]; // z, y, v

function chaikin(pts: P[], iterations: number) {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    const next: P[] = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i],
        b = cur[i + 1];
      next.push(
        [
          a[0] * 0.8 + b[0] * 0.2,
          a[1] * 0.8 + b[1] * 0.2,
          a[2] * 0.8 + b[2] * 0.2,
        ],
        [
          a[0] * 0.2 + b[0] * 0.8,
          a[1] * 0.2 + b[1] * 0.8,
          a[2] * 0.2 + b[2] * 0.8,
        ],
      );
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

export class BodyProfile {
  spec: BodySpec;
  f: Record<string, (t: number) => number>;
  frontX: number;
  rearX: number;
  wheelZ: number;
  private sections = new Map<number, P[]>();
  /** "light" halves the mesh density, for cars seen from the air. */
  detail: "full" | "light";
  constructor(spec: BodySpec, detail: "full" | "light" = "full") {
    this.spec = spec;
    this.detail = detail;
    this.f = {};
    for (const key of [
      "floorY",
      "outerZ",
      "shoulderY",
      "crestY",
      "crestZ",
      "valleyY",
      "valleyZ",
      "tubY",
      "tubZ",
      "spineY",
    ] as const)
      this.f[key] = monotone(spec[key]);
    this.frontX = spec.length / 2 - spec.frontAxle * spec.length;
    this.rearX = this.frontX - spec.wheelbase;
    this.wheelZ = spec.width / 2 - spec.tyreW / 2 - 0.025;
  }
  x(t: number) {
    return this.spec.length / 2 - t * this.spec.length;
  }
  t(x: number) {
    return (this.spec.length / 2 - x) / this.spec.length;
  }
  archY(x: number, floor: number) {
    const { wheelR, archGap } = this.spec;
    const R = wheelR + archGap;
    let y = floor;
    for (const ax of [this.frontX, this.rearX]) {
      const dx = Math.abs(x - ax);
      if (dx < R) y = Math.max(y, wheelR + Math.sqrt(R * R - dx * dx));
    }
    return y;
  }
  /**
   * Shapes the tail behind the rear wheels: the underside sweeps up into a
   * diffuser and the plan pulls in over the last few percent of length, so
   * the body ends in a rounded corner rather than a full-size slab.
   */
  tail(t: number) {
    const { wheelR, archGap, kind } = this.spec;
    const from = this.t(this.rearX - wheelR - archGap) + 0.012;
    const rise = Math.min(1, Math.max(0, (t - from) / Math.max(1e-6, 1 - from)));
    const end = Math.min(1, Math.max(0, (t - 0.95) / 0.05));
    return {
      kick: (kind === "proto" ? 0.24 : 0.2) * Math.pow(rise, 1.35),
      taper: kind === "proto" ? (1 - 0.03 * end * end) * this.plan(t) : this.plan(t),
      drop: (kind === "proto" ? 0 : 0.035) * end * end,
      // A GT bumper domes over the last centimetres, inside the body length.
      round:
        kind === "proto"
          ? 1
          : 1 - 0.13 * Math.pow(Math.min(1, Math.max(0, (t - 0.984) / 0.016)), 2),
    };
  }
  /**
   * GT bumpers turn the corner in plan: a quarter circle of the given radius
   * at each end. Returns the factor that scales the section's width there.
   */
  plan(t: number) {
    const { length, noseRound = 0, tailRound = 0 } = this.spec;
    const outer = Math.max(0.2, this.f.outerZ(t));
    let k = 1;
    for (const [r, s] of [
      [noseRound, t * length],
      [tailRound, (1 - t) * length],
    ]) {
      if (r <= 0 || s >= r) continue;
      const radius = Math.min(r, outer * 0.6);
      const d = Math.max(0, radius - s);
      k = Math.min(
        k,
        (outer - radius + Math.sqrt(Math.max(0, radius * radius - d * d))) /
          outer,
      );
    }
    return k;
  }
  /** Half-width of the body in plan at a station, after the corner rounding. */
  halfWidthAt(t: number) {
    return this.f.outerZ(t) * (this.spec.kind === "gt" ? this.plan(t) : this.tail(t).taper);
  }
  /**
   * A GT section: sill tucked under the door, a belly at full width, a
   * rounded shoulder, then the greenhouse standing close to the body side.
   * Control points keep the same v bands as the prototype section, so paint,
   * glazing and details share one coordinate system.
   */
  private gtControls(t: number): P[] {
    const f = this.f,
      spec = this.spec;
    const x = this.x(t);
    const tail = this.tail(t);
    const floor = f.floorY(t) + tail.kick;
    const outer = f.outerZ(t);
    const arch = this.archY(x, floor);
    const inArch = arch > floor + 1e-6;
    const R = spec.wheelR + spec.archGap;
    const clear = Math.min(
      ...[this.frontX, this.rearX].map((ax) => Math.max(0, Math.abs(x - ax) - R)),
    );
    const inner = Math.min(outer - 0.05, this.wheelZ - spec.tyreW / 2 - 0.035);
    const low = outer - (spec.tuck ?? 0.04) * smooth(0, 0.3, clear);
    const shoulder = Math.max(
      f.shoulderY(t),
      inArch ? arch + 0.012 : floor + 0.1,
    );
    // Over a wheel the fender rolls inboard from a low lip to its crest.
    const crest = Math.max(
      f.crestY(t) - tail.drop,
      shoulder + (inArch ? 0.03 : 0.014),
    );
    const crestZ = Math.min(f.crestZ(t), outer - 0.02);
    const valleyZ = Math.min(f.valleyZ(t), crestZ - 0.035);
    let valley = Math.max(f.valleyY(t), floor + 0.06);
    // Over a wheel the skin may only dip inboard of the well.
    if (inArch)
      valley = Math.max(valley, arch + 0.005 - Math.max(0, inner - valleyZ) * 0.6);
    const finZ = crestZ - Math.min(0.05, (crestZ - valleyZ) * 0.45);
    const fin =
      valley < crest
        ? crest - Math.min(0.012, (crest - valley) * 0.5)
        : crest + (valley - crest) * 0.45;
    const tubZ = Math.min(f.tubZ(t), valleyZ - 0.02);
    const tub = Math.max(f.tubY(t), floor + 0.07);
    const spine = Math.max(f.spineY(t), floor + 0.08);
    const base = inArch ? arch : floor;
    const points: P[] = [
      [0, floor, 0],
      [inner, floor, 0.08],
      [inner, arch, 0.14],
      [low, arch, 0.2],
      [outer, base + (shoulder - base) * 0.5, 0.32],
      [outer - 0.008, shoulder, 0.45],
      [crestZ, crest, 0.62],
      [finZ, fin, 0.67],
      [valleyZ, valley, 0.72],
      [tubZ, tub, 0.85],
      [tubZ * 0.5, spine - (spine - tub) * 0.24, 0.93],
      [0, spine, 1],
    ];
    const plan = this.plan(t);
    // The bumpers dome over their last centimetres, inside the body length.
    const lip = Math.max(
      Math.pow(Math.min(1, Math.max(0, (t - 0.984) / 0.016)), 2) * 0.13,
      Math.pow(Math.min(1, Math.max(0, (0.014 - t) / 0.014)), 2) * 0.11,
    );
    if (plan === 1 && lip === 0) return points;
    const centre = (floor + spine) / 2;
    return points.map(([z, y, v]) => [
      z * plan * (1 - lip * 0.5),
      centre + (y - centre) * (1 - lip),
      v,
    ]);
  }
  controls(t: number): P[] {
    if (this.spec.kind === "gt") return this.gtControls(t);
    const f = this.f;
    const x = this.x(t);
    const tail = this.tail(t);
    const floor = f.floorY(t) + tail.kick;
    const outer = f.outerZ(t) * tail.taper;
    const arch = this.archY(x, floor);
    const inner = Math.min(
      outer - 0.05,
      this.wheelZ - this.spec.tyreW / 2 - 0.035,
    );
    const shoulder = Math.max(
      f.shoulderY(t),
      arch > floor ? arch + 0.05 : floor + 0.02,
    );
    const crest = Math.max(f.crestY(t) - tail.drop, shoulder + 0.015);
    const crestZ = Math.min(f.crestZ(t), outer - 0.015);
    const wheelInner = this.wheelZ - this.spec.tyreW / 2;
    // Keep the upper fender continuous through wheel-arch boundaries. Switching
    // its lateral location only within an arch creates a visible crease in the skin.
    const finZ = Math.min(crestZ - 0.05, wheelInner - 0.01);
    const valleyZ = Math.min(f.valleyZ(t), finZ - 0.02);
    const tubZ = Math.min(f.tubZ(t), valleyZ - 0.02);
    const valley = Math.max(f.valleyY(t), floor + 0.03);
    const tub = Math.max(f.tubY(t), floor + 0.035);
    const spine = Math.max(f.spineY(t), floor + 0.04);
    const points: P[] = [
      [0, floor, CONTROL_V[0]],
      [inner, floor, CONTROL_V[1]],
      [inner, arch, CONTROL_V[2]],
      [outer, arch, CONTROL_V[3]],
      [outer, shoulder, CONTROL_V[4]],
      [crestZ, crest, CONTROL_V[5]],
      [finZ, Math.max(valley, crest - 0.045), CONTROL_V[6]],
      [valleyZ, valley, CONTROL_V[7]],
      [tubZ, tub, CONTROL_V[8]],
      [0, spine, CONTROL_V[9]],
    ];
    if (tail.round === 1) return points;
    const centre = (floor + spine) / 2;
    return points.map(([z, y, v]) => [
      z * tail.round,
      centre + (y - centre) * tail.round,
      v,
    ]);
  }
  section(t: number) {
    const cached = this.sections.get(t);
    if (cached) return cached;
    const section = chaikin(this.controls(t), this.detail === "light" ? 1 : 2);
    if (this.sections.size < 8192) this.sections.set(t, section);
    return section;
  }
  samples() {
    const ts = new Set<number>();
    const light = this.detail === "light";
    const N = light ? 64 : 150;
    for (let i = 0; i <= N; i++) ts.add(i / N);
    const R = this.spec.wheelR + this.spec.archGap;
    const steps = light ? 10 : 24;
    for (const ax of [this.frontX, this.rearX]) {
      for (let i = 0; i <= steps; i++) {
        const dx = R * Math.cos((i / steps) * Math.PI);
        ts.add(this.t(ax + dx * 0.999));
      }
      ts.add(this.t(ax + R * 1.004));
      ts.add(this.t(ax - R * 1.004));
    }
    // Enough rows to resolve the rounded tail.
    for (const t of [0.955, 0.965, 0.975, 0.986, 0.989, 0.992, 0.995, 0.9975])
      ts.add(t);
    // And the quarter-circle corners of a GT bumper, densest where they turn in.
    const L = this.spec.length;
    for (const [r, at] of [
      [this.spec.noseRound ?? 0, (s: number) => s / L],
      [this.spec.tailRound ?? 0, (s: number) => 1 - s / L],
    ] as const)
      if (r > 0) {
        const turns = light ? 6 : 12;
        for (let i = 1; i <= turns; i++) ts.add(at(r * Math.pow(i / turns, 2)));
      }
    if (this.spec.kind === "gt")
      for (const t of [0.002, 0.005, 0.009]) ts.add(t);
    return [...ts].filter((t) => t >= 0 && t <= 1).sort((a, b) => a - b);
  }
  topAt(t: number) {
    return this.f.spineY(t);
  }
}
