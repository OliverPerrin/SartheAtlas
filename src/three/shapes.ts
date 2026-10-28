import type { BodySpec } from "./body.ts";
import { bodyOutlines } from "../data/bodyOutlines.ts";
import { fitBody } from "./bodyFit.ts";

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
  noseH?: number;
  hoodH?: number;
  beltH?: number;
  roofH?: number;
  ws?: number;
  roofStart?: number;
  roofEnd?: number;
  rearEnd?: number;
  deckH?: number;
  tailH?: number;
  cabinW?: number;
};

function gt(o: GtOpts = {}): BodySpec {
  const L = o.L ?? 4.65,
    W = o.W ?? 2.04,
    fa = o.fa ?? 0.19,
    wb = o.wb ?? 2.72;
  const tf = fa,
    tr = fa + wb / L;
  const noseH = (o.noseH ?? 0.5) - 0.07,
    hoodH = o.hoodH ?? 0.76,
    beltH = o.beltH ?? 0.86,
    roofH = o.roofH ?? 1.24,
    ws = o.ws ?? 0.4,
    rs = o.roofStart ?? 0.5,
    re = o.roofEnd ?? 0.66,
    rend = o.rearEnd ?? 0.82,
    deckH = o.deckH ?? 0.95,
    tailH = o.tailH ?? 0.95,
    cw = o.cabinW ?? 0.64;
  const h = W / 2;
  return {
    kind: "gt",
    length: L,
    width: W,
    frontAxle: fa,
    wheelbase: wb,
    wheelR: 0.35,
    tyreW: 0.31,
    archGap: 0.05,
    tailCap: "paint",
    floorY: [
      [0, 0.13],
      [0.06, 0.09],
      [1, 0.1],
    ],
    outerZ: [
      [0, h * 0.8],
      [0.04, h * 0.93],
      [tf, h],
      [(tf + tr) / 2, h * 0.965],
      [tr, h],
      [0.96, h * 0.95],
      [1, h * 0.88],
    ],
    shoulderY: [
      [0, 0.26],
      [0.05, 0.4],
      [tf, 0.74],
      [(tf + tr) / 2, 0.58],
      [tr, 0.76],
      [1, tailH - 0.22],
    ],
    crestY: [
      [0, noseH - 0.05],
      [0.05, noseH + 0.12],
      [tf, hoodH + 0.08],
      [ws, beltH],
      [tr, beltH + 0.07],
      [0.95, tailH],
      [1, tailH - 0.08],
    ],
    crestZ: [
      [0, h - 0.26],
      [tf, h - 0.16],
      [(tf + tr) / 2, h - 0.17],
      [tr, h - 0.13],
      [1, h - 0.26],
    ],
    valleyY: [
      [0, noseH],
      [0.06, noseH + 0.08],
      [tf, hoodH - 0.04],
      [ws, beltH - 0.01],
      [tr, deckH - 0.03],
      [1, tailH - 0.02],
    ],
    valleyZ: [
      [0, 0.6],
      [tf, 0.64],
      [ws, 0.78],
      [re, 0.8],
      [1, 0.62],
    ],
    tubY: [
      [0, noseH],
      [tf, hoodH + 0.01],
      [ws, beltH + 0.02],
      [rs, roofH - 0.06],
      [re, roofH - 0.08],
      [rend, deckH + 0.02],
      [1, tailH],
    ],
    tubZ: [
      [0, 0.5],
      [ws, 0.64],
      [rs, cw],
      [re, cw],
      [rend, 0.6],
      [1, 0.5],
    ],
    spineY: [
      [0, noseH + 0.01],
      [tf, hoodH + 0.05],
      [ws, beltH + 0.03],
      [rs, roofH],
      [re, roofH - 0.02],
      [rend, deckH + 0.04],
      [1, tailH],
    ],
  };
}

const protoCockpit = (tc = 0.47) => ({ from: tc - 0.16, to: tc + 0.1, roof: tc });

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
    body: gt({ L: 4.6, wb: 2.6, ws: 0.28, roofStart: 0.4, roofEnd: 0.52, rearEnd: 0.8, roofH: 1.21, hoodH: 0.72, deckH: 0.95, noseH: 0.46, cabinW: 0.6 }),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.26, chord: 0.36, span: 1.84, plate: 0.3 },
    fin: false,
    grille: "wide",
    cockpit: { from: 0.28, to: 0.55, roof: 0.44 },
    rim: "#1c1d20",
    splitter: 0.14,
  },
  corvette: {
    body: gt({ L: 4.7, wb: 2.72, ws: 0.3, roofStart: 0.43, roofEnd: 0.57, rearEnd: 0.78, roofH: 1.22, hoodH: 0.74, deckH: 0.97, noseH: 0.48, cabinW: 0.6 }),
    lights: "slim",
    tail: "split",
    wing: { style: "swan", t: 0.93, y: 1.27, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "wide",
    cockpit: { from: 0.3, to: 0.63, roof: 0.49 },
    rim: "#2a2c30",
    splitter: 0.14,
  },
  mclaren: {
    body: gt({ L: 4.6, wb: 2.67, ws: 0.27, roofStart: 0.4, roofEnd: 0.5, rearEnd: 0.8, roofH: 1.18, hoodH: 0.68, deckH: 0.93, noseH: 0.44, cabinW: 0.56 }),
    lights: "eye",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.24, chord: 0.36, span: 1.84, plate: 0.3 },
    fin: false,
    grille: "low",
    cockpit: { from: 0.27, to: 0.53, roof: 0.44 },
    rim: "#1a1b1e",
    splitter: 0.14,
  },
  vantage: {
    body: gt({ L: 4.55, wb: 2.7, ws: 0.33, roofStart: 0.48, roofEnd: 0.65, rearEnd: 0.8, roofH: 1.24, hoodH: 0.76, deckH: 0.95, noseH: 0.52 }),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.94, y: 1.25, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "aston",
    cockpit: { from: 0.33, to: 0.71, roof: 0.55 },
    rim: "#1c1d20",
    splitter: 0.14,
  },
  m4: {
    body: gt({ L: 4.9, W: 2.05, wb: 2.92, ws: 0.33, roofStart: 0.48, roofEnd: 0.68, rearEnd: 0.83, roofH: 1.29, hoodH: 0.8, beltH: 0.9, deckH: 0.98, noseH: 0.56, tailH: 1.0, cabinW: 0.68 }),
    lights: "slim",
    tail: "split",
    wing: { style: "swan", t: 0.94, y: 1.3, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "kidney",
    cockpit: { from: 0.33, to: 0.74, roof: 0.57 },
    rim: "#23262b",
    splitter: 0.14,
  },
  mercedes: {
    body: gt({ L: 4.75, wb: 2.63, fa: 0.2, ws: 0.35, roofStart: 0.5, roofEnd: 0.63, rearEnd: 0.78, roofH: 1.24, hoodH: 0.76, deckH: 0.95, noseH: 0.5 }),
    lights: "slim",
    tail: "bar",
    wing: { style: "swan", t: 0.94, y: 1.26, chord: 0.36, span: 1.86, plate: 0.3 },
    fin: false,
    grille: "slats",
    cockpit: { from: 0.35, to: 0.69, roof: 0.55 },
    rim: "#1c1d20",
    splitter: 0.14,
  },
  ford: {
    body: gt({ L: 4.85, wb: 2.75, ws: 0.33, roofStart: 0.48, roofEnd: 0.6, rearEnd: 0.75, roofH: 1.26, hoodH: 0.82, beltH: 0.9, deckH: 0.97, noseH: 0.56, tailH: 1.0 }),
    lights: "slim",
    tail: "tribar",
    wing: { style: "swan", t: 0.94, y: 1.3, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "mustang",
    cockpit: { from: 0.33, to: 0.66, roof: 0.53 },
    rim: "#23262b",
    splitter: 0.14,
  },
  lexus: {
    body: gt({ L: 4.75, wb: 2.73, ws: 0.33, roofStart: 0.48, roofEnd: 0.65, rearEnd: 0.83, roofH: 1.26, hoodH: 0.78, beltH: 0.89, deckH: 0.97, noseH: 0.54, tailH: 0.99 }),
    lights: "spindle",
    tail: "split",
    wing: { style: "swan", t: 0.94, y: 1.29, chord: 0.38, span: 1.9, plate: 0.3 },
    fin: false,
    grille: "spindle",
    cockpit: { from: 0.33, to: 0.71, roof: 0.55 },
    rim: "#1c1d20",
    splitter: 0.14,
  },
  porsche: {
    body: gt({ L: 4.62, W: 2.05, wb: 2.46, fa: 0.2, ws: 0.3, roofStart: 0.43, roofEnd: 0.57, rearEnd: 0.78, roofH: 1.26, hoodH: 0.7, beltH: 0.84, deckH: 0.93, noseH: 0.48, tailH: 0.94, cabinW: 0.62 }),
    lights: "round",
    tail: "bar",
    wing: { style: "swan", t: 0.93, y: 1.3, chord: 0.4, span: 1.9, plate: 0.32 },
    fin: false,
    grille: "low",
    cockpit: { from: 0.3, to: 0.63, roof: 0.49 },
    rim: "#1a1b1e",
    splitter: 0.14,
  },
};

// Bend each study toward the measured outline of its exterior reference.
for (const [id, shape] of Object.entries(shapes)) {
  const outline = bodyOutlines[id];
  if (outline) shape.body = fitBody(shape.body, outline);
}
