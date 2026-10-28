import { monotone } from "../data/bodyProfile.ts";
import type { BodySpec, Keys } from "../data/bodyProfile.ts";

/**
 * A measured outline: the body's highest point and plan half-width at evenly
 * spaced stations from nose (t = 0) to tail (t = 1), in metres.
 */
export type BodyOutline = {
  top: readonly number[];
  half: readonly number[];
  /** Heights are fitted up to this station only (see bodyOutlines.ts). */
  heightUntil: number;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Bends a procedural body toward a measured outline while keeping its own
 * cross-section design (fender crests, valleys, cabin). Heights shift by the
 * gap between the outline and the body's current top; widths follow the plan
 * but never pinch the body by more than 15% at a station.
 */
export function fitBody(spec: BodySpec, outline: BodyOutline): BodySpec {
  const { heightUntil } = outline;
  const n = outline.top.length - 1;
  const f = Object.fromEntries(
    (
      [
        "spineY",
        "crestY",
        "tubY",
        "valleyY",
        "shoulderY",
        "outerZ",
        "crestZ",
        "valleyZ",
        "tubZ",
        "floorY",
      ] as const
    ).map((key) => [key, monotone(spec[key])]),
  ) as Record<string, (t: number) => number>;
  const ts = outline.top.map((_, i) => i / n);
  const weight = (t: number) =>
    clamp(1 - (t - heightUntil) / 0.12, 0, 1) * clamp((1 - t) / 0.03, 0, 1);
  const raw = ts.map((t, i) => {
    const current = Math.max(f.spineY(t), f.crestY(t), f.tubY(t));
    return clamp(outline.top[i] - current, -0.3, 0.3) * weight(t);
  });
  const delta = raw.map(
    (v, i) => (v * 2 + (raw[i - 1] ?? v) + (raw[i + 1] ?? v)) / 4,
  );
  const halfW = spec.width / 2;
  const width = ts.map((t, i) =>
    clamp(outline.half[i] || f.outerZ(t), f.outerZ(t) * 0.85, halfW),
  );
  const keys = (fn: (t: number, i: number) => number): Keys =>
    ts.map((t, i) => [t, Math.round(fn(t, i) * 1000) / 1000]);
  const ratio = (t: number, i: number) => width[i] / Math.max(0.2, f.outerZ(t));
  // The side silhouette's top is either the cabin on the centreline or a
  // fender crest. Move only whichever forms the top at each station, so a
  // taller canopy does not drag the sidepods up with it.
  const fender = ts.map((t) => {
    const centre = Math.max(f.spineY(t), f.tubY(t));
    return clamp((f.crestY(t) - centre) / 0.06 + 0.5, 0, 1);
  });
  const cabin = (i: number) => delta[i] * (1 - fender[i]);
  const crest = (i: number) => delta[i] * fender[i];
  return {
    ...spec,
    spineY: keys((t, i) => f.spineY(t) + cabin(i)),
    tubY: keys((t, i) => f.tubY(t) + cabin(i)),
    crestY: keys((t, i) => f.crestY(t) + crest(i)),
    shoulderY: keys((t, i) =>
      Math.max(f.floorY(t) + 0.05, f.shoulderY(t) + crest(i) * 0.5),
    ),
    outerZ: keys((_, i) => width[i]),
    crestZ: keys((t, i) => f.crestZ(t) * ratio(t, i)),
    valleyZ: keys((t, i) => f.valleyZ(t) * ratio(t, i)),
    tubZ: keys((t, i) => f.tubZ(t) * Math.sqrt(ratio(t, i))),
  };
}
