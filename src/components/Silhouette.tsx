import { useId, useMemo } from "react";
import type { Car } from "../data/cars.ts";
import type { Entry } from "../data/entries.ts";
import { classPanel } from "../data/entries.ts";
import { BodyProfile as Body } from "../data/bodyProfile.ts";
import { shapes } from "../three/shapes.ts";

const bodies = new Map<string, Body>();
function bodyFor(id: string) {
  let b = bodies.get(id);
  if (!b) {
    b = new Body(shapes[id].body);
    bodies.set(id, b);
  }
  return b;
}

function createProfile(car: Car) {
  const b = bodyFor(car.id);
  const shape = shapes[car.id];
  const L = b.spec.length;
  const N = 120;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const c = b.controls(t);
    const x = b.x(t);
    top.push([x, Math.max(...c.map((p) => p[1]))]);
    bottom.push([x, b.archY(x, c[0][1])]);
  }
  const win: [number, number][] = [];
  const { from, to } = shape.cockpit;
  const gtCar = car.category === "LMGT3";
  const lower: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = from + ((to - from) * i) / 20;
    const s = b.f.spineY(t) - 0.025;
    win.push([b.x(t), s]);
    lower.push([
      b.x(t),
      Math.min(s - 0.02, gtCar ? b.f.valleyY(t) + 0.03 : b.f.tubY(t) - 0.1),
    ]);
  }
  return { b, shape, L, top, bottom, win: [...win, ...lower.reverse()] };
}

const profiles = new Map<string, ReturnType<typeof createProfile>>();
export function profile(car: Car) {
  let result = profiles.get(car.id);
  if (!result) {
    result = createProfile(car);
    profiles.set(car.id, result);
  }
  return result;
}

export default function Silhouette({
  car,
  entry,
  className,
}: {
  car: Car;
  entry: Entry;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const p = useMemo(() => profile(car), [car]);
  const { b, shape, L } = p;
  const H = Math.max(
    1.52,
    shape.wing.y + shape.wing.plate + 0.16,
    ...p.top.map((point) => point[1] + 0.18),
  );
  const pad = 0.24;
  const X = (x: number) => (x + L / 2 + pad).toFixed(3);
  const Y = (y: number) => (H - y).toFixed(3);
  const outline =
    "M" +
    [...p.top, ...[...p.bottom].reverse()]
      .map(([x, y]) => `${X(x)},${Y(y)}`)
      .join(" L") +
    "Z";
  const window =
    "M" + p.win.map(([x, y]) => `${X(x)},${Y(y)}`).join(" L") + "Z";
  const l = entry.livery;
  const w = shape.wing;
  const wx = b.x(w.t) + w.chord / 2;
  const numT =
    car.category === "LMGT3"
      ? shape.cockpit.from + 0.12
      : shape.cockpit.roof + 0.2;
  const numX = b.x(numT);
  const gt = car.category === "LMGT3";
  const frontT = b.spec.frontAxle;
  const rearT = frontT + b.spec.wheelbase / L;
  const doorT =
    shape.cockpit.from + (shape.cockpit.to - shape.cockpit.from) * 0.57;
  const numY =
    car.category === "LMGT3" ? 0.42 : Math.max(0.5, b.f.crestY(numT) - 0.16);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${(L + pad * 2).toFixed(2)} ${H}`}
      role="img"
      aria-label={`${car.make} ${car.name} #${entry.number} side profile`}
    >
      <title>
        {car.make} {car.name}, {entry.team}, race number {entry.number}
      </title>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={outline} />
        </clipPath>
        <clipPath id={`window${uid}`}>
          <path d={window} />
        </clipPath>
        <radialGradient id={`tyre${uid}`}>
          <stop offset="0.7" stopColor="#15171b" />
          <stop offset="0.9" stopColor="#292c31" />
          <stop offset="1" stopColor="#070809" />
        </radialGradient>
        <linearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a0a4ae" />
          <stop offset="0.45" stopColor={shape.rim} />
          <stop offset="1" stopColor="#333740" />
        </linearGradient>
        <linearGradient id={`glass${uid}`} x1="0" y1="0" x2="0.5" y2="1">
          <stop stopColor="#788b9d" />
          <stop offset="0.3" stopColor="#273341" />
          <stop offset="1" stopColor="#080e15" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <ellipse
        cx={(L + pad * 2) / 2}
        cy={Y(0.015)}
        rx={L * 0.49}
        ry={0.04}
        fill="#000"
        opacity={0.35}
      />
      {shape.fin && (
        <path
          d={`M${X(b.x(shape.cockpit.to))},${Y(b.f.spineY(shape.cockpit.to))} L${X(b.x(0.94))},${Y(Math.max(w.y - 0.04, b.f.spineY(shape.cockpit.to)))} L${X(b.x(0.94))},${Y(b.f.spineY(0.94))} Z`}
          fill={l.second}
          stroke="rgba(255,255,255,.22)"
          strokeWidth={0.012}
        />
      )}
      <path
        d={`M${X(b.x(w.t + 0.012))},${Y(b.f.crestY(w.t))} L${X(b.x(w.t + 0.012))},${Y(w.y)} L${X(b.x(w.t - 0.04))},${Y(w.y)}`}
        fill="none"
        stroke="#343940"
        strokeWidth={0.045}
      />
      <rect
        x={X(wx - w.chord)}
        y={Y(w.y + 0.03)}
        width={w.chord}
        height={0.06}
        rx={0.02}
        fill="#15181d"
      />
      <rect
        x={X(wx - w.chord)}
        y={Y(w.y + 0.1)}
        width={0.03}
        height={w.plate}
        fill={l.second}
      />
      <g clipPath={`url(#c${uid})`}>
        <rect x="0" y="0" width={L + pad * 2} height={H} fill={l.base} />
        <path
          d={`M0,${Y(0.05)} L${L + pad * 2},${Y(0.05)} L${L + pad * 2},${Y(0.42)} C${L * 0.6},${Y(0.36)} ${L * 0.35},${Y(0.28)} 0,${Y(0.26)} Z`}
          fill={l.second}
        />
        <path
          d={`M0,${Y(0.26)} C${L * 0.35},${Y(0.28)} ${L * 0.6},${Y(0.36)} ${L + pad * 2},${Y(0.42)}`}
          stroke={l.accent}
          strokeWidth={0.025}
          fill="none"
        />
        {["slash", "shards", "chevron", "mstripes", "claw"].includes(
          l.pattern,
        ) && (
          <path
            d={`M${X(b.x(0.27))},0 L${X(b.x(0.38))},0 L${X(b.x(0.71))},${H} L${X(b.x(0.59))},${H} Z`}
            fill={l.second}
          />
        )}
        {l.pattern === "split" && (
          <rect
            x={X(b.x(0.55))}
            y="0"
            width={L}
            height={H}
            fill={l.second}
            opacity={0.9}
          />
        )}
        {l.pattern === "stripe" && (
          <path
            d={`M0,${Y(0.62)} L${L + pad * 2},${Y(0.67)}`}
            stroke={l.accent}
            strokeWidth={0.065}
            fill="none"
          />
        )}
        <rect
          x="0"
          y={Y(0.18)}
          width={L + pad * 2}
          height={0.2}
          fill="#121418"
        />
        <path
          d={window}
          fill={`url(#glass${uid})`}
          stroke="#10151b"
          strokeWidth={0.026}
        />
        <g clipPath={`url(#window${uid})`}>
          <path
            d={`M${X(b.x(shape.cockpit.from + 0.04))},0 L${X(b.x(shape.cockpit.from + 0.11))},0 L${X(b.x(shape.cockpit.to - 0.06))},${H}`}
            stroke="#d9e6f0"
            strokeWidth={0.07}
            opacity={0.18}
            fill="none"
          />
          {gt && (
            <path
              d={`M${X(b.x(doorT))},0 L${X(b.x(doorT + 0.025))},${H}`}
              stroke="#0c1016"
              strokeWidth={0.035}
            />
          )}
        </g>
        <path
          d={`M${X(b.x(0.04))},${Y(b.f.shoulderY(0.04))} ${Array.from(
            { length: 48 },
            (_, i) => {
              const t = 0.04 + (i * 0.92) / 47;
              return `L${X(b.x(t))},${Y(b.f.shoulderY(t) + 0.035)}`;
            },
          ).join(" ")}`}
          fill="none"
          stroke="#fff"
          strokeWidth={0.012}
          opacity={0.34}
        />
        {gt && (
          <path
            d={`M${X(b.x(doorT + 0.06))},${Y(b.f.spineY(doorT + 0.06) - 0.08)} L${X(b.x(doorT + 0.09))},${Y(0.29)} L${X(b.x(shape.cockpit.from + 0.01))},${Y(0.29)}`}
            fill="none"
            stroke="#111820"
            strokeWidth={0.013}
            opacity={0.8}
          />
        )}
        {!gt && (
          <path
            d={`M${X(b.x(rearT - 0.21))},${Y(0.46)} L${X(b.x(rearT - 0.1))},${Y(0.66)} L${X(b.x(rearT - 0.11))},${Y(0.34)} Z`}
            fill="#10151a"
            opacity={0.9}
          />
        )}
        {[frontT + 0.045, rearT - 0.035].map((t) => (
          <g
            key={t}
            transform={`translate(${X(b.x(t))},${Y(b.f.crestY(t) - 0.06)})`}
            opacity={0.8}
          >
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={`M${i * 0.045},0 l0.05,0.1`}
                stroke="#171b20"
                strokeWidth={0.018}
              />
            ))}
          </g>
        ))}
        <rect
          x={X(b.x(0.008))}
          y={Y(b.f.crestY(0.04) - 0.02)}
          width={0.09}
          height={0.035}
          rx={0.014}
          fill="#ecf5ff"
        />
        <rect
          x={X(b.x(0.99))}
          y={Y(b.f.crestY(0.99) - 0.12)}
          width={0.055}
          height={0.045}
          rx={0.015}
          fill="#ef2338"
        />
        <rect
          x="0"
          y="0"
          width={L + pad * 2}
          height={H}
          fill={`url(#g${uid})`}
        />
      </g>
      <path
        d={`M${X(b.x(0.01))},${Y(0.075)} L${X(b.x(-shape.splitter / L))},${Y(0.075)}`}
        stroke="#252930"
        strokeWidth={0.035}
      />
      <path
        d={`M${X(b.x(shape.cockpit.from + 0.04))},${Y(b.f.tubY(shape.cockpit.from + 0.04))} l0.05,-0.035`}
        stroke="#343b44"
        strokeWidth={0.025}
      />
      <ellipse
        cx={X(b.x(shape.cockpit.from + 0.03))}
        cy={Y(b.f.tubY(shape.cockpit.from + 0.04) + 0.025)}
        rx={0.065}
        ry={0.024}
        fill={l.accent}
      />
      <rect
        x={Number(X(numX)) - 0.2}
        y={Y(numY + 0.13)}
        width={0.4}
        height={0.26}
        rx={0.04}
        fill={classPanel[car.category]}
      />
      <text
        x={Number(X(numX))}
        y={Number(Y(numY)) + 0.075}
        fontSize={0.2}
        textAnchor="middle"
        fill="#fff"
        fontWeight={800}
        fontStyle="italic"
        fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
      >
        {entry.number}
      </text>
      {[b.frontX, b.rearX].map((x) => (
        <g key={x} transform={`translate(${X(x)},${Y(b.spec.wheelR)})`}>
          <circle r={b.spec.wheelR} fill={`url(#tyre${uid})`} />
          <circle
            r={b.spec.wheelR * 0.74}
            fill="#080a0c"
            stroke="#737984"
            strokeWidth={0.012}
          />
          <circle
            r={b.spec.wheelR * 0.53}
            fill="#46474b"
            stroke="#25272c"
            strokeWidth={0.015}
          />
          <path
            d={`M0.1,-0.07 l0.04,0.02 v0.11 l-0.04,0.01 Z`}
            fill={car.category === "LMGT3" ? "#a52825" : "#282c31"}
          />
          {Array.from({ length: gt ? 10 : 12 }, (_, i) => (
            <path
              key={i}
              d={`M-0.025,-0.035 L-0.013,-${b.spec.wheelR * 0.69} L0.018,-${b.spec.wheelR * 0.7} L0.032,-0.035 Z`}
              fill={`url(#rim${uid})`}
              transform={`rotate(${i * (360 / (gt ? 10 : 12))})`}
            />
          ))}
          <circle
            r={0.047}
            fill={car.category === "LMGT3" ? "#c9ccd2" : "#d8b04a"}
            stroke="#555960"
            strokeWidth={0.008}
          />
          <circle r={0.018} fill="#15191f" />
          <path
            d={`M-${b.spec.wheelR * 0.9},0 A${b.spec.wheelR * 0.9},${b.spec.wheelR * 0.9} 0 0 1 ${b.spec.wheelR * 0.7},-${b.spec.wheelR * 0.55}`}
            stroke="rgba(255,255,255,.12)"
            strokeWidth={0.018}
            fill="none"
          />
        </g>
      ))}
      <rect
        x={pad * 0.2}
        y={Y(0.0)}
        width={L + pad * 1.6}
        height={0.012}
        fill="rgba(255,255,255,0.08)"
      />
    </svg>
  );
}
