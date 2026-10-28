import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { refreshShadows } from "./shadowRefresh.ts";
import type { Car } from "../data/cars.ts";
import type { Entry } from "../data/entries.ts";
import type { SystemId } from "../data/systems.ts";
import { Body, V } from "./body.ts";
import { paintLivery, toTexture } from "./livery.ts";
import type { PaintMode } from "./livery.ts";
import { shapes } from "./shapes.ts";
import type { Shape } from "./shapes.ts";
import { glazingPanels } from "./glazing.ts";
import type { SkinPoint } from "./glazing.ts";
import { slickTyreGeometry } from "./tyre.ts";
import { CabinOverview, BrakeOverview } from "./DetailPreview.tsx";
import { Callouts } from "./Callouts.tsx";
import { studyDetailPolicy } from "./detailPolicy.ts";
import { layerWeights } from "./layerPlan.ts";
import { detachedAmount, usesGarage } from "./teardown.ts";
import { useTeardown } from "./teardownLayout.ts";
import type { LayerId } from "./layerPlan.ts";
import { rimGeometry, spokeMatrices } from "./wheelGeometry.ts";

let mechanicalModule: ReturnType<typeof importMechanical> | undefined;
function importMechanical() {
  return import("./MechanicalAssemblies.tsx");
}
function loadMechanical() {
  return (mechanicalModule ??= importMechanical());
}
let cockpitModule: ReturnType<typeof importCockpit> | undefined;
function importCockpit() {
  return import("./CockpitAssembly.tsx");
}
function loadCockpit() {
  return (cockpitModule ??= importCockpit());
}
const CockpitAssembly = lazy(() =>
  loadCockpit().then((m) => ({ default: m.CockpitAssembly })),
);
const EngineAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.EngineAssembly })),
);
const GearboxAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.GearboxAssembly })),
);
const HybridAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.HybridAssembly })),
);
const FuelAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.FuelAssembly })),
);
const CoolingAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.CoolingAssembly })),
);
const SuspensionAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.SuspensionAssembly })),
);
const BrakeAssembly = lazy(() =>
  loadMechanical().then((m) => ({ default: m.BrakeAssembly })),
);

import {
  Block,
  Loft,
  Mat,
  PartCtx,
  Rod,
  usePartLook,
  useView,
} from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";

const CARBON = "#1b1f25";
const CARBON2 = "#262b33";

export type ModelProps = {
  car: Car;
  entry: Entry;
  paint: PaintMode;
  exploded: number;
  onSelect: (id: SystemId) => void;
  onHover: (id: SystemId | null) => void;
  fontsReady: boolean;
  onDetailReady?: () => void;
};

export function useBody(car: Car) {
  return useMemo(() => {
    const shape = shapes[car.id];
    return { shape, body: new Body(shape.body) };
  }, [car.id]);
}

type PartProps = {
  id: SystemId;
  offset: V3;
  exploded: number;
  onSelect: (id: SystemId) => void;
  onHover: (id: SystemId | null) => void;
  children: ReactNode;
  pickable?: boolean;
  /** Which staged lift carries this part. Defaults to the driveline layer. */
  layer?: LayerId;
  /** Extra travel once another layer has been removed, e.g. setting a shell aside. */
  rise?: V3;
  riseLayer?: LayerId;
};

function Part({
  id,
  offset,
  exploded,
  onSelect,
  onHover,
  children,
  pickable = true,
  layer = "cabin",
  rise,
  riseLayer,
}: PartProps) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((state) => state.gl);
  const target = useMemo(() => new THREE.Vector3(), []);
  const extra = useMemo(() => new THREE.Vector3(), []);
  const teardown = useTeardown();
  const { garage } = teardown;
  useEffect(() => {
    if (ref.current) return garage.add(ref.current, id);
  }, [garage, id]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    let rate = 6;
    if (usesGarage(teardown.mode)) {
      // Garage and build modes: travel between the floor slot and the car,
      // arcing up so parts clear one another on the way.
      const slot = garage.offsetFor(ref.current);
      const away =
        teardown.mode === "garage"
          ? 1
          : detachedAmount(id, teardown.clock.get());
      if (slot) target.set(...slot).multiplyScalar(away);
      else target.set(0, 0, 0);
      target.setY(target.y + Math.sin(Math.PI * away) * (slot ? 0.9 : 0));
      if (teardown.mode === "build") rate = 16;
    } else {
      const layers = layerWeights(exploded);
      target.set(...offset).multiplyScalar(layers[layer]);
      if (rise && riseLayer)
        target.add(extra.set(...rise).multiplyScalar(layers[riseLayer]));
    }
    if (ref.current.position.distanceTo(target) > 0.0005) {
      ref.current.position.lerp(
        target,
        1 - Math.exp(-Math.min(dt, 0.08) * rate),
      );
      refreshShadows(gl);
      invalidate();
    }
  });
  return (
    <PartCtx.Provider value={id}>
      <group
        ref={ref}
        onClick={
          pickable
            ? (e) => {
                e.stopPropagation();
                onSelect(id);
              }
            : undefined
        }
        onPointerOver={
          pickable
            ? (e) => {
                e.stopPropagation();
                onHover(id);
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          pickable
            ? () => {
                onHover(null);
                document.body.style.cursor = "auto";
              }
            : undefined
        }
      >
        {children}
      </group>
    </PartCtx.Provider>
  );
}

function BodyShell({
  body,
  shape,
  car,
  entry,
  paint,
  fontsReady,
}: {
  body: Body;
  shape: Shape;
  car: Car;
  entry: Entry;
  paint: PaintMode;
  fontsReady: boolean;
}) {
  const view = useView();
  const { rule, selected, hovered, ghost } = usePartLook("body");
  const geometry = useMemo(() => body.geometry(), [body]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const tex = useMemo(() => {
    void fontsReady;
    const c = paintLivery(car, shape, entry, paint);
    return {
      map: toTexture(c.map),
      emissive: toTexture(c.emissive),
      rough: toTexture(c.rough, false),
      openings: toTexture(c.openings, false),
    };
  }, [car, shape, entry, paint, fontsReady]);
  useEffect(
    () => () => {
      tex.map.dispose();
      tex.emissive.dispose();
      tex.rough.dispose();
      tex.openings.dispose();
    },
    [tex],
  );
  const see = view.xray || ghost;
  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      raycast={see ? () => null : undefined}
    >
      <meshPhysicalMaterial
        key={rule ? "rule" : "paint"}
        color={rule ?? "#ffffff"}
        map={rule ? null : tex.map}
        roughnessMap={rule ? null : tex.rough}
        alphaMap={tex.openings}
        alphaTest={see ? 0.01 : 0.5}
        emissiveMap={tex.emissive}
        emissive={selected ? "#3d7bff" : hovered ? "#6f9bff" : "#ffffff"}
        emissiveIntensity={
          selected ? 0.5 : hovered ? 0.3 : view.night ? 2.2 : 0.7
        }
        roughness={1}
        metalness={paint === "carbon" ? 0.08 : paint === "clay" ? 0 : 0.08}
        clearcoat={paint === "clay" ? 0 : paint === "carbon" ? 0.35 : 1}
        clearcoatRoughness={0.24}
        transparent={see}
        opacity={see ? (ghost ? 0.06 : 0.14) : 1}
        depthWrite={!see}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Skin({
  body,
  points,
  side,
  color,
  rough = 0.5,
  metal = 0.1,
  coat = 0,
  lift = 0.004,
  emissive,
  intensity = 1,
  glass = false,
}: {
  body: Body;
  points: SkinPoint[];
  side: number;
  color: string;
  rough?: number;
  metal?: number;
  coat?: number;
  lift?: number;
  emissive?: string;
  intensity?: number;
  glass?: boolean;
}) {
  const key = JSON.stringify(points);
  const coordinates = useMemo(() => JSON.parse(key) as SkinPoint[], [key]);
  const geometry = useMemo(
    () => body.patch(coordinates, side, lift, glass ? 5 : 4),
    [body, coordinates, side, lift, glass],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const { rule, selected, hovered, ghost } = usePartLook(
    glass ? "body" : "lights",
  );
  const view = useView();
  if (glass) {
    const see = ghost || view.xray;
    return (
      <mesh geometry={geometry} raycast={see ? () => null : undefined}>
        <meshPhysicalMaterial
          color={rule ?? color}
          metalness={0}
          roughness={rule ? 0.5 : 0.07}
          ior={1.5}
          clearcoat={0}
          envMapIntensity={0.85}
          emissive={selected ? "#3d7bff" : hovered ? "#6f9bff" : "#000000"}
          emissiveIntensity={selected ? 0.4 : 0.2}
          transparent
          opacity={see ? 0.06 : rule ? 0.85 : 0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  return (
    <mesh geometry={geometry} receiveShadow>
      <Mat
        color={color}
        rough={rough}
        metal={metal}
        coat={coat}
        emissive={emissive}
        emissiveIntensity={intensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SkinLine({
  body,
  points,
  side,
  color = "#11151b",
  radius = 0.0024,
  lift = 0.006,
}: {
  body: Body;
  points: SkinPoint[];
  side: number;
  color?: string;
  radius?: number;
  lift?: number;
}) {
  const key = JSON.stringify(points);
  const coordinates = useMemo(() => JSON.parse(key) as SkinPoint[], [key]);
  const geometry = useMemo(() => {
    const samples: THREE.Vector3[] = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      const a = coordinates[i],
        b = coordinates[i + 1];
      const count = Math.max(
        3,
        Math.ceil(
          Math.hypot((b[0] - a[0]) * body.spec.length, b[1] - a[1]) * 60,
        ),
      );
      for (let j = 0; j < count; j++) {
        const k = j / count;
        samples.push(
          body.surfaceAt(
            a[0] + (b[0] - a[0]) * k,
            a[1] + (b[1] - a[1]) * k,
            side,
            lift,
          ),
        );
      }
    }
    const last = coordinates[coordinates.length - 1];
    samples.push(body.surfaceAt(last[0], last[1], side, lift));
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(samples),
      samples.length * 2,
      radius,
      5,
      false,
    );
  }, [body, coordinates, side, radius, lift]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <Mat color={color} metal={0.1} rough={0.6} />
    </mesh>
  );
}

function Glazing({ body, shape }: { body: Body; shape: Shape }) {
  const gt = body.spec.kind === "gt";
  const { from, to, roof } = shape.cockpit;
  const windows = useMemo(() => glazingPanels(shape), [shape]);
  const view = useView();
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {windows.map((points, i) => (
            <group key={i}>
              <Skin
                body={body}
                points={points}
                side={side}
                color="#34474f"
                glass
                lift={0.002}
              />
              <SkinLine
                body={body}
                points={
                  i === 1
                    ? [...points, points[0]]
                    : [points[3], points[0], points[1], points[2]]
                }
                side={side}
                radius={0.004}
                color="#171c21"
                lift={0.013}
              />
            </group>
          ))}
          <SkinLine
            body={body}
            points={[
              [from + 0.025, 0.875],
              [from + 0.04, 0.955],
              [from + 0.105, 0.976],
            ]}
            side={side}
            radius={0.0045}
            color={CARBON}
            lift={0.018}
          />
          {gt && (
            <SkinLine
              body={body}
              points={[
                [to - 0.105, 0.738],
                [to - 0.105, 0.839],
              ]}
              side={side}
              radius={0.004}
            />
          )}
        </group>
      ))}
      {!view.xray && (
        <mesh
          position={[body.x(roof + 0.04), body.topAt(roof + 0.04) + 0.065, 0]}
        >
          <cylinderGeometry args={[0.003, 0.007, 0.13, 8]} />
          <Mat color={CARBON} metal={0} />
        </mesh>
      )}
    </group>
  );
}

function SkinDetails({
  body,
  shape,
  car,
}: {
  body: Body;
  shape: Shape;
  car: Car;
}) {
  const gt = body.spec.kind === "gt";
  const { from, to, roof } = shape.cockpit;
  const tf = body.spec.frontAxle;
  const rearMid = ["296", "corvette", "mclaren"].includes(car.id);
  const view = useView();
  if (view.xray) return null;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <SkinLine
            body={body}
            side={side}
            points={
              gt
                ? [
                    [from + 0.025, 0.728],
                    [from + 0.04, 0.47],
                    [from + 0.07, 0.265],
                    [to - 0.015, 0.265],
                    [to + 0.018, 0.49],
                    [to - 0.026, 0.73],
                  ]
                : [
                    [from + 0.022, 0.72],
                    [roof + 0.02, 0.702],
                    [to + 0.04, 0.71],
                    [to + 0.02, 0.865],
                  ]
            }
          />
          <SkinLine
            body={body}
            side={side}
            points={[
              [0.04, 0.685],
              [tf, 0.69],
              [from - 0.018, 0.695],
            ]}
            radius={0.002}
          />
          <SkinLine
            body={body}
            side={side}
            points={[
              [to + 0.06, 0.66],
              [0.96, 0.68],
            ]}
            radius={0.002}
          />
          {/* Openings and louvres follow the fender skin rather than hovering above it. */}
          <Skin
            body={body}
            side={side}
            points={[
              [tf + 0.075, 0.49],
              [tf + 0.145, 0.5],
              [tf + 0.145, 0.64],
              [tf + 0.075, 0.635],
            ]}
            color="#080c10"
            rough={0.86}
          />
          {Array.from({ length: 5 }, (_, i) => (
            <SkinLine
              key={i}
              body={body}
              side={side}
              points={[
                [tf + 0.079 + i * 0.014, 0.502],
                [tf + 0.079 + i * 0.014, 0.63],
              ]}
              radius={0.006}
              color="#313940"
              lift={0.01}
            />
          ))}
          {(rearMid || !gt) && (
            <Skin
              body={body}
              side={side}
              points={[
                [to + 0.035, 0.3],
                [to + 0.13, 0.33],
                [to + 0.16, 0.58],
                [to + 0.05, 0.49],
              ]}
              color="#090d11"
              rough={0.8}
            />
          )}
          {gt && (
            <SkinLine
              body={body}
              side={side}
              points={[
                [to - 0.075, 0.67],
                [to - 0.055, 0.67],
              ]}
              radius={0.008}
              color="#171c20"
              lift={0.01}
            />
          )}
          <Skin
            body={body}
            side={side}
            points={[
              [0.008, 0.25],
              [0.064, 0.265],
              [0.065, 0.435],
              [0.02, 0.435],
            ]}
            color="#0a0f14"
            rough={0.8}
          />
          {/* Flush filler cap and two visible quick-release body fasteners. */}
          {[gt ? to + 0.05 : to + 0.075, 0.13].map((t, i) => {
            const p = body.surfaceAt(t, i ? 0.66 : 0.64, side, 0.005);
            const n = body
              .surfaceAt(t, i ? 0.66 : 0.64, side, 1)
              .sub(body.pointAt(t, i ? 0.66 : 0.64, side))
              .normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              n,
            );
            return (
              <mesh key={i} position={p} quaternion={q}>
                <ringGeometry
                  args={i ? [0.006, 0.014, 16] : [0.025, 0.04, 24]}
                />
                <Mat
                  color={i ? "#a0a6aa" : "#737c82"}
                  metal={0.9}
                  rough={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function HeadLights({ body, shape }: { body: Body; shape: Shape }) {
  const gt = body.spec.kind === "gt";
  const view = useView();
  const style = shape.lights;
  const lenses = useMemo<SkinPoint[][]>(() => {
    if (style === "round") {
      return [
        Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return [0.059 + Math.cos(a) * 0.032, 0.575 + Math.sin(a) * 0.084];
        }),
      ];
    }
    if (style === "blades")
      return [
        [
          [0.034, 0.526],
          [0.119, 0.547],
          [0.117, 0.635],
          [0.041, 0.641],
        ],
      ];
    if (gt)
      return [
        [
          [0.012, 0.52],
          [0.09, 0.552],
          [0.105, 0.655],
          [0.029, 0.644],
        ],
      ];
    return [
      [
        [0.027, 0.475],
        [0.115, 0.485],
        [0.113, 0.644],
        [0.043, 0.656],
      ],
    ];
  }, [gt, style]);
  const strips = useMemo<SkinPoint[][]>(() => {
    if (style === "round")
      return [
        Array.from({ length: 25 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return [0.059 + Math.cos(a) * 0.023, 0.575 + Math.sin(a) * 0.062];
        }),
      ];
    if (style === "claw" || style === "vertical")
      return Array.from({ length: style === "claw" ? 3 : 2 }, (_, i) => [
        [0.04 + i * 0.022, 0.5],
        [0.066 + i * 0.022, 0.622],
      ]);
    if (style === "triangle")
      return [
        [
          [0.041, 0.516],
          [0.099, 0.606],
          [0.04, 0.606],
        ],
      ];
    if (style === "twoline")
      return [
        [
          [0.035, 0.592],
          [0.105, 0.592],
        ],
        [
          [0.035, 0.551],
          [0.105, 0.551],
        ],
      ];
    if (style === "blades")
      return [
        [
          [0.034, 0.59],
          [0.116, 0.605],
        ],
        [
          [0.044, 0.548],
          [0.102, 0.558],
        ],
      ];
    if (style === "twin")
      return [
        [
          [0.047, 0.59],
          [0.095, 0.59],
        ],
        [
          [0.047, 0.538],
          [0.085, 0.538],
        ],
      ];
    if (style === "eye")
      return [
        [
          [0.028, 0.534],
          [0.07, 0.595],
          [0.086, 0.628],
        ],
      ];
    return [
      [
        [0.023, 0.572],
        [0.093, 0.611],
      ],
      ...(!gt
        ? [
            [
              [0.036, 0.545],
              [0.09, 0.553],
            ] as SkinPoint[],
          ]
        : []),
    ];
  }, [style, gt]);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {lenses.map((points, i) => (
            <group key={i}>
              <Skin
                body={body}
                points={points}
                side={side}
                color="#09131c"
                metal={0.35}
                rough={0.16}
                coat={1}
                lift={0.008}
              />
              <SkinLine
                body={body}
                points={[...points, points[0]]}
                side={side}
                color="#10171e"
                radius={0.004}
                lift={0.012}
              />
            </group>
          ))}
          {strips.map((points, i) => (
            <group key={i}>
              <SkinLine
                body={body}
                points={points}
                side={side}
                color="#e4f2ff"
                radius={style === "round" ? 0.0045 : 0.0065}
                lift={0.014}
              />
              <Skin
                body={body}
                side={side}
                points={[
                  ...points.map(([t, v]) => [t, v - 0.004] as SkinPoint),
                  ...[...points]
                    .reverse()
                    .map(([t, v]) => [t, v + 0.004] as SkinPoint),
                ]}
                color="#e2f1ff"
                emissive="#c9e5ff"
                intensity={view.night ? 5 : 1.8}
                rough={0.14}
                lift={0.018}
              />
            </group>
          ))}
          {!["round", "blades", "claw", "vertical", "twoline"].includes(
            style,
          ) &&
            [0, 1].map((i) => {
              const p = body.surfaceAt(0.065 + i * 0.026, 0.56, side, 0.018);
              const n = body
                .surfaceAt(0.065 + i * 0.026, 0.56, side, 1)
                .sub(body.pointAt(0.065 + i * 0.026, 0.56, side))
                .normalize();
              return (
                <mesh
                  key={i}
                  position={p}
                  quaternion={new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, 1),
                    n,
                  )}
                >
                  <circleGeometry args={[0.014, 16]} />
                  <Mat
                    color="#ecf7ff"
                    rough={0.12}
                    metal={0.2}
                    emissive="#d5ebff"
                    emissiveIntensity={view.night ? 3 : 0.8}
                  />
                </mesh>
              );
            })}
        </group>
      ))}
    </group>
  );
}

function airfoil(chord: number, thick: number) {
  const s = new THREE.Shape();
  const n = 18;
  s.moveTo(0, 0);
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    s.lineTo(
      -u * chord,
      thick * 0.25 * Math.sin(Math.PI * u) + u * thick * 0.1,
    );
  }
  for (let i = n - 1; i >= 1; i--) {
    const u = i / n;
    s.lineTo(
      -u * chord,
      -thick * Math.sin(Math.PI * Math.pow(u, 0.65)) + u * thick * 0.1,
    );
  }
  s.closePath();
  return s;
}

function Extruded({
  shape,
  depth,
  color,
  metal = 0,
  rough = 0.45,
  position,
  rotation,
}: {
  shape: THREE.Shape;
  depth: number;
  color: string;
  metal?: number;
  rough?: number;
  position?: V3;
  rotation?: V3;
}) {
  const g = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 12,
    });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  }, [shape, depth]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} position={position} rotation={rotation} castShadow>
      <Mat color={color} metal={metal} rough={rough} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Wing({
  body,
  shape,
  entry,
  paint,
}: {
  body: Body;
  shape: Shape;
  entry: Entry;
  paint: PaintMode;
}) {
  const w = shape.wing;
  const xl = body.x(w.t) + w.chord / 2;
  const main = useMemo(() => airfoil(w.chord * 0.66, 0.05), [w.chord]);
  const flap = useMemo(() => airfoil(w.chord * 0.42, 0.035), [w.chord]);
  const plate = useMemo(() => {
    const s = new THREE.Shape();
    const c = w.chord + 0.12;
    s.moveTo(0.04, -w.plate * 0.72);
    s.lineTo(-c + 0.02, -w.plate * 0.6);
    s.lineTo(-c, w.plate * 0.35);
    s.lineTo(0.02, w.plate * 0.12);
    s.closePath();
    return s;
  }, [w.chord, w.plate]);
  const baseY = body.topAt(w.t + 0.01);
  const neck = useMemo(() => {
    if (w.style !== "swan") return null;
    const x0 = xl + 0.02;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0 + 0.06, baseY - 0.05, 0),
      new THREE.Vector3(x0 + 0.03, (baseY + w.y) / 2, 0),
      new THREE.Vector3(x0 - 0.02, w.y + 0.1, 0),
      new THREE.Vector3(xl - w.chord * 0.2, w.y + 0.11, 0),
      new THREE.Vector3(xl - w.chord * 0.32, w.y + 0.03, 0),
    ]);
    const g = new THREE.TubeGeometry(curve, 40, 0.03, 8);
    g.scale(1, 1, 0.3);
    return g;
  }, [w.style, w.y, w.chord, xl, baseY]);
  useEffect(() => () => neck?.dispose(), [neck]);
  return (
    <group>
      <Extruded
        shape={main}
        depth={w.span}
        color={CARBON}
        position={[xl, w.y, 0]}
        rotation={[0, 0, -0.1]}
      />
      <Extruded
        shape={flap}
        depth={w.span - 0.02}
        color={CARBON2}
        position={[xl - w.chord * 0.6, w.y + 0.05, 0]}
        rotation={[0, 0, -0.45]}
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Extruded
            shape={plate}
            depth={0.014}
            color={
              paint === "livery"
                ? entry.livery.second
                : paint === "clay"
                  ? "#d9dbe0"
                  : CARBON
            }
            position={[xl + 0.02, w.y, (s * w.span) / 2]}
          />
          {neck ? (
            <mesh geometry={neck} position={[0, 0, s * 0.26]} castShadow>
              <Mat color={CARBON} metal={0.2} rough={0.4} />
            </mesh>
          ) : (
            <Block
              p={[xl - w.chord * 0.45, (baseY + w.y) / 2 - 0.02, s * 0.16]}
              s={[0.16, w.y - baseY + 0.02, 0.014]}
              color={CARBON}
            />
          )}
        </group>
      ))}
    </group>
  );
}

function Fin({
  body,
  shape,
  color,
}: {
  body: Body;
  shape: Shape;
  color: string;
}) {
  const s = useMemo(() => {
    const w = shape.wing;
    const t0 = shape.cockpit.to - 0.04;
    const xl = body.x(w.t) + w.chord / 2;
    const sh = new THREE.Shape();
    sh.moveTo(body.x(t0), body.topAt(t0) - 0.02);
    sh.lineTo(xl - w.chord * 0.15, w.y - 0.01);
    sh.lineTo(xl - w.chord * 0.75, w.y - 0.01);
    const tEnd = body.t(xl - w.chord * 0.75);
    for (let i = 0; i <= 10; i++) {
      const t = tEnd + ((t0 - tEnd) * i) / 10;
      sh.lineTo(body.x(t), body.topAt(t) - 0.03);
    }
    sh.closePath();
    return sh;
  }, [body, shape]);
  return <Extruded shape={s} depth={0.012} color={color} rough={0.35} />;
}

function Mirrors({
  body,
  shape,
  color,
}: {
  body: Body;
  shape: Shape;
  color: string;
}) {
  const gtCar = body.spec.kind === "gt";
  const t = shape.cockpit.from + (gtCar ? 0.05 : 0.02);
  return (
    <>
      {[-1, 1].map((s) => {
        const p = body.pointAt(t, gtCar ? V.window[0] - 0.01 : V.crest[1], s);
        const head: V3 = [
          p.x,
          p.y + (gtCar ? 0.06 : 0.07),
          p.z + s * (gtCar ? 0.14 : 0.03),
        ];
        return (
          <group key={s}>
            <Rod a={[p.x, p.y, p.z]} b={head} r={0.01} color={CARBON} />
            <mesh
              position={head}
              scale={gtCar ? [0.075, 0.045, 0.085] : [0.07, 0.04, 0.08]}
            >
              <sphereGeometry args={[1, 18, 12]} />
              <Mat
                color={gtCar ? color : CARBON}
                metal={0.2}
                rough={0.35}
                coat={0.6}
              />
            </mesh>
            <mesh
              position={[head[0] - 0.064, head[1], head[2]]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[0.059, 0.025, 1]}
            >
              <circleGeometry args={[1, 20]} />
              <Mat color="#a5b6bf" metal={1} rough={0.06} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Grille({ body, shape }: { body: Body; shape: Shape }) {
  const g = shape.grille;
  const shapesList = useMemo(() => {
    const out: THREE.Shape[] = [];
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      const s = new THREE.Shape();
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    switch (g) {
      case "kidney":
        out.push(
          rr(-0.3, 0.14, 0.27, 0.36, 0.07),
          rr(0.03, 0.14, 0.27, 0.36, 0.07),
        );
        break;
      case "aston": {
        const s = new THREE.Shape();
        s.moveTo(-0.45, 0.3);
        s.quadraticCurveTo(0, 0.38, 0.45, 0.3);
        s.lineTo(0.35, 0.14);
        s.quadraticCurveTo(0, 0.1, -0.35, 0.14);
        s.closePath();
        out.push(s);
        break;
      }
      case "slats":
        out.push(rr(-0.4, 0.14, 0.8, 0.28, 0.09));
        break;
      case "spindle": {
        const s = new THREE.Shape();
        s.moveTo(-0.3, 0.4);
        s.lineTo(0.3, 0.4);
        s.lineTo(0.15, 0.27);
        s.lineTo(0.4, 0.12);
        s.lineTo(-0.4, 0.12);
        s.lineTo(-0.15, 0.27);
        s.closePath();
        out.push(s);
        break;
      }
      case "mustang": {
        const s = new THREE.Shape();
        s.moveTo(-0.5, 0.42);
        s.lineTo(0.5, 0.42);
        s.lineTo(0.42, 0.18);
        s.lineTo(-0.42, 0.18);
        s.closePath();
        out.push(s);
        break;
      }
      case "wide":
        out.push(rr(-0.6, 0.14, 1.2, 0.2, 0.06));
        break;
      case "low":
        out.push(rr(-0.55, 0.14, 1.1, 0.14, 0.05));
        break;
      default:
        break;
    }
    return out;
  }, [g]);
  if (!shapesList.length) return null;
  const x = body.spec.length / 2 + 0.004;
  const capTop = Math.max(...body.controls(0).map((p) => p[1]));
  const k = Math.min(1, (capTop - 0.16) / 0.38);
  return (
    <group
      position={[x, 0.12 * (1 - k), 0]}
      scale={[1, k, 1]}
      rotation={[0, Math.PI / 2, 0]}
    >
      {shapesList.map((s, i) => (
        <mesh key={i}>
          <shapeGeometry args={[s]} />
          <Mat
            color="#0c0e11"
            metal={0.4}
            rough={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {g === "slats" &&
        Array.from({ length: 11 }, (_, i) => (
          <mesh key={`s${i}`} position={[-0.33 + i * 0.066, 0.28, 0.004]}>
            <planeGeometry args={[0.012, 0.24]} />
            <Mat
              color="#b9bfc7"
              metal={0.9}
              rough={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
    </group>
  );
}

function Floor({ body }: { body: Body }) {
  const L = body.spec.length,
    Wd = body.spec.width;
  const gtCar = body.spec.kind === "gt";
  const y = gtCar ? 0.085 : 0.05;
  const diffX0 = body.rearX + 0.1,
    diffX1 = -L / 2 + 0.02;
  return (
    <group>
      <Block
        p={[0.05, y, 0]}
        s={[L - 0.3, 0.018, Wd * 0.86]}
        color={CARBON}
        rough={0.7}
      />
      <Block
        p={[L / 2 - 0.02, y - 0.01, 0]}
        s={[0.26, 0.016, Wd * 0.94]}
        color={CARBON2}
        rough={0.6}
      />
      <Block
        p={[0.1, y - 0.018, 0]}
        s={[L * 0.6, 0.02, 0.26]}
        color="#a6834f"
        rough={0.9}
        metal={0}
      />
      {gtCar &&
        [-1, 1].map((s) => (
          <Block
            key={s}
            p={[L / 2 - 0.2, 0.34, s * (Wd / 2 - 0.02)]}
            s={[0.22, 0.012, 0.12]}
            r={[0.25, 0, s * -0.2]}
            color={CARBON}
          />
        ))}
      {[-0.52, -0.26, 0, 0.26, 0.52].map((z) => (
        <Block
          key={z}
          p={[(diffX0 + diffX1) / 2, y + 0.12, z * (Wd / 2)]}
          s={[diffX0 - diffX1, 0.22, 0.012]}
          r={[0, 0, 0.18]}
          color={CARBON2}
        />
      ))}
      <Block
        p={[(diffX0 + diffX1) / 2, y + 0.1, 0]}
        s={[diffX0 - diffX1 + 0.05, 0.012, Wd * 0.72]}
        r={[0, 0, 0.18]}
        color={CARBON}
      />
    </group>
  );
}

function tyreTexture(brand: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#16181b";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.translate(512, 512);
  ctx.font = "800 70px 'Barlow Condensed', Arial, sans-serif";
  ctx.fillStyle = brand === "MICHELIN" ? "#f2f2f2" : "#f5c400";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let k = 0; k < 2; k++) {
    const text = brand;
    const start = k * Math.PI - text.length * 0.045;
    [...text].forEach((ch, i) => {
      ctx.save();
      ctx.rotate(start + i * 0.09);
      ctx.translate(0, -435);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type WheelResources = {
  tyre: ReturnType<typeof slickTyreGeometry>;
  branding: THREE.Texture;
  rim: ReturnType<typeof rimGeometry>;
};

function Tyre({
  resources,
  scale,
  width,
}: {
  resources: WheelResources;
  scale: number;
  width: number;
}) {
  const geometry = resources.tyre,
    tex = resources.branding;
  const { rule, selected, hovered, ghost } = usePartLook("wheels");
  return (
    <group scale={[scale, width / 0.33, scale]}>
      <mesh geometry={geometry.rubber} castShadow receiveShadow>
        <Mat color="#131518" metal={0} rough={0.85} />
      </mesh>
      {geometry.sidewalls.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshStandardMaterial
            map={rule ? null : tex}
            color={rule ?? "#ffffff"}
            roughness={0.85}
            emissive={selected ? "#3d7bff" : hovered ? "#6f9bff" : "#000"}
            emissiveIntensity={selected ? 0.5 : 0.3}
            transparent={ghost}
            opacity={ghost ? 0.12 : 1}
            depthWrite={!ghost}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Spokes({
  geometry,
  width,
  count,
  color,
}: {
  geometry: THREE.BufferGeometry;
  width: number;
  count: number;
  color: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    spokeMatrices(width, count).forEach((matrix, i) =>
      ref.current!.setMatrixAt(i, matrix),
    );
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [width, count]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count * 2]}>
      <Mat color={color} metal={0.88} rough={0.25} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function Rim({
  color,
  nut,
  width,
  resources,
}: {
  color: string;
  nut: string;
  width: number;
  resources: WheelResources;
}) {
  const { geometry: g, spokeCount } = resources.rim;
  return (
    <group>
      <mesh geometry={g.barrel}>
        <Mat
          color="#31363a"
          metal={0.82}
          rough={0.26}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Spokes
        geometry={g.spoke}
        width={width}
        count={spokeCount}
        color={color}
      />
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * width * 0.395, 0]}>
          <mesh geometry={g.lip} rotation={[Math.PI / 2, 0, 0]}>
            <Mat color={color} metal={0.88} rough={0.25} />
          </mesh>
          <mesh geometry={g.face} rotation={[Math.PI / 2, 0, 0]}>
            <Mat
              color={color}
              metal={0.85}
              rough={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={g.hub} position={[0, -side * 0.012, 0]}>
            <Mat color={color} metal={0.85} rough={0.28} />
          </mesh>
          <mesh geometry={g.nut} position={[0, side * 0.012, 0]}>
            <Mat color={nut} metal={0.92} rough={0.23} />
          </mesh>
          <mesh
            geometry={g.lock}
            position={[0, side * 0.033, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <Mat
              color="#11151a"
              metal={0.2}
              rough={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            geometry={g.valve}
            position={[0.204, side * 0.008, 0]}
            rotation={[0, 0, 0.7]}
          >
            <Mat color="#b9bec2" metal={0.85} rough={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WheelAssemblies({
  car,
  body,
  shape,
  common,
}: {
  car: Car;
  body: Body;
  shape: Shape;
  common: Pick<ModelProps, "exploded" | "onSelect" | "onHover">;
}) {
  const brand = car.tyres.toUpperCase(),
    width = body.spec.tyreW;
  const resources = useMemo<WheelResources>(
    () => ({
      tyre: slickTyreGeometry(),
      branding: tyreTexture(brand),
      rim: rimGeometry(car.id, width),
    }),
    [brand, car.id, width],
  );
  useEffect(
    () => () => {
      resources.tyre.rubber.dispose();
      resources.tyre.sidewalls.forEach((g) => g.dispose());
      resources.branding.dispose();
      Object.values(resources.rim.geometry).forEach((g) => g.dispose());
    },
    [resources],
  );
  return (
    <group name="Shared visible wheel resources">
      {[body.frontX, body.rearX].flatMap((x) =>
        [-1, 1].map((side) => (
          <Part
            key={`${x}/${side}`}
            id="wheels"
            offset={[0, 0.04, side * 0.72]}
            layer="bodywork"
            {...common}
          >
            <group
              position={[x, body.spec.wheelR, side * body.wheelZ]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <Tyre
                resources={resources}
                scale={body.spec.wheelR / 0.357}
                width={width}
              />
              <Rim
                resources={resources}
                color={shape.rim}
                nut={car.category !== "LMGT3" ? "#d8b04a" : "#c9ccd2"}
                width={width}
              />
            </group>
            {x === body.frontX && side === 1 && (
              <Callouts system="wheels" body={body} shape={shape} />
            )}
          </Part>
        )),
      )}
    </group>
  );
}

function TailLights({ body, shape }: { body: Body; shape: Shape }) {
  const x = -body.spec.length / 2 - 0.004;
  const y = body.topAt(1) - 0.06;
  const w = body.spec.width;
  const red = "#ec1629";
  const view = useView();
  const bars: { p: V3; s: V3; r?: number }[] = [];
  switch (shape.tail) {
    case "bar":
      bars.push({ p: [x, y, 0], s: [0.02, 0.025, w * 0.82] });
      break;
    case "split":
      for (const s of [-1, 1])
        bars.push({ p: [x, y, s * w * 0.3], s: [0.02, 0.03, w * 0.3] });
      break;
    case "claw":
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          bars.push({
            p: [x, y - 0.03, s * (w * 0.3 + i * 0.07)],
            s: [0.02, 0.1, 0.02],
            r: s * 0.5,
          });
      break;
    case "tribar":
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          bars.push({
            p: [x, y - 0.06, s * (w * 0.28 + i * 0.07)],
            s: [0.02, 0.14, 0.03],
          });
      break;
    case "vertical":
      for (const s of [-1, 1])
        bars.push({ p: [x, y - 0.12, s * w * 0.44], s: [0.02, 0.28, 0.025] });
      break;
  }
  return (
    <group>
      {bars.map((b, i) => (
        <group key={i} position={b.p} rotation={[b.r ?? 0, 0, 0]}>
          <mesh position={[0.006, 0, 0]}>
            <boxGeometry args={[b.s[0], b.s[1] + 0.017, b.s[2] + 0.018]} />
            <Mat color="#11171b" rough={0.45} />
          </mesh>
          <mesh>
            <boxGeometry args={b.s} />
            <Mat
              color={red}
              emissive={red}
              emissiveIntensity={view.night ? 2.5 : 0.6}
              rough={0.2}
              coat={1}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[x, body.spec.kind === "gt" ? 0.35 : 0.3, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
        <Mat
          color={red}
          emissive={red}
          emissiveIntensity={view.night ? 2 : 0.6}
          rough={0.2}
          coat={1}
        />
      </mesh>
    </group>
  );
}

function DetailReady({
  onReady,
  identity,
}: {
  onReady?: () => void;
  identity: string;
}) {
  useEffect(() => {
    onReady?.();
  }, [onReady, identity]);
  return null;
}

export function CarModel({
  car,
  entry,
  paint,
  exploded,
  onSelect,
  onHover,
  fontsReady,
  onDetailReady,
}: ModelProps) {
  const { shape, body } = useBody(car);
  const view = useView();
  const teardown = useTeardown();
  const detail = studyDetailPolicy(
    { ...view, teardown: usesGarage(teardown.mode) },
    exploded,
  );
  useEffect(() => {
    if (view.hovered === "cockpit") void loadCockpit();
    else if (
      view.hovered &&
      [
        "engine",
        "gearbox",
        "fuel",
        "hybrid",
        "cooling",
        "suspension",
        "brakes",
      ].includes(view.hovered)
    )
      void loadMechanical();
  }, [view.hovered]);
  const proto = car.category !== "LMGT3";
  const exterior =
    paint === "livery"
      ? entry.livery.base
      : paint === "clay"
        ? "#d9dbe0"
        : CARBON;
  const common = { exploded, onSelect, onHover };
  const { from, to, roof } = shape.cockpit;
  const xFrom = body.x(from),
    xTo = body.x(to),
    xRoof = body.x(roof);
  const corners = [body.frontX, body.rearX].flatMap((x, i) =>
    [-1, 1].map((s) => ({ x, z: s * body.wheelZ, front: i === 0, s })),
  );
  const lmh = car.hybrid?.kind === "LMH front axle";
  return (
    <group>
      {!view.bodyRemoved && (
        <Part
          id="body"
          offset={[0, 1.8, 0]}
          layer="bodywork"
          rise={[0, 2.8, 0]}
          riseLayer="cooling"
          {...common}
          pickable={!view.xray}
        >
          <BodyShell
            body={body}
            shape={shape}
            car={car}
            entry={entry}
            paint={paint}
            fontsReady={fontsReady}
          />
          {shape.fin && <Fin body={body} shape={shape} color={exterior} />}
          <Glazing body={body} shape={shape} />
          <SkinDetails body={body} shape={shape} car={car} />
          <Mirrors body={body} shape={shape} color={exterior} />
          <Grille body={body} shape={shape} />
          <Callouts system="body" body={body} shape={shape} />
        </Part>
      )}
      {/* The wing is bodywork too, so it leaves with the shell unless the
          viewer has asked to inspect it. */}
      {(!view.bodyRemoved || view.selected === "wing") && (
        <Part
          id="wing"
          offset={[-0.55, 1.45, 0]}
          layer="bodywork"
          rise={[-0.2, 2.4, 0]}
          riseLayer="cooling"
          {...common}
        >
          <Wing body={body} shape={shape} entry={entry} paint={paint} />
          <Callouts system="wing" body={body} shape={shape} />
        </Part>
      )}
      {/* Lamp units live in the body panels, so they leave with the bodywork. */}
      {(!view.bodyRemoved || view.selected === "lights") && (
        <Part
          id="lights"
          offset={[-0.45, 0.8, 0]}
          layer="bodywork"
          rise={[-0.2, 2.4, 0]}
          riseLayer="cooling"
          {...common}
        >
          <HeadLights body={body} shape={shape} />
          <TailLights body={body} shape={shape} />
          <Callouts system="lights" body={body} shape={shape} />
        </Part>
      )}
      <Part id="floor" offset={[0, -0.18, 0]} layer="structure" {...common}>
        <Floor body={body} />
        <Callouts system="floor" body={body} shape={shape} />
      </Part>
      {detail.internals && (
        <Part id="chassis" offset={[0, 0.32, 0]} layer="structure" {...common}>
          <Callouts system="chassis" body={body} shape={shape} />
          {proto ? (
            <>
              <Loft
                color={CARBON}
                rough={0.45}
                metal={0}
                sections={[
                  [body.frontX + 0.55, 0.12, 0.36, 0.13],
                  [body.frontX, 0.08, 0.46, 0.2],
                  [xFrom + 0.08, 0.07, 0.4, 0.32],
                ]}
              />
              <Block
                p={[(xFrom + xTo) / 2, 0.095, 0]}
                s={[xFrom - xTo, 0.05, 0.76]}
                color={CARBON}
                metal={0}
                rough={0.55}
              />
              {[-1, 1].map((side) => (
                <group key={`tub${side}`}>
                  <Block
                    p={[(xFrom + xTo) / 2, 0.32, side * 0.35]}
                    s={[xFrom - xTo, 0.46, 0.075]}
                    color={CARBON}
                    metal={0}
                    rough={0.55}
                  />
                  <Block
                    p={[(xFrom + xTo) / 2, 0.55, side * 0.35]}
                    s={[xFrom - xTo, 0.035, 0.09]}
                    color={CARBON2}
                    metal={0}
                    rough={0.45}
                  />
                </group>
              ))}
              <Block
                p={[xTo + 0.015, 0.35, 0]}
                s={[0.045, 0.52, 0.76]}
                color={CARBON}
                metal={0}
                rough={0.55}
              />
            </>
          ) : (
            <>
              <Block
                p={[(xFrom + xTo) / 2, 0.12, 0]}
                s={[xFrom - xTo + 0.4, 0.03, 1.5]}
                color={CARBON}
              />
              {[-1, 1].map((s) => (
                <group key={s}>
                  <Rod
                    a={[xTo + 0.1, 0.12, s * 0.62]}
                    b={[xTo + 0.1, 1.08, s * 0.5]}
                    r={0.02}
                    color="#d8dde3"
                  />
                  <Rod
                    a={[xFrom + 0.05, 0.9, s * 0.72]}
                    b={[xRoof + 0.1, 1.1, s * 0.52]}
                    r={0.02}
                    color="#d8dde3"
                  />
                  <Rod
                    a={[xRoof + 0.1, 1.1, s * 0.52]}
                    b={[xTo + 0.1, 1.08, s * 0.5]}
                    r={0.02}
                    color="#d8dde3"
                  />
                  <Rod
                    a={[xFrom + 0.05, 0.14, s * 0.72]}
                    b={[xTo + 0.1, 0.62, s * 0.72]}
                    r={0.018}
                    color="#d8dde3"
                  />
                  <Rod
                    a={[xFrom + 0.05, 0.62, s * 0.72]}
                    b={[xTo + 0.1, 0.14, s * 0.72]}
                    r={0.018}
                    color="#d8dde3"
                  />
                  <Rod
                    a={[xFrom + 0.05, 0.14, s * 0.72]}
                    b={[xFrom + 0.05, 0.9, s * 0.72]}
                    r={0.02}
                    color="#d8dde3"
                  />
                </group>
              ))}
              <Rod
                a={[xTo + 0.1, 1.08, -0.5]}
                b={[xTo + 0.1, 1.08, 0.5]}
                r={0.02}
                color="#d8dde3"
              />
              <Rod
                a={[xTo + 0.1, 1.08, -0.5]}
                b={[xTo + 0.1, 0.12, 0.62]}
                r={0.018}
                color="#d8dde3"
              />
            </>
          )}
        </Part>
      )}
      <Part id="cockpit" offset={[0.03, 0.72, 0]} layer="cabin" {...common}>
        <Callouts system="cockpit" body={body} shape={shape} />
        {detail.internals ? (
          <Suspense
            fallback={<CabinOverview car={car} body={body} shape={shape} />}
          >
            <CockpitAssembly car={car} body={body} shape={shape} />
            <DetailReady
              onReady={onDetailReady}
              identity={`${car.id}/cockpit`}
            />
          </Suspense>
        ) : (
          <CabinOverview car={car} body={body} shape={shape} />
        )}
      </Part>
      {detail.internals && (
        <Suspense fallback={null}>
          <Part id="fuel" offset={[0, 0.5, 0]} layer="cabin" {...common}>
            <FuelAssembly car={car} body={body} shape={shape} />
            <Callouts system="fuel" body={body} shape={shape} />
          </Part>
          <Part id="engine" offset={[-0.08, 0.5, 0]} layer="cabin" {...common}>
            <EngineAssembly car={car} body={body} shape={shape} />
            <Callouts system="engine" body={body} shape={shape} />
          </Part>
          <Part
            id="gearbox"
            offset={[-0.48, 0.34, 0]}
            layer="cabin"
            {...common}
          >
            <GearboxAssembly car={car} body={body} shape={shape} />
            <Callouts system="gearbox" body={body} shape={shape} />
          </Part>
          {car.hybrid && (
            <Part
              id="hybrid"
              offset={lmh ? [0.45, 0.38, 0] : [-0.15, 0.34, 0]}
              layer="cabin"
              {...common}
            >
              <HybridAssembly car={car} body={body} shape={shape} />
              <Callouts system="hybrid" body={body} shape={shape} />
            </Part>
          )}
          {([-1, 1] as const).map((side) => (
            <Part
              key={`cool${side}`}
              id="cooling"
              offset={[0.06, 0.22, side * 0.55]}
              layer="cooling"
              {...common}
            >
              <CoolingAssembly
                car={car}
                body={body}
                shape={shape}
                side={side}
              />
              {side === 1 && (
                <Callouts system="cooling" body={body} shape={shape} />
              )}
            </Part>
          ))}
          <DetailReady
            onReady={onDetailReady}
            identity={`${car.id}/mechanical`}
          />
        </Suspense>
      )}
      {corners.map((c) => (
        <group key={`${c.x}/${c.z}`}>
          {detail.wheelEnds ? (
            <Suspense
              fallback={
                <Part
                  id="brakes"
                  offset={[0, 0.06, c.s * 0.5]}
                  layer="cabin"
                  {...common}
                >
                  <BrakeOverview
                    car={car}
                    body={body}
                    x={c.x}
                    z={c.z}
                    front={c.front}
                  />
                </Part>
              }
            >
              <Part
                id="suspension"
                offset={[0, 0.04, c.s * 0.32]}
                layer="cabin"
                {...common}
              >
                <SuspensionAssembly
                  car={car}
                  body={body}
                  x={c.x}
                  z={c.z}
                  front={c.front}
                />
                {c.front && c.s === 1 && (
                  <Callouts system="suspension" body={body} shape={shape} />
                )}
              </Part>
              <Part
                id="brakes"
                offset={[0, 0.06, c.s * 0.5]}
                layer="cabin"
                {...common}
              >
                <BrakeAssembly
                  car={car}
                  body={body}
                  x={c.x}
                  z={c.z}
                  front={c.front}
                />
                {c.front && c.s === 1 && (
                  <Callouts system="brakes" body={body} shape={shape} />
                )}
              </Part>
            </Suspense>
          ) : (
            <Part
              id="brakes"
              offset={[0, 0.06, c.s * 0.5]}
              layer="cabin"
              {...common}
            >
              <BrakeOverview
                car={car}
                body={body}
                x={c.x}
                z={c.z}
                front={c.front}
              />
            </Part>
          )}
        </group>
      ))}
      {!view.wheelsRemoved && (
        <WheelAssemblies car={car} body={body} shape={shape} common={common} />
      )}
    </group>
  );
}
