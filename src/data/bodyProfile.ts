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
};

// v coordinate of each section control point: floor → wheel well → side → fender crest → valley → cockpit → spine.
const CONTROL_V = [0, 0.08, 0.14, 0.2, 0.45, 0.62, 0.67, 0.72, 0.85, 1];
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
  constructor(spec: BodySpec) {
    this.spec = spec;
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
  controls(t: number): P[] {
    const f = this.f;
    const x = this.x(t);
    const floor = f.floorY(t);
    const outer = f.outerZ(t);
    const arch = this.archY(x, floor);
    const inner = Math.min(
      outer - 0.05,
      this.wheelZ - this.spec.tyreW / 2 - 0.035,
    );
    const shoulder = Math.max(
      f.shoulderY(t),
      arch > floor ? arch + 0.05 : floor + 0.02,
    );
    const crest = Math.max(f.crestY(t), shoulder + 0.015);
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
    return [
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
  }
  section(t: number) {
    const cached = this.sections.get(t);
    if (cached) return cached;
    const section = chaikin(this.controls(t), 2);
    if (this.sections.size < 8192) this.sections.set(t, section);
    return section;
  }
  samples() {
    const ts = new Set<number>();
    const N = 150;
    for (let i = 0; i <= N; i++) ts.add(i / N);
    const R = this.spec.wheelR + this.spec.archGap;
    for (const ax of [this.frontX, this.rearX]) {
      for (let i = 0; i <= 24; i++) {
        const dx = R * Math.cos((i / 24) * Math.PI);
        ts.add(this.t(ax + dx * 0.999));
      }
      ts.add(this.t(ax + R * 1.004));
      ts.add(this.t(ax - R * 1.004));
    }
    return [...ts].filter((t) => t >= 0 && t <= 1).sort((a, b) => a - b);
  }
  topAt(t: number) {
    return this.f.spineY(t);
  }
}
