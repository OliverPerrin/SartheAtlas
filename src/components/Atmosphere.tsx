import { useEffect, useRef } from "react";
import type { Phase } from "../data/racePhase.ts";

/**
 * A live light layer drawn over photographs: sun bloom, rays and drifting dust
 * by day; a low sun at dusk; stars, out-of-focus track lights and headlight
 * trails at night; mist and a rising sun at dawn. Changing `phase` cross-fades
 * every element, so the time of day moves rather than cuts.
 */

type RGB = [number, number, number];
type Look = {
  sunX: number;
  sunY: number;
  sunSize: number;
  sun: number;
  sunColor: RGB;
  rays: number;
  moon: number;
  stars: number;
  dust: number;
  dustColor: RGB;
  bokeh: number;
  trails: number;
  mist: number;
  mistColor: RGB;
  wash: RGB;
  washAlpha: number;
};

const looks: Record<Phase, Look> = {
  day: {
    sunX: 0.8, sunY: 0.1, sunSize: 0.5, sun: 0.75, sunColor: [255, 244, 214],
    rays: 0.35, moon: 0, stars: 0, dust: 1, dustColor: [255, 236, 200],
    bokeh: 0, trails: 0, mist: 0, mistColor: [255, 220, 200],
    wash: [255, 214, 150], washAlpha: 0.1,
  },
  dusk: {
    sunX: 0.7, sunY: 0.46, sunSize: 0.78, sun: 1, sunColor: [255, 150, 62],
    rays: 1, moon: 0, stars: 0.12, dust: 0.8, dustColor: [255, 190, 120],
    bokeh: 0.3, trails: 0.3, mist: 0.2, mistColor: [255, 130, 80],
    wash: [255, 92, 40], washAlpha: 0.24,
  },
  night: {
    sunX: 0.22, sunY: 0.12, sunSize: 0.2, sun: 0, sunColor: [190, 210, 255],
    rays: 0, moon: 1, stars: 1, dust: 0.25, dustColor: [170, 200, 255],
    bokeh: 1, trails: 1, mist: 0.12, mistColor: [70, 110, 255],
    wash: [24, 52, 150], washAlpha: 0.16,
  },
  dawn: {
    sunX: 0.24, sunY: 0.5, sunSize: 0.6, sun: 0.7, sunColor: [255, 178, 170],
    rays: 0.5, moon: 0.25, stars: 0.2, dust: 0.3, dustColor: [255, 214, 220],
    bokeh: 0.25, trails: 0.2, mist: 1, mistColor: [255, 170, 190],
    wash: [120, 150, 255], washAlpha: 0.13,
  },
};

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixRGB = (a: RGB, b: RGB, k: number): RGB => [
  mix(a[0], b[0], k),
  mix(a[1], b[1], k),
  mix(a[2], b[2], k),
];
const rgba = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, a).toFixed(3)})`;

/** Small deterministic generator, so stars and lights sit still between frames. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function glowSprite(color: RGB, hardness = 0.12) {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(hardness, rgba(color, 0.7));
  g.addColorStop(0.45, rgba(color, 0.16));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  return canvas;
}

type Trail = { path: number; t: number; speed: number; red: boolean; lane: number };

export default function Atmosphere({
  phase,
  className = "",
  strength = 1,
  layers = "all",
}: {
  phase: Phase;
  className?: string;
  strength?: number;
  /** "sky" keeps the sun, moon, stars and haze, and drops ground-level lights. */
  layers?: "all" | "sky";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    phaseRef.current = phase;
    wake.current();
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites = {
      white: glowSprite([255, 255, 255]),
      warm: glowSprite([255, 196, 120], 0.2),
      amber: glowSprite([255, 150, 60], 0.2),
      blue: glowSprite([140, 180, 255], 0.2),
      red: glowSprite([255, 50, 60], 0.2),
    };
    const random = seeded(24);
    const stars = Array.from({ length: 90 }, () => ({
      x: random(),
      y: random() * 0.5,
      size: 0.5 + random() * 1.3,
      rate: 0.6 + random() * 2.4,
      offset: random() * 6.28,
    }));
    const bokeh = Array.from({ length: 22 }, () => ({
      x: random(),
      y: 0.42 + random() * 0.5,
      size: 14 + random() * 46,
      rate: 0.2 + random() * 0.9,
      offset: random() * 6.28,
      sprite: (["warm", "amber", "blue", "white", "red"] as const)[
        Math.floor(random() * 5)
      ],
    }));
    const dust = Array.from({ length: 70 }, () => ({
      x: random(),
      y: random(),
      z: 0.3 + random() * 0.7,
      drift: random() * 6.28,
    }));
    // Two sweeping curves across the lower frame, like a corner seen from the bank.
    const paths: [number, number][][] = [
      [[-0.1, 0.78], [0.38, 0.6], [1.1, 0.86]],
      [[1.1, 0.7], [0.55, 0.98], [-0.1, 0.9]],
    ];
    const trails: Trail[] = [];
    let nextTrail = 0.4;
    const look: Look = { ...looks[phaseRef.current] };
    let width = 0,
      height = 0,
      dpr = 1,
      frame = 0,
      previous = 0,
      time = 0,
      visible = false;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const bezier = (path: [number, number][], t: number): [number, number] => {
      const u = 1 - t;
      return [
        (u * u * path[0][0] + 2 * u * t * path[1][0] + t * t * path[2][0]) * width,
        (u * u * path[0][1] + 2 * u * t * path[1][1] + t * t * path[2][1]) * height,
      ];
    };

    const draw = (dt: number) => {
      const goal = looks[phaseRef.current];
      const k = still ? 1 : 1 - Math.exp(-dt * 1.7);
      for (const key of Object.keys(goal) as (keyof Look)[]) {
        const from = look[key],
          to = goal[key];
        if (typeof from === "number" && typeof to === "number") {
          (look[key] as number) = mix(from, to, k);
        } else {
          (look[key] as RGB) = mixRGB(from as RGB, to as RGB, k);
        }
      }
      pointer.x = mix(pointer.x, pointer.tx, Math.min(1, dt * 3));
      pointer.y = mix(pointer.y, pointer.ty, Math.min(1, dt * 3));
      const px = (pointer.x - 0.5) * 0.05,
        py = (pointer.y - 0.5) * 0.04;
      const unit = Math.min(width, height);

      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, width, height);
      c.globalCompositeOperation = "lighter";
      const a = strength;

      // Sky wash: colours the upper frame with the hour.
      if (look.washAlpha > 0.005) {
        const g = c.createLinearGradient(0, 0, 0, height * 0.9);
        g.addColorStop(0, rgba(look.wash, look.washAlpha * a));
        g.addColorStop(1, rgba(look.wash, 0));
        c.fillStyle = g;
        c.fillRect(0, 0, width, height);
      }

      // Stars, upper frame only.
      if (look.stars > 0.02) {
        c.fillStyle = "#fff";
        for (const star of stars) {
          const twinkle = 0.55 + 0.45 * Math.sin(time * star.rate + star.offset);
          c.globalAlpha = look.stars * twinkle * (1 - star.y * 1.7) * 0.9 * a;
          c.fillRect(star.x * width, star.y * height, star.size, star.size);
        }
        c.globalAlpha = 1;
      }

      // Sun: bloom, slow rays and a string of lens ghosts toward frame centre.
      // Over the aerial view the sun stays up at the horizon.
      const sx = (look.sunX - px) * width,
        sy =
          ((layers === "sky" ? Math.min(look.sunY, 0.09) : look.sunY) - py) *
          height;
      if (look.sun > 0.01) {
        const radius = look.sunSize * unit;
        const g = c.createRadialGradient(sx, sy, 0, sx, sy, radius);
        g.addColorStop(0, rgba(look.sunColor, 0.95 * look.sun * a));
        g.addColorStop(0.07, rgba(look.sunColor, 0.6 * look.sun * a));
        g.addColorStop(0.3, rgba(look.sunColor, 0.16 * look.sun * a));
        g.addColorStop(1, rgba(look.sunColor, 0));
        c.fillStyle = g;
        c.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
        if (look.rays > 0.02) {
          const count = 14;
          const reach = Math.hypot(width, height);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + time * 0.035;
            const spread = 0.035 + 0.03 * Math.sin(i * 12.9898 + time * 0.2);
            const ray = c.createLinearGradient(
              sx,
              sy,
              sx + Math.cos(angle) * reach * 0.7,
              sy + Math.sin(angle) * reach * 0.7,
            );
            const alpha =
              (0.05 + 0.04 * Math.sin(i * 4.1 + time * 0.5)) * look.rays * look.sun * a;
            ray.addColorStop(0, rgba(look.sunColor, alpha));
            ray.addColorStop(1, rgba(look.sunColor, 0));
            c.fillStyle = ray;
            c.beginPath();
            c.moveTo(sx, sy);
            c.lineTo(
              sx + Math.cos(angle - spread) * reach,
              sy + Math.sin(angle - spread) * reach,
            );
            c.lineTo(
              sx + Math.cos(angle + spread) * reach,
              sy + Math.sin(angle + spread) * reach,
            );
            c.closePath();
            c.fill();
          }
        }
        const cx = width / 2,
          cy = height / 2;
        for (const [at, size, alpha] of [
          [0.35, 0.05, 0.1],
          [0.62, 0.09, 0.06],
          [1.25, 0.14, 0.05],
          [1.6, 0.04, 0.09],
        ]) {
          const gx = sx + (cx - sx) * at * 1.6,
            gy = sy + (cy - sy) * at * 1.6;
          c.globalAlpha = alpha * look.sun * a;
          const d = size * unit * 2;
          c.drawImage(sprites.warm, gx - d / 2, gy - d / 2, d, d);
        }
        c.globalAlpha = 1;
      }

      // Moon: a small cold disc with a halo.
      if (look.moon > 0.02) {
        const mx = ((layers === "sky" ? 0.66 : 0.2) - px * 0.5) * width,
          my = ((layers === "sky" ? 0.07 : 0.16) - py * 0.5) * height,
          r = unit * 0.022;
        c.globalAlpha = 0.5 * look.moon * a;
        c.drawImage(sprites.blue, mx - r * 9, my - r * 9, r * 18, r * 18);
        c.globalAlpha = look.moon * a;
        c.fillStyle = "#eef3ff";
        c.beginPath();
        c.arc(mx, my, r, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }

      // Mist: wide soft bands that slide past each other.
      if (look.mist > 0.02) {
        for (let i = 0; i < 3; i++) {
          const y = height * (0.5 + i * 0.14 + 0.02 * Math.sin(time * 0.2 + i));
          const shift = Math.sin(time * (0.05 + i * 0.02) + i * 2) * width * 0.2;
          const g = c.createRadialGradient(
            width / 2 + shift, y, 0,
            width / 2 + shift, y, width * 0.75,
          );
          g.addColorStop(0, rgba(look.mistColor, 0.13 * look.mist * a));
          g.addColorStop(1, rgba(look.mistColor, 0));
          c.fillStyle = g;
          c.save();
          c.translate(0, y);
          c.scale(1, 0.16);
          c.translate(0, -y);
          c.fillRect(-width, y - width, width * 3, width * 2);
          c.restore();
        }
      }

      // Out-of-focus trackside lights.
      if (look.bokeh > 0.02 && layers === "all") {
        for (const light of bokeh) {
          const flicker = 0.6 + 0.4 * Math.sin(time * light.rate + light.offset);
          c.globalAlpha = 0.2 * look.bokeh * flicker * a;
          const d = light.size * 2 * (unit / 800 + 0.4);
          c.drawImage(
            sprites[light.sprite],
            (light.x - px * 1.5) * width - d / 2,
            (light.y - py * 1.5) * height - d / 2,
            d,
            d,
          );
        }
        c.globalAlpha = 1;
      }

      // Dust in the light: slow diagonal drift with depth.
      if (look.dust > 0.02 && layers === "all") {
        const dustSprite = look.dustColor[2] > look.dustColor[0] ? sprites.blue : sprites.warm;
        for (const mote of dust) {
          if (!still) {
            mote.x += dt * 0.012 * mote.z;
            mote.y -= dt * (0.006 + 0.004 * Math.sin(time * 0.6 + mote.drift)) * mote.z;
            if (mote.x > 1.05) mote.x = -0.05;
            if (mote.y < -0.05) mote.y = 1.05;
          }
          const d = (2 + mote.z * 7) * (unit / 900 + 0.5);
          c.globalAlpha =
            (0.12 + 0.3 * mote.z) *
            look.dust *
            (0.6 + 0.4 * Math.sin(time * 1.3 + mote.drift)) *
            a;
          c.drawImage(
            dustSprite,
            (mote.x - px * mote.z * 2) * width,
            (mote.y - py * mote.z * 2) * height,
            d,
            d,
          );
        }
        c.globalAlpha = 1;
      }

      // Headlight and tail-light trails: long exposures sweeping the corner.
      if (!still) {
        nextTrail -= dt * look.trails;
        if (
          layers === "all" &&
          look.trails > 0.05 &&
          nextTrail <= 0 &&
          trails.length < 9
        ) {
          const path = Math.random() < 0.6 ? 0 : 1;
          trails.push({
            path,
            t: 0,
            speed: 0.2 + Math.random() * 0.16,
            red: path === 1,
            lane: (Math.random() - 0.5) * 0.03,
          });
          nextTrail = 0.35 + Math.random() * 1.2;
        }
      }
      c.lineCap = "round";
      for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        trail.t += dt * trail.speed;
        if (trail.t > 1.35) {
          trails.splice(i, 1);
          continue;
        }
        const tailLength = 0.32;
        const steps = 18;
        const fade = Math.min(1, look.trails * 1.4) * a;
        for (let s = 0; s < steps; s++) {
          const t0 = trail.t - (tailLength * (s + 1)) / steps,
            t1 = trail.t - (tailLength * s) / steps;
          if (t1 < 0 || t0 > 1) continue;
          const [x0, y0] = bezier(paths[trail.path], Math.max(0, t0));
          const [x1, y1] = bezier(paths[trail.path], Math.min(1, t1));
          const strengthAlong = 1 - s / steps;
          const off = trail.lane * height;
          c.strokeStyle = trail.red
            ? `rgba(255,40,55,${(0.5 * strengthAlong * fade).toFixed(3)})`
            : `rgba(255,244,214,${(0.6 * strengthAlong * fade).toFixed(3)})`;
          c.lineWidth = (trail.red ? 2 : 2.6) * strengthAlong + 0.6;
          for (const pair of [-1, 1]) {
            c.beginPath();
            c.moveTo(x0, y0 + off + pair * 5);
            c.lineTo(x1, y1 + off + pair * 5);
            c.stroke();
          }
        }
        if (trail.t <= 1) {
          const [hx, hy] = bezier(paths[trail.path], trail.t);
          const d = (trail.red ? 60 : 110) * (unit / 900 + 0.4);
          c.globalAlpha = (trail.red ? 0.55 : 0.8) * fade;
          c.drawImage(
            trail.red ? sprites.red : sprites.white,
            hx - d / 2,
            hy + trail.lane * height - d / 2,
            d,
            d,
          );
          c.globalAlpha = 1;
        }
      }
    };

    const step = (now: number) => {
      frame = 0;
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0.016;
      previous = now;
      time += dt;
      draw(dt);
      if (visible && !document.hidden && !still) frame = requestAnimationFrame(step);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (still) {
        draw(1);
        return;
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(step);
    };
    wake.current = start;
    const move = (event: PointerEvent) => {
      pointer.tx = event.clientX / Math.max(1, innerWidth);
      pointer.ty = event.clientY / Math.max(1, innerHeight);
    };
    const resizer = new ResizeObserver(() => {
      resize();
      if (still) draw(1);
    });
    resizer.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    observer.observe(canvas);
    resize();
    document.addEventListener("visibilitychange", start);
    addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", start);
      removeEventListener("pointermove", move);
      wake.current = () => {};
    };
  }, [strength, layers]);

  return (
    <canvas
      ref={canvasRef}
      className={`atmosphere ${className}`}
      aria-hidden="true"
    />
  );
}
