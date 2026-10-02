import * as THREE from "three";
import type { Car } from "../data/cars.ts";
import type { Entry, Livery } from "../data/entries.ts";
import { classPanel, surname } from "../data/entries.ts";
import type { Shape } from "./shapes.ts";
import { glazingPanels } from "./glazing.ts";

const W = 2048;
const H = 1024;
const BH = H / 2;

export type PaintMode = "livery" | "carbon" | "clay";

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
export function inkOn(hex: string) {
  return luminance(hex) > 0.45 ? "#101216" : "#ffffff";
}

type Ctx = CanvasRenderingContext2D;

// Draws in car coordinates: t (0 nose → 1 tail) and v (0 floor → 1 spine), for one side of the car.
class Side {
  ctx: Ctx;
  flip: boolean;
  top: number;
  constructor(ctx: Ctx, side: -1 | 1) {
    this.ctx = ctx;
    this.flip = side > 0;
    this.top = side > 0 ? BH : 0;
  }
  px(t: number) {
    return (this.flip ? 1 - t : t) * W;
  }
  py(v: number) {
    return this.top + (1 - v) * BH;
  }
  poly(points: [number, number][], fill: string | CanvasGradient) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([t, v], i) =>
      i ? c.lineTo(this.px(t), this.py(v)) : c.moveTo(this.px(t), this.py(v)),
    );
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  rect(
    t0: number,
    v0: number,
    t1: number,
    v1: number,
    fill: string | CanvasGradient,
  ) {
    this.poly(
      [
        [t0, v0],
        [t1, v0],
        [t1, v1],
        [t0, v1],
      ],
      fill,
    );
  }
  round(
    t0: number,
    v0: number,
    t1: number,
    v1: number,
    r: number,
    fill: string,
  ) {
    const c = this.ctx;
    const x0 = Math.min(this.px(t0), this.px(t1)),
      x1 = Math.max(this.px(t0), this.px(t1));
    const y0 = Math.min(this.py(v0), this.py(v1)),
      y1 = Math.max(this.py(v0), this.py(v1));
    c.beginPath();
    c.roundRect(x0, y0, x1 - x0, y1 - y0, r);
    c.fillStyle = fill;
    c.fill();
  }
  text(
    s: string,
    t: number,
    v: number,
    size: number,
    color: string,
    opts: {
      weight?: number;
      align?: CanvasTextAlign;
      font?: string;
      stretch?: number;
      italic?: boolean;
    } = {},
  ) {
    const c = this.ctx;
    c.save();
    c.translate(this.px(t), this.py(v));
    c.scale(opts.stretch ?? 1, 1);
    c.font = `${opts.italic ? "italic " : ""}${opts.weight ?? 800} ${size}px ${opts.font ?? "'Barlow Condensed', 'Arial Narrow', sans-serif"}`;
    c.fillStyle = color;
    c.textAlign = opts.align ?? "center";
    c.textBaseline = "middle";
    c.fillText(s, 0, 0);
    c.restore();
  }
  clip() {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, this.top, W, BH);
    this.ctx.clip();
  }
}

function pattern(s: Side, l: Livery, shape: Shape, gtCar: boolean) {
  const { second, accent } = l;
  const tc = shape.cockpit.roof;
  switch (l.pattern) {
    case "stripe":
      s.rect(0, 0.93, 1, 1.01, accent);
      s.rect(0, 0.425, 1, 0.445, accent);
      s.rect(0, 0.2, 1, 0.3, second);
      break;
    case "split": {
      s.poly(
        [
          [0, 0.2],
          [0, 0.42],
          [0.35, 0.46],
          [0.7, 0.56],
          [1, 0.62],
          [1, 0.2],
        ],
        second,
      );
      s.poly(
        [
          [0, 0.42],
          [0.35, 0.46],
          [0.7, 0.56],
          [1, 0.62],
          [1, 0.645],
          [0.7, 0.585],
          [0.35, 0.485],
          [0, 0.445],
        ],
        accent,
      );
      break;
    }
    case "fade": {
      const g = s.ctx.createLinearGradient(s.px(0.25), 0, s.px(0.85), 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, second);
      s.rect(0, 0.2, 1, 1.01, g as CanvasGradient);
      for (let i = 0; i < 3; i++)
        s.rect(0.05 + i * 0.012, 0.3, 0.056 + i * 0.012, 0.6, accent);
      s.rect(0.62, 0.36, 0.98, 0.375, accent);
      break;
    }
    case "slash":
      s.poly(
        [
          [tc + 0.02, 0.2],
          [tc + 0.14, 0.2],
          [tc + 0.34, 1.01],
          [tc + 0.22, 1.01],
        ],
        second,
      );
      s.poly(
        [
          [tc + 0.15, 0.2],
          [tc + 0.17, 0.2],
          [tc + 0.37, 1.01],
          [tc + 0.35, 1.01],
        ],
        accent,
      );
      s.rect(0, 0.2, 1, 0.27, second);
      break;
    case "mstripes": {
      const cols = ["#2a8be0", "#3b2a7a", "#e2231a"];
      cols.forEach((c, i) => {
        const o = i * 0.028;
        s.poly(
          [
            [0.08 + o, 0.2],
            [0.1 + o, 0.2],
            [0.2 + o, 1.01],
            [0.18 + o, 1.01],
          ],
          c,
        );
        s.rect(0.6, 0.94 - i * 0.025, 1, 0.96 - i * 0.025, c);
      });
      s.rect(0, 0.2, 1, 0.26, second);
      break;
    }
    case "claw":
      for (let i = 0; i < 3; i++) {
        const o = i * 0.03;
        s.poly(
          [
            [0.74 + o, 0.3],
            [0.755 + o, 0.3],
            [0.79 + o, 0.62],
            [0.775 + o, 0.62],
          ],
          accent,
        );
      }
      s.rect(0, 0.2, 1, 0.3, second);
      s.rect(0.1, 0.6, 0.35, 0.615, accent);
      break;
    case "shards":
      s.poly(
        [
          [0.15, 0.2],
          [0.45, 0.2],
          [0.3, 0.62],
        ],
        second,
      );
      s.poly(
        [
          [0.55, 0.2],
          [0.95, 0.2],
          [0.85, 0.7],
        ],
        second,
      );
      s.poly(
        [
          [0.42, 0.2],
          [0.47, 0.2],
          [0.36, 0.55],
        ],
        accent,
      );
      s.poly(
        [
          [0.82, 0.2],
          [0.86, 0.2],
          [0.8, 0.58],
        ],
        accent,
      );
      break;
    case "wave": {
      const c = s.ctx;
      const draw = (off: number, fill: string) => {
        c.beginPath();
        c.moveTo(s.px(0), s.py(0.2));
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          c.lineTo(
            s.px(t),
            s.py(0.4 + off + Math.sin(t * Math.PI * 3.2) * 0.09),
          );
        }
        c.lineTo(s.px(1), s.py(0.2));
        c.closePath();
        c.fillStyle = fill;
        c.fill();
      };
      draw(0.03, accent);
      draw(0, second);
      break;
    }
    case "chevron":
      for (let i = 0; i < 4; i++) {
        const t = 0.62 + i * 0.07;
        s.poly(
          [
            [t, 0.2],
            [t + 0.03, 0.2],
            [t - 0.02, 0.45],
            [t + 0.03, 0.7],
            [t, 0.7],
            [t - 0.05, 0.45],
          ],
          i === 0 ? accent : second,
        );
      }
      s.rect(0, 0.2, 0.6, 0.26, second);
      break;
    default:
      break;
  }
  if (gtCar) s.rect(0, 0.2, 1, 0.245, "#15171b");
}

function windows(s: Side, shape: Shape) {
  // Dark edge underneath the glazing; alpha openings remove the shell itself.
  for (const panel of glazingPanels(shape)) s.poly(panel, "#0a1116");
}

function numberPanels(
  s: Side,
  entry: Entry,
  car: Car,
  shape: Shape,
  gtCar: boolean,
) {
  const panel = classPanel[car.category];
  const tc = shape.cockpit.roof;
  const n = entry.number;
  if (gtCar) {
    const t0 = shape.cockpit.from + 0.07,
      t1 = t0 + 0.11;
    s.round(t0, 0.27, t1, 0.43, 16, panel);
    s.text(n, (t0 + t1) / 2, 0.35, n.length > 2 ? 58 : 70, "#fff", {
      weight: 800,
      italic: true,
    });
  } else {
    const t0 = tc + 0.15,
      t1 = t0 + 0.1;
    s.round(t0, 0.47, t1, 0.66, 14, panel);
    s.text(n, (t0 + t1) / 2, 0.565, n.length > 2 ? 54 : 66, "#fff", {
      weight: 800,
      italic: true,
    });
    s.round(0.09, 0.56, 0.16, 0.62, 8, panel);
    s.text(n, 0.125, 0.59, 26, "#fff", { weight: 800, italic: true });
  }
}

function lettering(
  s: Side,
  entry: Entry,
  car: Car,
  shape: Shape,
  gtCar: boolean,
  base: string,
) {
  const ink = inkOn(base);
  const { from, to } = shape.cockpit;
  if (gtCar) {
    s.text(car.make.toUpperCase(), 0.72, 0.36, 44, ink, {
      weight: 800,
      stretch: 0.9,
    });
    s.text(entry.team.toUpperCase(), 0.3, 0.33, 22, ink, { weight: 700 });
  } else {
    s.text(car.make.toUpperCase(), 0.14 + 0.02, 0.33, 34, ink, {
      weight: 800,
      stretch: 0.9,
    });
    s.text(entry.team.toUpperCase(), 0.8, 0.33, 22, ink, { weight: 700 });
  }
  // Driver names below the side window, as on the real cars.
  const names = entry.drivers.map(surname).join("  ·  ").toUpperCase();
  s.text(names, (from + to) / 2 + 0.02, 0.705, 15, ink, {
    weight: 700,
    font: "'DM Sans', Arial, sans-serif",
  });
  // Tyre supplier on the lower flank.
  s.text(car.tyres.toUpperCase(), gtCar ? 0.5 : 0.62, 0.25, 18, "#e8e8e8", {
    weight: 800,
  });
}

export type LiveryCanvases = {
  map: HTMLCanvasElement;
  emissive: HTMLCanvasElement;
  rough: HTMLCanvasElement;
  openings: HTMLCanvasElement;
};

export function paintLivery(
  car: Car,
  shape: Shape,
  entry: Entry,
  mode: PaintMode,
): LiveryCanvases {
  const map = document.createElement("canvas");
  map.width = W;
  map.height = H;
  const emissive = document.createElement("canvas");
  emissive.width = W;
  emissive.height = H;
  const openings = document.createElement("canvas");
  openings.width = W;
  openings.height = H;
  const actx = openings.getContext("2d")!;
  actx.fillStyle = "#ffffff";
  actx.fillRect(0, 0, W, H);
  for (const side of [-1, 1] as const) {
    const aperture = new Side(actx, side);
    for (const panel of glazingPanels(shape)) aperture.poly(panel, "#000000");
  }
  const rough = document.createElement("canvas");
  rough.width = W / 4;
  rough.height = H / 4;
  const ctx = map.getContext("2d")!;
  const ectx = emissive.getContext("2d")!;
  const rctx = rough.getContext("2d")!;
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, W, H);
  // Roughness (green channel): paint is glossy, carbon is satin.
  rctx.fillStyle =
    mode === "clay" ? "#d0d0d0" : mode === "carbon" ? "#8d8d8d" : "#686868";
  rctx.fillRect(0, 0, rough.width, rough.height);
  rctx.fillStyle = "#8a8a8a";
  const rb = rough.height / 2;
  rctx.fillRect(0, 0.78 * rb, rough.width, 0.22 * rb);
  rctx.fillRect(0, rb + 0.78 * rb, rough.width, 0.22 * rb);

  const gtCar = car.category === "LMGT3";
  const base =
    mode === "carbon"
      ? "#23272d"
      : mode === "clay"
        ? "#d9dbe0"
        : entry.livery.base;
  for (const side of [-1, 1] as const) {
    const s = new Side(ctx, side);
    s.clip();
    ctx.fillStyle = base;
    ctx.fillRect(0, s.top, W, BH);
    if (mode === "carbon") {
      // Small alternating diagonal bundles read as twill, without moire-heavy
      // full-length stripes or a metallic appearance.
      const tile = document.createElement("canvas");
      tile.width = tile.height = 24;
      const fibre = tile.getContext("2d")!;
      fibre.fillStyle = "#242a2e";
      fibre.fillRect(0, 0, 24, 24);
      for (let y = 0; y < 24; y += 6)
        for (let x = 0; x < 24; x += 6) {
          fibre.fillStyle = ((x + y) / 6) % 4 < 2 ? "#343a3d" : "#181e22";
          fibre.fillRect(x, y, 6, 6);
          fibre.fillStyle = "rgba(160,171,178,.12)";
          for (let line = 1; line < 6; line += 2)
            fibre.fillRect(x + line, y, 0.7, 6);
        }
      const weave = ctx.createPattern(tile, "repeat")!;
      weave.setTransform(new DOMMatrix().rotate(35));
      ctx.fillStyle = weave;
      ctx.fillRect(0, s.top, W, BH);
    }
    if (mode === "livery") pattern(s, entry.livery, shape, gtCar);
    // Floor, wheel wells and lower sill.
    s.rect(0, -0.01, 1, 0.2, "#14161a");
    s.rect(0, 0.2, 1, gtCar ? 0.215 : 0.235, "#1b1e23");
    windows(s, shape);
    if (mode === "livery") {
      numberPanels(s, entry, car, shape, gtCar);
      lettering(s, entry, car, shape, gtCar, base);
    } else if (mode === "carbon") {
      s.text(
        `${car.make} ${car.name}`.toUpperCase(),
        0.62,
        0.36,
        30,
        "#9aa3ad",
        { weight: 700 },
      );
    }
    ctx.restore();
    const e = new Side(ectx, side);
    e.clip();
    if (mode === "livery") {
      // Illuminated number panels, as used for night running.
      const tc = shape.cockpit.roof;
      if (gtCar)
        e.round(
          shape.cockpit.from + 0.07,
          0.27,
          shape.cockpit.from + 0.18,
          0.43,
          16,
          "#3a2a1a",
        );
      else e.round(tc + 0.15, 0.47, tc + 0.25, 0.66, 14, "#3a1f24");
    }
    ectx.restore();
  }
  return { map, emissive, rough, openings };
}

export function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
