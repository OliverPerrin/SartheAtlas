import type { BodySpec } from "./body.ts";
import { bodyOutlines } from "../data/bodyOutlines.ts";
import { fitBody } from "./bodyFit.ts";
import { monotone } from "../data/bodyProfile.ts";

export type LightStyle =
  | "blades"
  | "claw"
  | "vertical"
  | "triangle"
  | "twoline"
  | "kidney"
  | "twin"
  | "pods"
  | "round"
  | "eye"
  | "slim"
  | "spindle";

export type WingStyle = "swan" | "pylon";
export type Grille = "none" | "kidney" | "aston" | "slats" | "spindle" | "wide" | "mustang" | "low";

export type Shape = {
  body: BodySpec;
  lights: LightStyle;
  tail: "bar" | "claw" | "split" | "tribar" | "vertical";
  wing: { style: WingStyle; t: number; y: number; chord: number; span: number; plate: number };
  fin: boolean;
  grille: Grille;
  // Cockpit window region in t (for painting and interior placement).
  cockpit: { from: number; to: number; roof: number };
  /** GT glazing stations: windscreen top, roof end, rear-glass base, B pillar. */
  glass?: { header: number; back: number; deck: number; pillar: number };
  rim: string;
  splitter: number;
};

type ProtoOpts = {
  L?: number;
  W?: number;
  fa?: number;
  wb?: number;
  noseH?: number;
  fenderH?: number;
  rearFenderH?: number;
  roofH?: number;
  tc?: number;
  canopyW?: number;
  podH?: number;
  engineH?: number;
  tailH?: number;
  crestInset?: number;
  valleyZ?: number;
};

function proto(o: ProtoOpts = {}): BodySpec {
  const L = o.L ?? 5.0,
    W = o.W ?? 2.0,
    fa = o.fa ?? 0.2,
    wb = o.wb ?? 3.12;
  const tf = fa,
    tr = fa + wb / L,
    tc = o.tc ?? 0.47;
  const noseH = o.noseH ?? 0.3,
    fenderH = o.fenderH ?? 0.88,
    rearH = o.rearFenderH ?? 0.92,
    roofH = o.roofH ?? 1.05,
    podH = o.podH ?? 0.5,
    engineH = o.engineH ?? 0.82,
    tailH = o.tailH ?? 0.86,
    canopyW = o.canopyW ?? 0.5,
    inset = o.crestInset ?? 0.17,
    vz = o.valleyZ ?? 0.55;
  const h = W / 2;
  return {
    kind: "proto",
    length: L,
    width: W,
    frontAxle: fa,
    wheelbase: wb,
    wheelR: 0.355,
    tyreW: 0.34,
    archGap: 0.045,
    tailCap: "dark",
    noseRound: 0.3,
    floorY: [
      [0, 0.075],
      [0.05, 0.06],
      [1, 0.06],
    ],
    outerZ: [
      [0, h * 0.94],
      [0.05, h * 0.985],
      [tf, h],
      [tf + 0.11, h * 0.97],
      [tc, h * 0.86],
      [tr - 0.14, h * 0.9],
      [tr, h],
      [0.97, h * 0.985],
      [1, h * 0.96],
    ],
    shoulderY: [
      [0, 0.18],
      [0.04, fenderH * 0.51],
      [tf, 0.8],
      [tf + 0.1, podH + 0.02],
      [tc, podH - 0.06],
      [tr - 0.12, podH + 0.04],
      [tr, 0.82],
      [1, tailH - 0.1],
    ],
    crestY: [
      [0, Math.max(0.24, noseH * 0.72)],
      [0.035, fenderH * 0.67],
      [tf - 0.05, fenderH - 0.02],
      [tf + 0.03, fenderH],
      [tf + 0.12, podH + 0.2],
      [tc, podH + 0.04],
      [tr - 0.16, podH + 0.14],
      [tr - 0.02, rearH],
      [0.97, rearH - 0.03],
      [1, tailH],
    ],
    crestZ: [
      [0, h - inset + 0.04],
      [tf, h - inset],
      [tc, h - inset - 0.06],
      [tr, h - inset + 0.02],
      [1, h - inset + 0.04],
    ],
    valleyY: [
      [0, 0.105],
      [0.06, noseH - 0.02],
      [tf, noseH + 0.08],
      [tf + 0.12, podH - 0.02],
      [tc, podH],
      [tr - 0.08, engineH - 0.12],
      [tr, engineH - 0.08],
      [1, tailH - 0.06],
    ],
    valleyZ: [
      [0, vz],
      [tf, vz - 0.04],
      [tc, vz + 0.06],
      [tr, vz],
      [1, vz],
    ],
    tubY: [
      [0, 0.108],
      [0.06, noseH],
      [tf, noseH + 0.14],
      [tc - 0.13, 0.72],
      [tc - 0.06, roofH - 0.12],
      [tc + 0.06, roofH - 0.14],
      [tc + 0.16, engineH],
      [tr, engineH - 0.02],
      [1, tailH - 0.02],
    ],
    tubZ: [
      [0, 0.3],
      [tf, 0.3],
      [tc - 0.1, canopyW * 0.85],
      [tc, canopyW],
      [tc + 0.1, canopyW * 0.85],
      [tr, 0.32],
      [1, 0.34],
    ],
    spineY: [
      [0, 0.11],
      [0.06, noseH + 0.02],
      [tf, noseH + 0.17],
      [tc - 0.15, 0.72],
      [tc - 0.07, roofH - 0.03],
      [tc, roofH],
      [tc + 0.08, roofH - 0.03],
      [tc + 0.19, engineH + 0.1],
      [tr, engineH + 0.04],
      [1, tailH],
    ],
  };
}

type GtOpts = {
  L?: number;
  W?: number;
  fa?: number;
  wb?: number;
  /** Centreline heights at the bumper top, over the front axle and at the tail. */
  nose: number;
  hood: number;
  tail: number;
  /** Centreline stations [t, height]: windscreen base and top, roof peak,
   *  roof end, and where the rear glass or engine cover meets the deck. */
  cowl: [number, number];
  header: [number, number];
  peak: [number, number];
  back: [number, number];
  deck: [number, number];
  /** Fender crest over each axle and the belt line at the doors. */
  fender: number;
  belt: number;
  haunch: number;
  /** Half-widths in metres: glass base, roof rail and bonnet edge. */
  cabin?: number;
  roofW?: number;
  hoodW?: number;
  /** Door half-width as a fraction of the car's half-width. */
  waist?: number;
  noseR?: number;
  tailR?: number;
  /** Raises the greenhouse where the measured reference sits lower than the
   *  car's published overall height. Applied after the outline fit. */
  lift?: number;
};

// A GT car is a road-car body: a lower body with fenders standing over the
// wheels and a waist between them, and a greenhouse close to the body side.
function gt(o: GtOpts): BodySpec {
  const L = o.L ?? 4.65,
    W = o.W ?? 2.04,
    fa = o.fa ?? 0.19,
    wb = o.wb ?? 2.72;
  const tf = fa,
    tr = fa + wb / L;
  const h = W / 2;
  const cabin = o.cabin ?? 0.69,
    roofW = o.roofW ?? 0.53,
    hoodW = o.hoodW ?? 0.58,
    wz = h * (o.waist ?? 0.9);
  const [ct, cy] = o.cowl,
    [ht, hy] = o.header,
    [pt, py] = o.peak,
    [bt, by] = o.back,
    [dt, dy] = o.deck;
  const mid = (ct + bt) / 2;
  const proud = Math.max(0, o.fender - o.hood);
  return {
    kind: "gt",
    length: L,
    width: W,
    frontAxle: fa,
    wheelbase: wb,
    wheelR: 0.35,
    tyreW: 0.31,
    archGap: 0.038,
    tailCap: "paint",
    noseRound: o.noseR ?? 0.34,
    tailRound: o.tailR ?? 0.26,
    tuck: 0.045,
    floorY: [
      [0, 0.13],
      [0.06, 0.09],
      [1, 0.1],
    ],
    outerZ: [
      [0, h * 0.94],
      [0.04, h * 0.985],
      [tf - 0.03, h],
      [tf + 0.05, h],
      [tf + 0.14, wz],
      [tr - 0.16, wz],
      [tr - 0.05, h],
      [tr + 0.05, h],
      [0.96, h * 0.975],
      [1, h * 0.95],
    ],
    shoulderY: [
      [0, o.nose - 0.2],
      [0.05, o.nose - 0.08],
      [tf, o.fender - 0.1],
      [mid, o.belt - 0.17],
      [tr, o.haunch - 0.12],
      [1, o.tail - 0.22],
    ],
    crestY: [
      [0, o.nose - 0.06],
      [0.045, o.nose + (o.fender - o.nose) * 0.55],
      [tf - 0.04, o.fender],
      [tf + 0.03, o.fender],
      [ct + 0.04, cy - 0.04],
      [mid, o.belt - 0.025],
      [tr - 0.03, o.haunch],
      [tr + 0.04, o.haunch],
      [0.97, o.tail - 0.02],
      [1, o.tail - 0.05],
    ],
    crestZ: [
      [0, h * 0.66],
      [tf, h - 0.12],
      [ct + 0.05, wz - 0.045],
      [tr - 0.15, wz - 0.045],
      [tr, h - 0.11],
      [1, h * 0.74],
    ],
    valleyY: [
      [0, o.nose - 0.03],
      [0.045, o.nose + (o.hood - o.nose) * 0.55 - 0.02 - proud * 0.3],
      [tf, o.hood - 0.015 - proud * 0.2],
      [ct, cy - 0.02],
      [mid, o.belt],
      [bt, o.belt + 0.015],
      [dt, dy - 0.02],
      [1, o.tail - 0.02],
    ],
    valleyZ: [
      [0, hoodW * 0.86],
      [tf, hoodW],
      [ct, cabin - 0.035],
      [ct + 0.08, cabin],
      [bt, cabin],
      [dt, cabin * 0.9],
      [1, h * 0.6],
    ],
    tubY: [
      [0, o.nose - 0.012],
      [0.045, o.nose + (o.hood - o.nose) * 0.55 - 0.012],
      [tf, o.hood - 0.012],
      [ct, cy - 0.012],
      [ht, hy - 0.04],
      [pt, py - 0.045],
      [bt, by - 0.045],
      [dt, dy - 0.012],
      [1, o.tail - 0.012],
    ],
    tubZ: [
      [0, hoodW * 0.5],
      [tf, hoodW * 0.56],
      [ct, cabin - 0.075],
      [ht, roofW],
      [bt, roofW * 0.98],
      [dt, cabin * 0.74],
      [1, h * 0.42],
    ],
    spineY: [
      [0, o.nose],
      [0.045, o.nose + (o.hood - o.nose) * 0.55],
      [tf, o.hood],
      [ct - 0.02, cy - 0.014],
      [ct, cy],
      [ht, hy],
      [pt, py],
      [bt, by],
      [dt, dy],
      [1, o.tail],
    ],
  };
}

/** Where a GT car's glass sits, from the same stations that shape its roof. */
function gtGlass(
  o: Pick<GtOpts, "cowl" | "header" | "peak" | "back" | "deck">,
  pillar: number,
  rear = o.deck[0],
) {
  const [ct] = o.cowl,
    [bt] = o.back,
    [dt] = o.deck;
  return {
    cockpit: { from: ct, to: bt + (dt - bt) * 0.5, roof: o.peak[0] },
    glass: { header: o.header[0], back: bt, deck: Math.min(rear, dt), pillar },
  };
}

const protoCockpit = (tc = 0.47) => ({ from: tc - 0.16, to: tc + 0.1, roof: tc });

const gt296: GtOpts = { L: 4.6, wb: 2.6, nose: 0.47, hood: 0.69, tail: 0.9, cowl: [0.26, 0.75], header: [0.42, 1.07], peak: [0.47, 1.09], back: [0.6, 1.085], deck: [0.73, 0.96], fender: 0.76, belt: 0.85, haunch: 0.93, cabin: 0.68, roofW: 0.52, hoodW: 0.5, waist: 0.87, noseR: 0.32, tailR: 0.28, lift: 0.05 };
const gtCorvette: GtOpts = { L: 4.7, wb: 2.72, nose: 0.47, hood: 0.68, tail: 0.85, cowl: [0.265, 0.75], header: [0.44, 1.08], peak: [0.47, 1.1], back: [0.57, 1.095], deck: [0.82, 0.87], fender: 0.74, belt: 0.86, haunch: 0.92, cabin: 0.68, roofW: 0.52, hoodW: 0.52, waist: 0.92, noseR: 0.3, tailR: 0.25, lift: 0.06 };
const gtMclaren: GtOpts = { L: 4.6, wb: 2.67, nose: 0.5, hood: 0.7, tail: 0.86, cowl: [0.205, 0.77], header: [0.375, 1.11], peak: [0.42, 1.12], back: [0.52, 1.115], deck: [0.72, 0.88], fender: 0.76, belt: 0.84, haunch: 0.9, cabin: 0.66, roofW: 0.5, hoodW: 0.5, waist: 0.94, noseR: 0.34, tailR: 0.3, lift: 0.05 };
const gtVantage: GtOpts = { L: 4.55, wb: 2.7, nose: 0.5, hood: 0.76, tail: 0.86, cowl: [0.31, 0.8], header: [0.5, 1.11], peak: [0.55, 1.12], back: [0.62, 1.115], deck: [0.84, 0.87], fender: 0.77, belt: 0.87, haunch: 0.93, cabin: 0.68, roofW: 0.52, hoodW: 0.6, waist: 0.88, noseR: 0.36, tailR: 0.28, lift: 0.08 };
const gtM4: GtOpts = { L: 4.9, W: 2.05, wb: 2.92, nose: 0.59, hood: 0.87, tail: 1.1, cowl: [0.28, 0.94], header: [0.47, 1.33], peak: [0.55, 1.36], back: [0.66, 1.355], deck: [0.83, 1.13], fender: 0.86, belt: 0.98, haunch: 1.02, cabin: 0.72, roofW: 0.58, hoodW: 0.66, waist: 0.94, noseR: 0.25, tailR: 0.22 };
const gtMercedes: GtOpts = { L: 4.75, wb: 2.63, fa: 0.2, nose: 0.55, hood: 0.76, tail: 0.86, cowl: [0.37, 0.8], header: [0.52, 1.14], peak: [0.55, 1.15], back: [0.61, 1.145], deck: [0.79, 0.89], fender: 0.77, belt: 0.88, haunch: 0.92, cabin: 0.66, roofW: 0.5, hoodW: 0.62, waist: 0.89, noseR: 0.3, tailR: 0.3, lift: 0.07 };
const gtFord: GtOpts = { L: 4.85, wb: 2.75, nose: 0.64, hood: 0.88, tail: 1.02, cowl: [0.305, 0.91], header: [0.5, 1.25], peak: [0.52, 1.26], back: [0.6, 1.25], deck: [0.77, 1.07], fender: 0.86, belt: 0.96, haunch: 1.02, cabin: 0.7, roofW: 0.56, hoodW: 0.66, waist: 0.93, noseR: 0.22, tailR: 0.22, lift: 0.04 };
const gtLexus: GtOpts = { L: 4.75, wb: 2.73, nose: 0.65, hood: 0.89, tail: 0.98, cowl: [0.28, 0.93], header: [0.47, 1.29], peak: [0.52, 1.32], back: [0.62, 1.32], deck: [0.86, 1.01], fender: 0.88, belt: 0.97, haunch: 1.02, cabin: 0.72, roofW: 0.57, hoodW: 0.66, waist: 0.97, noseR: 0.25, tailR: 0.25 };
const gtPorsche: GtOpts = { L: 4.62, W: 2.05, wb: 2.46, fa: 0.2, nose: 0.5, hood: 0.72, tail: 0.82, cowl: [0.225, 0.8], header: [0.415, 1.17], peak: [0.47, 1.19], back: [0.56, 1.18], deck: [0.86, 0.87], fender: 0.8, belt: 0.83, haunch: 0.93, cabin: 0.7, roofW: 0.54, hoodW: 0.52, waist: 0.9, noseR: 0.36, tailR: 0.32, lift: 0.07 };

export const shapes: Record<string, Shape> = {
  ferrari: {
    body: proto({ noseH: 0.24, fenderH: 0.86, rearFenderH: 0.91, roofH: 1.04, tc: 0.49, canopyW: 0.43, crestInset: 0.15, valleyZ: 0.5, podH: 0.44, engineH: 0.78 }),
    lights: "blades",
    tail: "bar",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.86, plate: 0.34 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.49),
    rim: "#1c1d20",
    splitter: 0.1,
  },
  toyota: {
    body: proto({ noseH: 0.33, fenderH: 0.88, rearFenderH: 0.94, tc: 0.52, canopyW: 0.52, valleyZ: 0.57, podH: 0.53, engineH: 0.83 }),
    lights: "twin",
    tail: "bar",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.38, span: 1.9, plate: 0.36 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.52),
    rim: "#15171b",
    splitter: 0.1,
  },
  aston: {
    body: proto({
      noseH: 0.42,
      fenderH: 0.86,
      rearFenderH: 0.9,
      roofH: 1.07,
      tc: 0.43,
      canopyW: 0.4,
      crestInset: 0.24,
      valleyZ: 0.46,
      podH: 0.42,
      engineH: 0.86,
    }),
    lights: "pods",
    tail: "bar",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.84, plate: 0.3 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.43),
    rim: "#101213",
    splitter: 0.12,
  },
  cadillac: {
    body: proto({ L: 5.1, wb: 3.148, noseH: 0.3, fenderH: 0.87, rearFenderH: 0.92, tc: 0.5, canopyW: 0.47, crestInset: 0.13, podH: 0.47 }),
    lights: "vertical",
    tail: "vertical",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.88, plate: 0.36 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.5),
    rim: "#1a1b1e",
    splitter: 0.1,
  },
  bmw: {
    body: proto({ L: 5.1, wb: 3.148, noseH: 0.34, fenderH: 0.88, rearFenderH: 0.92, tc: 0.51, canopyW: 0.5 }),
    lights: "kidney",
    tail: "split",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.88, plate: 0.36 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.51),
    rim: "#202226",
    splitter: 0.1,
  },
  genesis: {
    body: proto({ L: 5.1, wb: 3.148, noseH: 0.3, fenderH: 0.88, rearFenderH: 0.93, tc: 0.45, canopyW: 0.5 }),
    lights: "twoline",
    tail: "split",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.88, plate: 0.34 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.45),
    rim: "#1a1b1e",
    splitter: 0.1,
  },
  alpine: {
    body: proto({ L: 5.1, wb: 3.148, noseH: 0.3, fenderH: 0.88, rearFenderH: 0.92, tc: 0.5, canopyW: 0.5 }),
    lights: "triangle",
    tail: "split",
    wing: { style: "swan", t: 0.975, y: 1.08, chord: 0.36, span: 1.88, plate: 0.34 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.5),
    rim: "#15171b",
    splitter: 0.1,
  },
  peugeot: {
    body: proto({ noseH: 0.27, fenderH: 0.85, rearFenderH: 0.94, tc: 0.5, canopyW: 0.47, crestInset: 0.12, podH: 0.43, valleyZ: 0.57, engineH: 0.8 }),
    lights: "claw",
    tail: "claw",
    wing: { style: "swan", t: 0.975, y: 1.07, chord: 0.34, span: 1.84, plate: 0.32 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.5),
    rim: "#16171a",
    splitter: 0.1,
  },
  oreca: {
    body: proto({
      L: 4.75,
      W: 1.9,
      wb: 3.01,
      fa: 0.2,
      noseH: 0.32,
      fenderH: 0.86,
      rearFenderH: 0.9,
      roofH: 1.04,
      tc: 0.48,
      canopyW: 0.48,
    }),
    lights: "vertical",
    tail: "bar",
    wing: { style: "pylon", t: 0.975, y: 1.02, chord: 0.34, span: 1.72, plate: 0.3 },
    fin: true,
    grille: "none",
    cockpit: protoCockpit(0.48),
    rim: "#15171b",
    splitter: 0.08,
  },
  // GT3 cars
  "296": {
    body: gt(gt296),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.26, chord: 0.36, span: 1.84, plate: 0.3 },
    fin: false,
    grille: "wide",
    ...gtGlass(gt296, 0.5, 0.7),
    rim: "#1c1d20",
    splitter: 0.14,
  },
  corvette: {
    body: gt(gtCorvette),
    lights: "slim",
    tail: "split",
    wing: { style: "swan", t: 0.93, y: 1.27, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "wide",
    ...gtGlass(gtCorvette, 0.49, 0.7),
    rim: "#2a2c30",
    splitter: 0.14,
  },
  mclaren: {
    body: gt(gtMclaren),
    lights: "eye",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.24, chord: 0.36, span: 1.84, plate: 0.3 },
    fin: false,
    grille: "low",
    ...gtGlass(gtMclaren, 0.44, 0.68),
    rim: "#1a1b1e",
    splitter: 0.14,
  },
  vantage: {
    body: gt(gtVantage),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.94, y: 1.25, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "aston",
    ...gtGlass(gtVantage, 0.57, 0.76),
    rim: "#1c1d20",
    splitter: 0.14,
  },
  m4: {
    body: gt(gtM4),
    lights: "slim",
    tail: "split",
    wing: { style: "swan", t: 0.94, y: 1.3, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "kidney",
    ...gtGlass(gtM4, 0.56, 0.8),
    rim: "#23262b",
    splitter: 0.14,
  },
  mercedes: {
    body: gt(gtMercedes),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.94, y: 1.26, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "slats",
    ...gtGlass(gtMercedes, 0.585, 0.74),
    rim: "#1c1d20",
    splitter: 0.14,
  },
  ford: {
    body: gt(gtFord),
    lights: "slim",
    tail: "tribar",
    wing: { style: "swan", t: 0.94, y: 1.3, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "mustang",
    ...gtGlass(gtFord, 0.55, 0.74),
    rim: "#23262b",
    splitter: 0.14,
  },
  lexus: {
    body: gt(gtLexus),
    lights: "spindle",
    tail: "split",
    wing: { style: "swan", t: 0.94, y: 1.29, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "spindle",
    ...gtGlass(gtLexus, 0.53, 0.78),
    rim: "#1c1d20",
    splitter: 0.14,
  },
  porsche: {
    body: gt(gtPorsche),
    lights: "round",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.3, chord: 0.4, span: 1.9, plate: 0.32 },
    fin: false,
    grille: "low",
    ...gtGlass(gtPorsche, 0.5, 0.72),
    rim: "#1a1b1e",
    splitter: 0.14,
  },
};

const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const gtOpts: Record<string, GtOpts> = {
  "296": gt296,
  corvette: gtCorvette,
  mclaren: gtMclaren,
  vantage: gtVantage,
  m4: gtM4,
  mercedes: gtMercedes,
  ford: gtFord,
  lexus: gtLexus,
  porsche: gtPorsche,
};

/** Lifts the roof between the windscreen base and the deck, leaving the belt. */
function liftCabin(spec: BodySpec, o: GtOpts): BodySpec {
  if (!o.lift) return spec;
  const amount = (t: number) =>
    o.lift! *
    smoothstep(o.cowl[0], o.header[0], t) *
    (1 - smoothstep(o.back[0], o.deck[0], t));
  const stations = new Set<number>();
  for (let i = 0; i <= 80; i++) stations.add(i / 80);
  for (const key of [o.cowl, o.header, o.peak, o.back, o.deck]) stations.add(key[0]);
  const ts = [...stations].sort((a, b) => a - b);
  const raise = (keys: BodySpec["spineY"]) => {
    const f = monotone(keys);
    return ts.map((t) => [t, f(t) + amount(t)] as [number, number]);
  };
  return { ...spec, spineY: raise(spec.spineY), tubY: raise(spec.tubY) };
}

// Bend each study toward the measured outline of its exterior reference.
for (const [id, shape] of Object.entries(shapes)) {
  const outline = bodyOutlines[id];
  if (outline) shape.body = fitBody(shape.body, outline);
  if (gtOpts[id]) shape.body = liftCabin(shape.body, gtOpts[id]);
}
