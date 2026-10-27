import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Car } from "../data/cars.ts";
import { engineeringLayoutFor } from "../data/engineeringDetails.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import { Block, Loft, Mat, Rod, useView } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
const EngineSection = lazy(() =>
  import("./MachinerySections.tsx").then((m) => ({ default: m.EngineSection })),
);
const TransmissionSection = lazy(() =>
  import("./MachinerySections.tsx").then((m) => ({
    default: m.TransmissionSection,
  })),
);
import {
  annularDiscGeometry,
  coolingFanPhase,
  coolingFanTravel,
  crankMainPositions,
  engineBanks,
  drivelineInterfaces,
  mechanicalLayout,
  rotatedBankPoint,
} from "./mechanicalGeometry.ts";

const ALU = "#8f999f";
const CAST = "#626c72";
const TI = "#b0b5b6";
const CARBON = "#20272c";
const RUBBER = "#151b1e";
const BRASS = "#b29355";
const HV = "#ec751e";

export type AssemblyProps = { car: Car; body: Body; shape: Shape };
export type MechanicalCornerProps = {
  car: Car;
  body: Body;
  x: number;
  z: number;
  front: boolean;
};
type Pose = { p: V3; r?: V3; s?: V3 };

type RoundedProps = {
  p: V3;
  s: V3;
  color?: string;
  metal?: number;
  rough?: number;
  radius?: number;
  r?: V3;
};
function Rounded({
  p,
  s,
  color = CAST,
  metal = 0.75,
  rough = 0.43,
  radius = 0.02,
  r,
}: RoundedProps) {
  const key = JSON.stringify(s);
  const geometry = useMemo(() => {
    const [x, y, z] = JSON.parse(key) as V3;
    return new RoundedBoxGeometry(
      x,
      y,
      z,
      2,
      Math.min(radius, x / 3, y / 3, z / 3),
    );
  }, [key, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      position={p}
      rotation={r}
      geometry={geometry}
      castShadow={Math.max(...s) > 0.12}
      receiveShadow
    >
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  );
}

// Repeated fins, bolts and vane elements share one draw call per material.
function Repeated({
  poses,
  size,
  color = TI,
  metal = 0.8,
  rough = 0.4,
  bolt = false,
  annulus,
}: {
  poses: Pose[];
  size?: V3;
  color?: string;
  metal?: number;
  rough?: number;
  bolt?: boolean;
  annulus?: V3;
}) {
  const key = JSON.stringify(poses);
  const transforms = useMemo(() => JSON.parse(key) as Pose[], [key]);
  const dimensions = JSON.stringify(size ?? [1, 1, 1]);
  const ringDimensions = JSON.stringify(annulus ?? null);
  const g = useMemo(() => {
    if (bolt) return new THREE.CylinderGeometry(0.008, 0.008, 0.006, 6);
    if (ringDimensions !== "null") {
      const [outer, inner, thickness] = JSON.parse(ringDimensions) as V3;
      return annularDiscGeometry(outer, inner, thickness);
    }
    return new THREE.BoxGeometry(...(JSON.parse(dimensions) as V3));
  }, [bolt, dimensions, ringDimensions]);
  useEffect(() => () => g.dispose(), [g]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    for (const [i, pose] of transforms.entries()) {
      rotation.setFromEuler(new THREE.Euler(...(pose.r ?? [0, 0, 0])));
      matrix.compose(
        new THREE.Vector3(...pose.p),
        rotation,
        new THREE.Vector3(...(pose.s ?? [1, 1, 1])),
      );
      mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [transforms]);
  return (
    <instancedMesh
      ref={mesh}
      args={[g, undefined, transforms.length]}
      receiveShadow
    >
      <Mat color={color} metal={metal} rough={rough} />
    </instancedMesh>
  );
}

function Pipes({
  paths,
  radius = 0.012,
  color = RUBBER,
  metal = 0,
  rough = 0.65,
}: {
  paths: V3[][];
  radius?: number;
  color?: string;
  metal?: number;
  rough?: number;
}) {
  const key = JSON.stringify(paths);
  const g = useMemo(() => {
    const routes = JSON.parse(key) as V3[][];
    const pieces = routes
      .filter((p) => p.length > 1)
      .map(
        (p) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(
              p.map((v) => new THREE.Vector3(...v)),
              false,
              "centripetal",
            ),
            Math.max(16, p.length * 8),
            radius,
            8,
            false,
          ),
      );
    const merged = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, [key, radius]);
  useEffect(() => () => g?.dispose(), [g]);
  return g ? (
    <mesh geometry={g} castShadow={radius > 0.021}>
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  ) : null;
}

function Cylinder({
  p,
  radius,
  length,
  axis = "y",
  color = ALU,
  metal = 0.8,
  rough = 0.4,
}: {
  p: V3;
  radius: number;
  length: number;
  axis?: "x" | "y" | "z";
  color?: string;
  metal?: number;
  rough?: number;
}) {
  return (
    <mesh
      position={p}
      rotation={
        axis === "x"
          ? [0, 0, Math.PI / 2]
          : axis === "z"
            ? [Math.PI / 2, 0, 0]
            : undefined
      }
      castShadow={radius > 0.05 || length > 0.17}
      receiveShadow
    >
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  );
}

function Collar({
  p,
  radius = 0.021,
  axis = "x",
}: {
  p: V3;
  radius?: number;
  axis?: "x" | "y" | "z";
}) {
  return (
    <Cylinder
      p={p}
      radius={radius}
      length={0.008}
      axis={axis}
      color={TI}
      rough={0.28}
    />
  );
}

function Turbocharger({ p, side }: { p: V3; side: number }) {
  // Illustrative cartridge: hot turbine volute, bearing housing, compressor.
  // Wheel blade count and diameters are not a manufacturer drawing.
  const blades = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return {
      p: [0.108, Math.cos(a) * 0.022, Math.sin(a) * 0.022] as V3,
      r: [a, 0.42, 0] as V3,
    };
  });
  return (
    <group name="engine-turbo" position={p}>
      <mesh rotation={[0, Math.PI / 2, side * 0.15]} castShadow>
        <torusGeometry args={[0.048, 0.02, 10, 28]} />
        <Mat color="#6a5748" metal={0.78} rough={0.58} />
      </mesh>
      <mesh position={[-0.01, -0.055, side * 0.01]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.026, 0.07, 16]} />
        <Mat color="#5a4b40" metal={0.7} rough={0.55} />
      </mesh>
      <Cylinder
        p={[0.04, 0, 0]}
        radius={0.026}
        length={0.055}
        axis="x"
        color={CAST}
        rough={0.4}
      />
      <mesh position={[0.086, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.046, 0.052, 0.042, 28]} />
        <Mat color="#d7dde0" metal={0.88} rough={0.28} />
      </mesh>
      <mesh position={[0.122, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.04, 0.034, 24]} />
        <Mat color="#c5ccd0" metal={0.84} rough={0.26} />
      </mesh>
      <mesh position={[0.141, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.01, 0.023, 24]} />
        <Mat color="#1b252b" metal={0.45} rough={0.48} side={THREE.DoubleSide} />
      </mesh>
      <Cylinder
        p={[0.066, 0, 0]}
        radius={0.033}
        length={0.008}
        axis="x"
        color={TI}
        rough={0.3}
      />
      <Repeated poses={blades} size={[0.004, 0.03, 0.012]} color="#e7ebed" metal={0.92} rough={0.22} />
      <Repeated
        bolt
        poses={Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return {
            p: [0.1, Math.cos(a) * 0.04, Math.sin(a) * 0.04] as V3,
            r: [0, 0, Math.PI / 2] as V3,
          };
        })}
      />
      <Pipes
        paths={[
          [
            [0, -0.045, side * 0.02],
            [-0.05, -0.07, side * 0.05],
            [-0.16, -0.05, side * 0.08],
          ],
        ]}
        radius={0.024}
        color="#8f7d68"
        metal={0.86}
        rough={0.55}
      />
      <Cylinder
        p={[0.012, 0.072, side * 0.036]}
        radius={0.02}
        length={0.028}
        color="#b7aa90"
        metal={0.55}
        rough={0.45}
      />
      <Rod
        a={[0.012, 0.072, side * 0.036]}
        b={[-0.04, 0.02, side * 0.03]}
        r={0.004}
        color={TI}
      />
    </group>
  );
}

export function EngineAssembly({ car, body, shape }: AssemblyProps) {
  const sectioned = useView().sectioned ?? false;
  const layout = mechanicalLayout(car, body, shape);
  const architecture = engineeringLayoutFor(car);
  const drySump = architecture.drySump;
  const L = layout.engineLength;
  const banks = engineBanks(car, L);
  const mains = crankMainPositions(L, banks[0]?.cylinders.length ?? 1);
  const flat = car.engine.config === "F";
  const vee = car.engine.config === "V";
  const cover =
    car.make === "Ferrari"
      ? "#9e2027"
      : car.make === "Aston Martin"
        ? "#38544a"
        : "#343d43";
  const turboCount = architecture.turboCount;
  const turboPositions: V3[] = Array.from({ length: turboCount }, (_, i) =>
    car.engine.config === "I"
      ? [-L * 0.25 + i * L * 0.44, 0.04, 0.31]
      : [-L * 0.43, 0.025, turboCount === 1 ? 0.3 : (i ? 1 : -1) * 0.3],
  );
  const intakePaths: V3[][] = [];
  const headers: V3[][] = [];
  for (const bank of banks) {
    for (const x of bank.cylinders) {
      const side = bank.side || 1;
      const port = rotatedBankPoint(x, 0.235, -side * 0.095, bank.angle);
      intakePaths.push([
        port,
        [x, 0.305, side * 0.07],
        [x, car.engine.config === "F" ? 0.26 : 0.375, 0],
      ]);
      const exhaust = rotatedBankPoint(x, 0.205, side * 0.11, bank.angle);
      headers.push([
        exhaust,
        [x + 0.02, 0.05, side * 0.285],
        [-L * 0.5 - 0.04, -0.015, side * 0.28],
      ]);
    }
  }
  const frontBolts: Pose[] = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return {
      p: [L / 2 + 0.018, Math.cos(a) * 0.13, Math.sin(a) * 0.13],
      r: [0, 0, Math.PI / 2],
    };
  });
  return (
    <group
      position={[layout.engineX, layout.engineY, 0]}
      scale={layout.engineScale}
    >
      <group name="engine-crankcase">
        <Rounded
          p={[0, flat ? -0.02 : -0.01, sectioned ? -0.035 : 0]}
          s={[
            L * 0.98,
            flat ? 0.1 : 0.125,
            sectioned ? 0.18 : flat ? 0.22 : vee ? 0.22 : 0.26,
          ]}
          color={CAST}
          radius={0.014}
        />
        {vee && !sectioned && (
          <Rounded
            p={[0, 0.05, 0]}
            s={[L * 0.86, 0.03, 0.09]}
            color="#5c676d"
            radius={0.006}
          />
        )}
        {sectioned &&
          mains.map((x) => (
            <group key={x}>
              <Rounded
                p={[x, -0.028, -0.015]}
                s={[0.032, 0.042, 0.15]}
                color="#4a545a"
                radius={0.004}
              />
              <Cylinder
                p={[x, 0, 0]}
                radius={0.022}
                length={0.018}
                axis="x"
                color="#9c8866"
                metal={0.65}
                rough={0.42}
              />
            </group>
          ))}
        {!sectioned && (
          <Cylinder
            p={[L / 2 + 0.008, 0.01, 0]}
            radius={flat ? 0.09 : 0.115}
            length={0.026}
            axis="x"
            color={CAST}
          />
        )}
        <Rounded
          p={[L * 0.5, 0.015, sectioned ? -0.04 : 0]}
          s={[
            0.05,
            flat ? 0.14 : 0.17,
            sectioned ? 0.12 : flat ? 0.16 : 0.2,
          ]}
          color="#59636a"
          radius={0.01}
        />
        {!sectioned && (
          <Cylinder
            p={[L / 2 + 0.05, -0.025, 0]}
            radius={0.046}
            length={0.026}
            axis="x"
            color="#2a3136"
            metal={0.45}
            rough={0.48}
          />
        )}
      </group>
      {sectioned && (
        <Suspense fallback={null}>
          <EngineSection car={car} length={L} />
        </Suspense>
      )}
      <group name="engine-sump">
        <Rounded
          p={[0.01, drySump ? -0.112 : -0.145, 0]}
          s={[L * 0.86, drySump ? 0.05 : 0.08, drySump ? 0.22 : 0.26]}
          color="#58636a"
          radius={0.012}
        />
        <Rounded
          p={[L * 0.36, drySump ? -0.085 : -0.11, 0.13]}
          s={[0.1, 0.055, 0.045]}
          color={ALU}
          radius={0.008}
        />
        <Repeated
          poses={Array.from({ length: 8 }, (_, i) => ({
            p: [-L * 0.36 + (i * L * 0.72) / 7, drySump ? -0.1 : -0.125, 0] as V3,
          }))}
          size={[0.01, drySump ? 0.035 : 0.045, drySump ? 0.2 : 0.24]}
          color="#9aa3a8"
          metal={0.7}
          rough={0.4}
        />
      </group>
      <Cylinder
        p={[L / 2 + 0.03, -0.02, 0]}
        radius={0.054}
        length={0.025}
        axis="x"
        color="#263238"
        rough={0.55}
      />
      <Repeated bolt poses={frontBolts} />
      {!sectioned &&
        banks.map((bank) => (
          <group
            key={bank.side}
            name="engine-bank"
            rotation={[bank.angle, 0, 0]}
          >
            <Rounded
              p={[0, 0.12, 0]}
              s={[L * 0.96, 0.15, flat ? 0.16 : 0.21]}
              color="#828b8f"
              radius={0.01}
            />
            <Rounded
              p={[0, 0.198, 0]}
              s={[L * 0.94, 0.008, flat ? 0.15 : 0.2]}
              color="#1a2124"
              metal={0.05}
              rough={0.85}
              radius={0.002}
            />
            <Rounded
              p={[0, 0.267, 0]}
              s={[L * 0.96, 0.066, 0.226]}
              color={ALU}
              radius={0.012}
            />
            <Rounded
              p={[0, 0.325, 0]}
              s={[L * 0.94, 0.048, 0.205]}
              color={cover}
              metal={0.12}
              rough={0.48}
              radius={0.012}
            />
            <Repeated
              poses={Array.from({ length: 6 }, (_, i) => ({
                p: [-L * 0.37 + i * L * 0.145, 0.352, 0],
              }))}
              size={[0.009, 0.007, 0.14]}
              color="#171f23"
              metal={0.1}
            />
            <Repeated
              bolt
              poses={bank.cylinders.flatMap((x) =>
                [-1, 1].map((side) => ({ p: [x, 0.355, side * 0.079] as V3 })),
              )}
            />
            {bank.cylinders.map((x, i) => (
              <group key={i}>
                <Rounded
                  p={[x, 0.366, 0]}
                  s={[0.044, 0.021, 0.05]}
                  color="#1d272b"
                  metal={0.05}
                  radius={0.005}
                />
                <Cylinder
                  p={[x, 0.276, -0.121]}
                  radius={0.012}
                  length={0.03}
                  axis="z"
                  color={BRASS}
                />
              </group>
            ))}
            <Pipes
              paths={[
                [
                  [-L * 0.39, 0.365, 0.023],
                  [0, 0.37, 0.03],
                  [L * 0.39, 0.365, 0.023],
                ],
              ]}
              radius={0.004}
            />
            <Rod
              a={[-L * 0.44, 0.238, -0.116]}
              b={[L * 0.44, 0.238, -0.116]}
              r={0.011}
              color={ALU}
            />
            <Repeated
              bolt
              poses={[-L * 0.41, L * 0.41].flatMap((x) =>
                [-1, 1].map((side) => ({
                  p: [x, 0.05, side * 0.148] as V3,
                  r: [Math.PI / 2, 0, 0] as V3,
                })),
              )}
            />
          </group>
        ))}
      {sectioned &&
        banks.map((bank) => (
          <group
            key={`section-wall${bank.side}`}
            name="engine-bank"
            rotation={[bank.angle, 0, 0]}
          >
            <Rounded
              p={[0, 0.1, bank.side < 0 ? -0.02 : -0.09]}
              s={[L * 0.96, 0.16, bank.side < 0 ? 0.12 : 0.028]}
              color="#828b8f"
              radius={0.006}
            />
            <Rounded
              p={[0, 0.21, bank.side < 0 ? -0.015 : -0.08]}
              s={[L * 0.92, 0.055, bank.side < 0 ? 0.1 : 0.026]}
              color={ALU}
              radius={0.005}
            />
            <Rounded
              p={[0, 0.3, bank.side < 0 ? 0 : -0.07]}
              s={[L * 0.88, 0.04, bank.side < 0 ? 0.12 : 0.03]}
              color={cover}
              metal={0.12}
              rough={0.48}
              radius={0.005}
            />
            <Repeated
              poses={bank.cylinders.map((x) => ({
                p: [x, 0.31, bank.side < 0 ? 0.04 : -0.055] as V3,
              }))}
              size={[0.02, 0.012, 0.04]}
              color="#6d777c"
              metal={0.75}
            />
            <Repeated
              bolt
              poses={bank.cylinders.map((x) => ({
                p: [x, 0.245, bank.side < 0 ? 0.055 : 0.02] as V3,
              }))}
            />
          </group>
        ))}
      {!sectioned && (
        <Pipes
          paths={intakePaths}
          radius={0.019}
          color="#687a82"
          metal={0.75}
          rough={0.4}
        />
      )}

      {!sectioned && (
        <>
          <Rounded
            p={[0.015, car.engine.config === "F" ? 0.29 : 0.4, 0]}
            s={[L * 0.82, 0.08, 0.145]}
            color={CARBON}
            metal={0}
            rough={0.55}
            radius={0.03}
          />
          <Cylinder
            p={[L * 0.48, car.engine.config === "F" ? 0.29 : 0.4, 0]}
            radius={0.035}
            length={0.09}
            axis="x"
            color={ALU}
          />
          <Collar
            p={[L * 0.52, car.engine.config === "F" ? 0.29 : 0.4, 0]}
            radius={0.039}
          />
        </>
      )}
      <Pipes
        paths={headers}
        radius={0.015}
        color="#9c8b72"
        metal={0.9}
        rough={0.68}
      />
      {turboCount === 1 && banks.length === 2 && (
        <Pipes
          paths={[
            [
              [-L * 0.5 - 0.04, -0.015, -0.28],
              [-L * 0.5 - 0.12, -0.04, -0.19],
              [-L * 0.5 - 0.12, -0.04, 0.16],
              [-L * 0.43 - 0.035, 0.015, 0.24],
            ],
          ]}
          radius={0.021}
          color="#9c8b72"
          metal={0.9}
          rough={0.68}
        />
      )}
      {turboPositions.map((p, i) => (
        <Turbocharger key={i} p={p} side={Math.sign(p[2]) || 1} />
      ))}
      {!sectioned && turboCount > 0 && (
        <Pipes
          paths={turboPositions.map((p) => [
            [p[0] + 0.07, p[1] + 0.05, p[2]],
            [0, 0.25, p[2]],
            [L * 0.41, 0.33, p[2] * 0.65],
            [L * 0.53, 0.4, 0],
          ])}
          radius={0.026}
          color="#252f36"
          rough={0.5}
        />
      )}
      {/* Remote tank only where the profile records a dry sump. Routes stay illustrative. */}
      {drySump && (
        <group>
          <Cylinder
            p={[L * 0.43, 0.12, -0.29]}
            radius={0.065}
            length={0.24}
            color="#8b9599"
          />
          <Cylinder
            p={[L * 0.43, 0.249, -0.29]}
            radius={0.067}
            length={0.013}
            color={TI}
          />
          <Cylinder
            p={[L * 0.43, 0.265, -0.29]}
            radius={0.019}
            length={0.024}
            color="#2b343a"
            metal={0.3}
          />
          <Pipes
            paths={[
              [
                [L * 0.4, 0.02, -0.29],
                [L * 0.24, -0.08, -0.28],
                [L * 0.34, -0.08, -0.15],
              ],
              [
                [L * 0.43, 0.21, -0.23],
                [L * 0.32, 0.23, -0.2],
                [0, 0.12, -0.15],
              ],
            ]}
            radius={0.009}
            color="#343f46"
            rough={0.7}
          />
          <Collar p={[L * 0.4, 0.02, -0.29]} radius={0.014} axis="y" />
        </group>
      )}
      <Repeated
        bolt
        poses={[-1, 1].flatMap((side) =>
          Array.from({ length: 7 }, (_, i) => ({
            p: [-L * 0.39 + i * L * 0.13, -0.079, side * 0.137] as V3,
          })),
        )}
      />
    </group>
  );
}

export function GearboxAssembly({ car, body, shape }: AssemblyProps) {
  const sectioned = useView().sectioned ?? false;
  const l = mechanicalLayout(car, body, shape);
  const transverse = l.gearboxTransverse;
  const len = transverse ? 0.38 : l.gearboxLength;
  const halfWidth = transverse ? 0.32 : 0.165;
  const x = l.gearboxX;
  const ribCount = transverse ? 8 : 10;
  const interfaces = drivelineInterfaces(car, l);
  const direction = interfaces.direction;
  const end = x + (direction * len) / 2;
  return (
    <group>
      <group name="gearbox-case">
      {sectioned ? (
        <>
          <Rounded
            p={[x, 0.143, 0]}
            s={[len, 0.015, halfWidth * 2]}
            color={CAST}
            radius={0.005}
          />
          <Rounded
            p={[x, 0.303, -halfWidth + 0.012]}
            s={[len, 0.275, 0.021]}
            color={CAST}
            radius={0.008}
          />
          <Rounded
            p={[x, 0.443, -halfWidth + 0.011]}
            s={[len, 0.014, 0.035]}
            color={ALU}
            radius={0.004}
          />
          <Repeated
            poses={Array.from({ length: ribCount }, (_, i) => ({
              p: [
                x - len * 0.44 + (i * len * 0.88) / (ribCount - 1),
                0.305,
                -halfWidth,
              ] as V3,
            }))}
            size={[0.008, 0.255, 0.02]}
            color="#616e75"
          />
          {[-1, 1].map((endSide) => (
            <Rounded
              key={endSide}
              p={[x + endSide * (len / 2 - 0.012), 0.3, 0]}
              s={[0.018, 0.28, halfWidth * 1.7]}
              color="#545e64"
              radius={0.004}
            />
          ))}
        </>
      ) : (
        <>
          <Loft
            color="#79868d"
            metal={0.82}
            rough={0.45}
            radius={0.035}
            sections={[
              [x + len / 2, 0.18, 0.44, halfWidth],
              [x, 0.17, 0.45, halfWidth * 0.95],
              [x - len / 2, 0.2, 0.41, halfWidth * 0.8],
            ]}
          />
          <Repeated
            poses={Array.from({ length: ribCount }, (_, i) => ({
              p: [x - len * 0.44 + (i * len * 0.88) / (ribCount - 1), 0.31, 0],
            }))}
            size={[0.008, 0.255, halfWidth * 2.03]}
            color="#616e75"
          />
          <Rounded
            p={[x, 0.451, 0]}
            s={[len * 0.7, 0.018, halfWidth * 1.25]}
            color={ALU}
            radius={0.006}
          />
          <Repeated
            bolt
            poses={Array.from({ length: 6 }, (_, i) =>
              [-1, 1].map((side) => ({
                p: [
                  x - len * 0.28 + (i * len * 0.56) / 5,
                  0.466,
                  side * halfWidth * 0.52,
                ] as V3,
              })),
            ).flat()}
          />
        </>
      )}
      {!sectioned && (
        <>
          <Cylinder
            p={[end + direction * 0.035, l.engineY, 0]}
            radius={0.15}
            length={0.065}
            axis="x"
            color={CAST}
          />
          <Cylinder
            p={[end + direction * 0.075, l.engineY, 0]}
            radius={0.152}
            length={0.011}
            axis="x"
            color={ALU}
          />
          <Repeated
            bolt
            poses={Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return {
                p: [
                  end + direction * 0.082,
                  l.engineY + Math.cos(a) * 0.128,
                  Math.sin(a) * 0.128,
                ],
                r: [0, 0, Math.PI / 2],
              };
            })}
          />
        </>
      )}
      </group>
      {sectioned && (
        <Suspense fallback={null}>
          <TransmissionSection car={car} body={body} shape={shape} />
        </Suspense>
      )}
      {car.engine.position !== "front-mid" &&
        interfaces.couplingLength > 0.01 && (
          <>
            <Rod
              a={[interfaces.engineOutputX, l.engineY, 0]}
              b={[interfaces.bellhousingX, l.engineY, 0]}
              r={sectioned ? 0.016 : 0.075}
              color={CAST}
              metal={0.8}
            />
            {!sectioned && (
              <Repeated
                annulus={[0.083, 0.074, 0.006]}
                poses={Array.from({ length: 6 }, (_, i) => ({
                  p: [
                    interfaces.engineOutputX +
                      ((interfaces.bellhousingX - interfaces.engineOutputX) *
                        (i + 0.5)) /
                        6,
                    l.engineY,
                    0,
                  ] as V3,
                  r: [0, Math.PI / 2, 0] as V3,
                }))}
                color={ALU}
              />
            )}
          </>
        )}
      <Cylinder
        p={[x, 0.477, halfWidth + 0.025]}
        radius={0.025}
        length={0.14}
        axis="x"
        color="#313e46"
      />
      <Rod
        a={[x - 0.075, 0.477, halfWidth + 0.025]}
        b={[x - 0.13, 0.46, halfWidth * 0.6]}
        r={0.005}
        color={TI}
      />
      <Rounded
        p={[x + 0.015, 0.42, -halfWidth - 0.035]}
        s={[0.09, 0.045, 0.045]}
        color="#293941"
        metal={0.1}
        radius={0.008}
      />
      <Pipes
        paths={[
          [
            [x + 0.05, 0.405, -halfWidth - 0.04],
            [x + 0.1, 0.25, -halfWidth - 0.04],
            [x - 0.12, 0.2, -halfWidth * 0.9],
          ],
        ]}
        radius={0.008}
      />
      <Cylinder
        p={[body.rearX, body.spec.wheelR, 0]}
        radius={0.085}
        length={0.22}
        axis="z"
        color={CAST}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod
            a={[body.rearX, body.spec.wheelR, side * 0.12]}
            b={[body.rearX, body.spec.wheelR, side * (body.wheelZ - 0.12)]}
            r={0.016}
            color={TI}
          />
          {[0.16, body.wheelZ - 0.17].map((z, i) => (
            <group key={i}>
              <Bellows p={[body.rearX, body.spec.wheelR, side * z]} />
            </group>
          ))}
        </group>
      ))}
      {car.engine.position === "front-mid" && (
        <>
          <Rod
            a={[l.engineX - l.engineLength / 2, 0.3, 0]}
            b={[l.rearTransaxle ? x + len / 2 : body.rearX, 0.3, 0]}
            r={0.03}
            color={CARBON}
            metal={0}
          />
          <Cylinder
            p={[
              l.rearTransaxle ? x + len / 2 + 0.06 : x - len / 2 - 0.03,
              0.3,
              0,
            ]}
            radius={0.04}
            length={0.07}
            axis="x"
            color={CAST}
          />
        </>
      )}
    </group>
  );
}

function Bellows({
  p,
  axis = "z",
  radius = 0.034,
  length = 0.085,
}: {
  p: V3;
  axis?: "x" | "y" | "z";
  radius?: number;
  length?: number;
}) {
  const g = useMemo(() => {
    const profile = Array.from(
      { length: 21 },
      (_, i) =>
        new THREE.Vector2(
          radius * (i % 2 ? 0.78 : 1),
          -length / 2 + (length * i) / 20,
        ),
    );
    return new THREE.LatheGeometry(profile, 32);
  }, [radius, length]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh
      geometry={g}
      position={p}
      rotation={
        axis === "z"
          ? [Math.PI / 2, 0, 0]
          : axis === "x"
            ? [0, 0, Math.PI / 2]
            : undefined
      }
    >
      <Mat color={RUBBER} metal={0} rough={0.85} />
    </mesh>
  );
}

function RadiatorCore({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <Rounded
        p={[0, 0, 0]}
        s={[0.065, height, width]}
        color="#414d53"
        metal={0.75}
        rough={0.64}
        radius={0.007}
      />
      <Repeated
        poses={Array.from({ length: 48 }, (_, i) => ({
          p: [0.038, -height * 0.46 + (i * height * 0.92) / 47, 0],
        }))}
        size={[0.012, 0.0026, width * 0.92]}
        color="#a2adb1"
        rough={0.52}
      />
      <Repeated
        poses={Array.from({ length: 12 }, (_, i) => ({
          p: [0.04, 0, -width * 0.44 + (i * width * 0.88) / 11],
        }))}
        size={[0.009, height * 0.94, 0.004]}
        color="#687a82"
        rough={0.54}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rounded
            p={[0, 0, side * (width / 2 + 0.018)]}
            s={[0.09, height * 1.07, 0.045]}
            color={ALU}
            radius={0.012}
          />
          <Rounded
            p={[0, side * (height / 2 + 0.016), 0]}
            s={[0.075, 0.024, width + 0.09]}
            color="#29373e"
            metal={0.1}
            rough={0.65}
            radius={0.006}
          />
        </group>
      ))}
      <Repeated
        bolt
        poses={[-1, 1].flatMap((y) =>
          [-1, 1].map((z) => ({
            p: [0.052, y * height * 0.43, z * (width / 2 + 0.018)] as V3,
            r: [0, 0, Math.PI / 2] as V3,
          })),
        )}
      />
    </group>
  );
}

function CoolingFans({
  width,
  height,
  phase,
}: {
  width: number;
  height: number;
  phase: number;
}) {
  const centers = width > 0.7 ? [-width * 0.23, width * 0.23] : [0];
  const radius = Math.min(height * 0.42, (width / centers.length) * 0.36);
  const blades = 9;
  const bladePoses = centers.flatMap((z) =>
    Array.from({ length: blades }, (_, i) => {
      const a = (i / blades) * Math.PI * 2;
      return {
        p: [
          0,
          Math.cos(a) * radius * 0.46,
          z + Math.sin(a) * radius * 0.46,
        ] as V3,
        r: [a, 0.48, 0] as V3,
      };
    }),
  );
  return (
    <>
      <group
        name="fan-shroud"
        position={[0.068 + phase * coolingFanTravel.shroud, 0, 0]}
      >
        {centers.map((z) => (
          <group key={z} position={[0, 0, z]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[radius, 0.011, 8, 24]} />
              <Mat color="#1a2226" metal={0.2} rough={0.72} />
            </mesh>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2;
              return (
                <Block
                  key={i}
                  p={[
                    -0.004,
                    Math.cos(a) * radius * 0.52,
                    Math.sin(a) * radius * 0.52,
                  ]}
                  s={[0.008, radius * 0.42, 0.012]}
                  r={[a, 0, 0]}
                  color="#2a3338"
                  metal={0.25}
                  rough={0.62}
                />
              );
            })}
          </group>
        ))}
      </group>
      <group
        name="cooling-fan"
        position={[0.074 + phase * coolingFanTravel.rotor, 0, 0]}
      >
        {centers.map((z) => (
          <group key={z}>
            <Cylinder
              p={[0, 0, z]}
              radius={radius * 0.2}
              length={0.028}
              axis="x"
              color="#2c353b"
              metal={0.45}
              rough={0.42}
            />
            <Cylinder
              p={[-0.018, 0, z]}
              radius={radius * 0.11}
              length={0.024}
              axis="x"
              color="#465159"
            />
          </group>
        ))}
        <Repeated
          poses={bladePoses}
          size={[0.005, radius * 0.58, radius * 0.22]}
          color="#232a2e"
          metal={0.4}
          rough={0.46}
        />
      </group>
    </>
  );
}

export function CoolingAssembly({
  car,
  body,
  shape,
  side,
}: AssemblyProps & { side: -1 | 1 }) {
  const phase = coolingFanPhase(useView().exploded ?? 0);
  const l = mechanicalLayout(car, body, shape);
  const proto = car.category !== "LMGT3";
  // Representative duct/circuit paths. A GT's source metadata does not establish
  // exact radiator or fan placement, and this is not a factory plumbing model.
  if (!proto && side < 0) return null;
  const width = proto ? 0.42 : 0.89;
  const height = proto ? 0.31 : 0.34;
  const cx = proto
    ? body.x(shape.cockpit.to) + 0.12
    : body.spec.length / 2 - 0.36;
  const cy = proto ? 0.32 : 0.34;
  const cz = proto ? side * 0.55 : 0;
  const endpoint = proto ? side * 0.24 : side * 0.17;
  const yrot = proto ? side * 0.4 : 0;
  const rotation: V3 = [0, yrot, proto ? side * 0.08 : 0.16];
  const radiatorPoint = (p: V3): V3 =>
    new THREE.Vector3(...p)
      .applyEuler(new THREE.Euler(...rotation))
      .add(new THREE.Vector3(cx, cy, cz))
      .toArray() as V3;
  const hoseTop = radiatorPoint([0, height * 0.38, width / 2 + 0.082]);
  const hoseBottom = radiatorPoint([0, -height * 0.38, -width / 2 - 0.082]);
  return (
    <group>
      <group position={[cx, cy, cz]} rotation={rotation}>
        <group name="cooling-radiator">
          <RadiatorCore width={width} height={height} />
          <Rounded
            p={[0.03, 0, 0]}
            s={[0.012, height + 0.075, width + 0.12]}
            color="#121c22"
            metal={0}
            rough={0.9}
            radius={0.006}
          />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                p={[0.065, s * (height / 2 + 0.035), 0]}
                s={[0.15, 0.018, width + 0.12]}
                color={CARBON}
                metal={0}
                rough={0.65}
              />
              <Block
                p={[0.065, 0, s * (width / 2 + 0.052)]}
                s={[0.15, height + 0.08, 0.018]}
                color={CARBON}
                metal={0}
                rough={0.65}
              />
            </group>
          ))}
          <Cylinder
            p={[0, height * 0.38, width / 2 + 0.05]}
            radius={0.022}
            length={0.06}
            axis="z"
          />
          <Cylinder
            p={[0, -height * 0.38, -width / 2 - 0.05]}
            radius={0.022}
            length={0.06}
            axis="z"
          />
        </group>
        {/* Local +X is the finned-face normal, so side pods and the front pack peel the same way. */}
        <CoolingFans width={width} height={height} phase={phase} />
      </group>
      <Pipes
        paths={[
          [
            hoseTop,
            [cx - 0.16, cy + 0.16, cz + width * 0.37],
            ...(Math.abs(cx - l.engineX) > 1
              ? [[body.x(shape.cockpit.roof), 0.18, 0.67] as V3]
              : []),
            [l.engineX + l.engineLength * 0.36, l.engineY + 0.16, endpoint],
          ],
          [
            hoseBottom,
            [cx - 0.18, cy - 0.09, cz - width * 0.32],
            ...(Math.abs(cx - l.engineX) > 1
              ? [[body.x(shape.cockpit.roof), 0.15, -0.67] as V3]
              : []),
            [l.engineX - l.engineLength * 0.3, l.engineY - 0.06, endpoint],
          ],
        ]}
        radius={0.018}
        color="#223e46"
        rough={0.78}
      />
      <Pipes
        paths={[
          [
            [cx - 0.045, cy + 0.14, cz],
            [cx - 0.14, cy + 0.24, cz - side * 0.12],
            [cx - 0.2, cy + 0.26, cz - side * 0.16],
          ],
        ]}
        radius={0.005}
      />
      <Cylinder
        p={[cx - 0.2, cy + 0.22, cz - side * 0.16]}
        radius={0.039}
        length={0.12}
        color="#9babae"
      />
      <Cylinder
        p={[cx - 0.2, cy + 0.289, cz - side * 0.16]}
        radius={0.02}
        length={0.02}
        color="#303e45"
        metal={0.4}
      />
      {[0, 1].map((i) => (
        <Collar
          key={i}
          p={[
            l.engineX + (i ? -0.3 : 0.36) * l.engineLength,
            l.engineY + (i ? -0.06 : 0.16),
            endpoint,
          ]}
          radius={0.023}
        />
      ))}
      {car.engine.turbo && (
        <group
          name="cooling-charge-cooler"
          position={
            proto ? [cx - 0.23, 0.23, cz] : [cx - 0.16, cy + 0.02, side * 0.2]
          }
          rotation={[0, yrot, 0]}
        >
          <RadiatorCore width={0.28} height={0.17} />
          <Pipes
            paths={[
              [
                [-0.04, 0, -side * 0.14],
                [-0.18, 0.08, -side * 0.18],
                [-0.32, 0.12, -side * 0.24],
              ],
            ]}
            radius={0.027}
            color="#2c383e"
            rough={0.55}
          />
        </group>
      )}
    </group>
  );
}

export function HybridAssembly({ car, body, shape }: AssemblyProps) {
  if (!car.hybrid) return null;
  const l = mechanicalLayout(car, body, shape);
  const front = car.hybrid.kind === "LMH front axle";
  const motorX = front
    ? body.frontX
    : l.gearboxX + (l.gearboxTransverse ? 0.27 : l.gearboxLength / 2 + 0.025);
  const motorY = front ? 0.31 : l.engineY;
  const batteryX = body.x(shape.cockpit.to) + 0.35;
  return (
    <group>
      <Cylinder
        p={[motorX, motorY, 0]}
        radius={front ? 0.103 : 0.128}
        length={front ? 0.3 : 0.085}
        axis={front ? "z" : "x"}
        color="#84959d"
      />
      <Repeated
        poses={Array.from({ length: 12 }, (_, i) =>
          front
            ? { p: [motorX, motorY, -0.132 + i * 0.024] as V3 }
            : {
                p: [motorX - 0.036 + i * 0.0065, motorY, 0] as V3,
                r: [0, Math.PI / 2, 0] as V3,
              },
        )}
        annulus={front ? [0.111, 0.101, 0.006] : [0.135, 0.124, 0.004]}
        color="#64777f"
      />
      <Repeated
        bolt
        poses={Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return front
            ? {
                p: [
                  motorX + Math.cos(a) * 0.082,
                  motorY + Math.sin(a) * 0.082,
                  0.159,
                ],
                r: [Math.PI / 2, 0, 0],
              }
            : {
                p: [
                  motorX + 0.049,
                  motorY + Math.cos(a) * 0.105,
                  Math.sin(a) * 0.105,
                ],
                r: [0, 0, Math.PI / 2],
              };
        })}
      />
      {front && (
        <>
          <Cylinder
            p={[motorX + 0.06, body.spec.wheelR, 0]}
            radius={0.066}
            length={0.19}
            axis="z"
            color={CAST}
          />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Rod
                a={[motorX, body.spec.wheelR, side * 0.11]}
                b={[motorX, body.spec.wheelR, side * (body.wheelZ - 0.12)]}
                r={0.014}
                color={TI}
              />
              <Bellows
                p={[motorX, body.spec.wheelR, side * 0.16]}
                radius={0.028}
              />
              <Bellows
                p={[motorX, body.spec.wheelR, side * (body.wheelZ - 0.15)]}
                radius={0.028}
              />
            </group>
          ))}
        </>
      )}
      <Rounded
        p={[front ? motorX - 0.22 : batteryX - 0.15, 0.24, 0.08]}
        s={[0.18, 0.08, 0.24]}
        color="#374b56"
        metal={0.7}
        radius={0.016}
      />
      <Repeated
        poses={Array.from({ length: 10 }, (_, i) => ({
          p: [
            front ? motorX - 0.295 + i * 0.016 : batteryX - 0.225 + i * 0.016,
            0.287,
            0.08,
          ],
        }))}
        size={[0.005, 0.014, 0.214]}
        color="#6f828d"
      />
      <Rounded
        p={[batteryX, 0.16, -0.02]}
        s={[0.42, 0.16, 0.34]}
        color="#3c4d56"
        metal={0.6}
        radius={0.015}
      />
      <Rounded
        p={[batteryX, 0.247, -0.02]}
        s={[0.39, 0.009, 0.31]}
        color="#788990"
        radius={0.008}
      />
      <Repeated
        bolt
        poses={[-1, 1].flatMap((side) =>
          Array.from({ length: 5 }, (_, i) => ({
            p: [batteryX - 0.17 + i * 0.085, 0.256, -0.02 + side * 0.137] as V3,
          })),
        )}
      />
      <Repeated
        poses={Array.from({ length: 7 }, (_, i) => ({
          p: [batteryX, 0.166, -0.183 + i * 0.054],
        }))}
        size={[0.386, 0.124, 0.005]}
        color="#2d3a43"
        metal={0.3}
      />
      <Rounded
        p={[batteryX + 0.11, 0.258, -0.02]}
        s={[0.068, 0.013, 0.055]}
        color={HV}
        metal={0}
        radius={0.004}
      />
      <Pipes
        paths={[0.16, 0.2].map((z) => [
          [batteryX + 0.18, 0.18, z],
          [batteryX + 0.28, 0.19, z],
          [motorX - 0.15, 0.19, z],
          [motorX, motorY + 0.07, z * 0.55],
        ])}
        radius={0.009}
        color={HV}
        rough={0.7}
      />
      <Pipes
        paths={[
          [
            [batteryX - 0.15, 0.15, -0.18],
            [batteryX - 0.2, 0.1, -0.24],
            [motorX, motorY - 0.09, -0.13],
          ],
        ]}
        radius={0.008}
        color="#213f48"
        rough={0.75}
      />
      {[0.16, 0.2].map((z) => (
        <Cylinder
          key={z}
          p={[batteryX + 0.184, 0.18, z]}
          radius={0.016}
          length={0.018}
          axis="x"
          color="#212c32"
          metal={0.1}
        />
      ))}
    </group>
  );
}

export function FuelAssembly({ car, body, shape }: AssemblyProps) {
  const l = mechanicalLayout(car, body, shape);
  const front = engineeringLayoutFor(car).fuelLocation === "front";
  const x = l.fuelX;
  const y = front ? 0.3 : car.category === "LMGT3" ? 0.34 : 0.31;
  const width = front ? 0.54 : 0.62;
  const height = front ? 0.31 : 0.42;
  return (
    <group>
      <Rounded
        p={[x, y, 0]}
        s={[0.29, height, width]}
        color="#343b3d"
        metal={0.05}
        rough={0.9}
        radius={0.026}
      />
      <Rounded
        p={[x, y + height / 2 + 0.008, 0]}
        s={[0.255, 0.012, width * 0.9]}
        color="#5d696d"
        metal={0.65}
        rough={0.53}
        radius={0.01}
      />
      <Cylinder
        p={[x, y + height / 2 + 0.02, 0.09]}
        radius={0.058}
        length={0.017}
        color={ALU}
      />
      <Repeated
        bolt
        poses={Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return {
            p: [
              x + Math.cos(a) * 0.045,
              y + height / 2 + 0.032,
              0.09 + Math.sin(a) * 0.045,
            ],
          };
        })}
      />
      <Repeated
        poses={[-1, 1].map((side) => ({ p: [x + side * 0.1, y, 0] }))}
        size={[0.022, height + 0.035, width + 0.015]}
        color="#656d70"
        metal={0.85}
        rough={0.48}
      />
      <Pipes
        paths={[
          [
            [x, y + height / 2 + 0.024, -0.09],
            [x + 0.03, y + height / 2 + 0.13, -0.18],
            [x, y + height / 2 + 0.16, -width * 0.55],
          ],
          [
            [x + 0.05, y + height / 2 + 0.025, 0.1],
            [x + 0.16, y + 0.12, 0.23],
            [l.engineX + l.engineLength * 0.4, l.engineY + 0.16, 0.2],
          ],
          [
            [x - 0.045, y + height / 2 + 0.024, 0.08],
            [x - 0.17, y + 0.12, 0.27],
            [l.engineX - l.engineLength * 0.2, l.engineY + 0.12, 0.2],
          ],
        ]}
        radius={0.007}
        color="#29353a"
        rough={0.72}
      />
      <Cylinder
        p={[x + 0.17, y + 0.1, 0.26]}
        radius={0.018}
        length={0.09}
        axis="x"
        color={ALU}
      />
      <Cylinder
        p={[x, y + height / 2 + 0.162, -width * 0.55]}
        radius={0.028}
        length={0.033}
        axis="z"
        color={TI}
      />
      <Rounded
        p={[x - 0.11, y + height / 2 + 0.033, -0.05]}
        s={[0.04, 0.028, 0.045]}
        color="#1b292f"
        metal={0.1}
        radius={0.006}
      />
    </group>
  );
}

function Joint({ p, radius = 0.021 }: { p: V3; radius?: number }) {
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[radius, 16, 10]} />
        <Mat color="#4d5a60" metal={0.8} rough={0.48} />
      </mesh>
      <Cylinder
        p={[0, 0, 0]}
        radius={radius * 0.48}
        length={radius * 2.4}
        axis="z"
        color={TI}
      />
    </group>
  );
}

class SpringCurve extends THREE.Curve<THREE.Vector3> {
  length: number;
  constructor(length: number) {
    super();
    this.length = length;
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 18;
    return target.set(
      0.034 * Math.cos(a),
      (t - 0.5) * this.length,
      0.034 * Math.sin(a),
    );
  }
}

function Coilover({ a, b, spring }: { a: V3; b: V3; spring: boolean }) {
  const key = JSON.stringify([a, b]);
  const { p, q, len } = useMemo(() => {
    const [av, bv] = JSON.parse(key) as [V3, V3];
    const va = new THREE.Vector3(...av),
      vb = new THREE.Vector3(...bv);
    const direction = vb.clone().sub(va);
    return {
      p: va.add(vb).multiplyScalar(0.5),
      q: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
      len: direction.length(),
    };
  }, [key]);
  const coil = useMemo(
    () => new THREE.TubeGeometry(new SpringCurve(len * 0.62), 120, 0.0045, 6),
    [len],
  );
  useEffect(() => () => coil.dispose(), [coil]);
  return (
    <group position={p} quaternion={q}>
      <Cylinder
        p={[0, 0, 0]}
        radius={0.009}
        length={len * 0.89}
        color={TI}
        rough={0.22}
      />
      <Cylinder
        p={[0, -len * 0.12, 0]}
        radius={0.022}
        length={len * 0.57}
        color="#596872"
        rough={0.38}
      />
      <Cylinder
        p={[0, -len * 0.31, 0]}
        radius={0.029}
        length={0.014}
        color={ALU}
        rough={0.3}
      />
      <Cylinder
        p={[0, len * 0.31, 0]}
        radius={0.029}
        length={0.014}
        color={ALU}
        rough={0.3}
      />
      {spring && (
        <mesh geometry={coil} castShadow>
          <Mat color="#ab9360" metal={0.45} rough={0.6} />
        </mesh>
      )}
      {[-1, 1].map((side) => (
        <Cylinder
          key={side}
          p={[0, (side * len) / 2, 0]}
          radius={0.02}
          length={0.032}
          axis="z"
          color={ALU}
        />
      ))}
      <Cylinder
        p={[0.046, -len * 0.14, 0]}
        radius={0.016}
        length={len * 0.33}
        color="#647984"
      />
      <Pipes
        paths={[
          [
            [0.02, -len * 0.3, 0],
            [0.042, -len * 0.32, 0],
            [0.046, -len * 0.27, 0],
          ],
        ]}
        radius={0.004}
      />
    </group>
  );
}

function Rocker({ p, side }: { p: V3; side: number }) {
  const g = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.055, -0.022);
    shape.lineTo(0.045, -0.033);
    shape.lineTo(0.016, 0.06);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
    });
    geo.translate(0, 0, -0.008);
    return geo;
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <group position={p} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={g}>
        <Mat color={ALU} metal={0.85} rough={0.4} />
      </mesh>
      <Repeated
        bolt
        poses={[
          [0, 0, side * 0.013],
          [-0.04, -0.019, side * 0.013],
          [0.017, 0.04, side * 0.013],
        ].map((v) => ({ p: v as V3, r: [Math.PI / 2, 0, 0] }))}
      />
    </group>
  );
}

export function SuspensionAssembly({
  car,
  body,
  x,
  z,
  front,
}: MechanicalCornerProps) {
  const side = Math.sign(z);
  const proto = car.category !== "LMGT3";
  const architecture = engineeringLayoutFor(car);
  const pushrod =
    architecture.suspensionKind === "pushrod" ||
    (proto && architecture.suspensionKind === "unverified");
  const multilink = architecture.suspensionKind === "mixed" && !front;
  const torsion = architecture.springMedium === "torsion-bar";
  const inZ = side * (proto ? (front ? 0.23 : 0.22) : 0.45);
  const outZ = z - side * 0.12;
  const loY = 0.165;
  const upY = proto ? 0.465 : 0.505;
  const upper: V3 = [x, upY, outZ];
  const lower: V3 = [x, loY, outZ];
  const arms: [V3, V3][] = multilink
    ? [
        [
          [x + 0.28, 0.38, side * 0.49],
          [x + 0.055, 0.42, outZ],
        ],
        [
          [x - 0.26, 0.45, side * 0.49],
          [x - 0.035, 0.43, outZ],
        ],
        [
          [x + 0.27, 0.16, side * 0.46],
          [x + 0.05, 0.18, outZ],
        ],
        [
          [x - 0.27, 0.2, side * 0.46],
          [x - 0.04, 0.2, outZ],
        ],
        [
          [x - 0.33, 0.28, side * 0.59],
          [x - 0.045, 0.29, outZ],
        ],
      ]
    : [
        [[x + 0.2, upY - 0.02, inZ], upper],
        [[x - 0.2, upY - 0.02, inZ], upper],
        [[x + 0.255, loY, inZ], lower],
        [[x - 0.255, loY, inZ], lower],
      ];
  const rock: V3 = [x - (front ? 0.015 : -0.015), 0.455, inZ];
  const damperEnd: V3 = [x + (front ? -0.29 : 0.29), 0.43, side * 0.09];
  return (
    <group>
      {arms.map(([a, b], i) => (
        <Rod
          key={i}
          a={a}
          b={b}
          r={i < 2 ? 0.011 : 0.014}
          color={proto ? "#515e64" : ALU}
          metal={proto ? 0.4 : 0.75}
        />
      ))}
      {arms.map(([a], i) => (
        <Joint key={i} p={a} radius={0.018} />
      ))}
      <Joint p={upper} />
      <Joint p={lower} />
      <Rounded
        p={[x, (upY + loY) / 2, outZ]}
        s={[0.078, upY - loY + 0.035, 0.054]}
        color="#859098"
        radius={0.018}
      />
      <Cylinder
        p={[x, body.spec.wheelR, outZ + side * 0.045]}
        radius={0.045}
        length={0.09}
        axis="z"
        color={CAST}
      />
      <Repeated
        bolt
        poses={[-1, 1].map((s) => ({
          p: [x + s * 0.021, body.spec.wheelR, outZ + side * 0.071],
          r: [Math.PI / 2, 0, 0],
        }))}
      />
      {pushrod ? (
        <>
          <Rod
            a={[x, loY + 0.028, outZ - side * 0.018]}
            b={[rock[0], rock[1] + 0.035, rock[2]]}
            r={0.009}
            color={TI}
          />
          <Rocker p={rock} side={side} />
          <Coilover
            a={[rock[0], rock[1] - 0.015, inZ - side * 0.032]}
            b={damperEnd}
            spring={!torsion}
          />
          {torsion && (
            <>
              <Rod
                a={[x - 0.2, 0.455, inZ]}
                b={[x + 0.23, 0.455, inZ]}
                r={0.016}
                color="#4c5b63"
                metal={0.8}
              />
              <Cylinder
                p={[x + 0.235, 0.455, inZ]}
                radius={0.028}
                length={0.032}
                axis="x"
                color={ALU}
              />
            </>
          )}
          <Rod
            a={[rock[0], 0.41, inZ]}
            b={[rock[0] - 0.11, 0.345, side * 0.16]}
            r={0.007}
            color={TI}
          />
          {side > 0 && car.id === "aston" && (
            <Coilover
              a={[x - 0.1, 0.37, -0.12]}
              b={[x - 0.1, 0.37, 0.12]}
              spring={false}
            />
          )}
        </>
      ) : (
        <>
          <Coilover
            a={[x - 0.035, loY + 0.025, outZ - side * 0.055]}
            b={[x - 0.09, 0.67, outZ - side * 0.14]}
            spring
          />
          <Rounded
            p={[x - 0.085, 0.688, outZ - side * 0.14]}
            s={[0.14, 0.018, 0.12]}
            color={ALU}
            radius={0.006}
          />
        </>
      )}
      {/* Tie rod / toe link, plus a representative anti-roll linkage. */}
      <Rod
        a={[x - 0.084, 0.31, outZ]}
        b={[x - 0.13, 0.31, proto ? side * 0.16 : side * 0.33]}
        r={0.007}
        color={TI}
      />
      <Joint p={[x - 0.084, 0.31, outZ]} radius={0.014} />
      <Rod
        a={[x + 0.08, loY + 0.04, outZ - side * 0.08]}
        b={[x + 0.1, 0.35, inZ + side * 0.07]}
        r={0.006}
        color={TI}
      />
      <Rod
        a={[x + 0.1, 0.35, inZ + side * 0.07]}
        b={[x + 0.1, 0.35, 0]}
        r={0.01}
        color="#3c4c55"
        metal={0.8}
      />
      <Pipes
        paths={[
          [
            [x + 0.02, 0.44, outZ],
            [x + 0.07, 0.54, outZ - side * 0.05],
            [x + 0.14, 0.49, inZ],
          ],
        ]}
        radius={0.003}
        color="#202e35"
      />
    </group>
  );
}

export function BrakeAssembly({
  car,
  body,
  x,
  z,
  front,
}: MechanicalCornerProps) {
  const side = Math.sign(z);
  const r = body.spec.wheelR;
  const proto = car.category !== "LMGT3";
  const outer = r * (front ? 0.54 : 0.51);
  const inner = outer * 0.45;
  const thickness = proto ? 0.031 : 0.029;
  const rotor = useMemo(
    () => annularDiscGeometry(outer, inner, 0.006),
    [outer, inner],
  );
  const hat = useMemo(
    () => annularDiscGeometry(inner + 0.012, 0.033, 0.012),
    [inner],
  );
  useEffect(
    () => () => {
      rotor.dispose();
      hat.dispose();
    },
    [rotor, hat],
  );
  const rotorZ = z - side * 0.06;
  const caliperX = outer * 0.79;
  const caliperY = outer * 0.17;
  const vanes: Pose[] = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const mid = (outer + inner) / 2;
    return { p: [Math.cos(a) * mid, Math.sin(a) * mid, 0], r: [0, 0, a] };
  });
  return (
    <group position={[x, r, rotorZ]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={rotor}
          position={[0, 0, (s * thickness) / 2]}
          castShadow
          receiveShadow
        >
          <Mat
            color={proto ? "#3b4144" : "#919a9f"}
            metal={proto ? 0.08 : 0.88}
            rough={proto ? 0.86 : 0.45}
          />
        </mesh>
      ))}
      <Repeated
        poses={vanes}
        size={[outer - inner, 0.005, thickness - 0.005]}
        color={proto ? "#262f34" : "#5b6c75"}
        metal={proto ? 0.08 : 0.8}
        rough={0.65}
      />
      <mesh geometry={hat} castShadow>
        <Mat color="#667c86" metal={0.85} rough={0.42} />
      </mesh>
      <Cylinder
        p={[0, 0, -side * 0.013]}
        radius={0.032}
        length={0.072}
        axis="z"
        color={TI}
      />
      <Repeated
        bolt
        poses={Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return {
            p: [
              Math.cos(a) * (inner + 0.004),
              Math.sin(a) * (inner + 0.004),
              side * 0.022,
            ],
            r: [Math.PI / 2, 0, 0],
          };
        })}
      />
      {[outer * 0.65, outer * 0.84, outer * 0.965].map((radius, i) => (
        <mesh key={i} position={[0, 0, side * (thickness / 2 + 0.0035)]}>
          <ringGeometry args={[radius - 0.0008, radius, 64]} />
          <Mat
            color={proto ? "#252d32" : "#586c76"}
            metal={proto ? 0.05 : 0.75}
            rough={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <group position={[caliperX, caliperY, 0]} rotation={[0, 0, -0.16]}>
        <Rounded
          p={[0, 0, 0]}
          s={[0.083, outer * 0.86, 0.089]}
          color="#56626b"
          metal={0.8}
          rough={0.47}
          radius={0.014}
        />
        {[-1, 1].map((s) => (
          <Rounded
            key={s}
            p={[-0.024, 0, s * (thickness / 2 + 0.008)]}
            s={[0.038, outer * 0.6, 0.009]}
            color="#19242b"
            metal={0.05}
            rough={0.9}
            radius={0.003}
          />
        ))}
        <Repeated
          bolt
          poses={[-1, 1].flatMap((y) =>
            [-1, 1].map((z) => ({
              p: [0.018, y * outer * 0.28, z * 0.048] as V3,
              r: [Math.PI / 2, 0, 0] as V3,
            })),
          )}
        />
        <Cylinder
          p={[0, outer * 0.47, 0.017]}
          radius={0.007}
          length={0.023}
          color={BRASS}
        />
        <Pipes
          paths={[
            [
              [-0.007, outer * 0.32, side * 0.046],
              [-0.007, outer * 0.45, 0],
              [-0.007, outer * 0.32, -side * 0.046],
            ],
          ]}
          radius={0.003}
          color={TI}
          metal={0.8}
        />
      </group>
      <Pipes
        paths={[
          [
            [caliperX - 0.02, caliperY + outer * 0.34, -side * 0.035],
            [caliperX + 0.04, outer * 0.62, -side * 0.07],
            [0.02, outer * 0.79, -side * 0.12],
            [-0.08, outer * 0.6, -side * 0.2],
          ],
        ]}
        radius={0.004}
      />
      <Pipes
        paths={[
          [
            [-0.035, -0.06, -side * 0.035],
            [-0.1, -0.13, -side * 0.09],
            [-0.17, -0.11, -side * 0.21],
          ],
        ]}
        radius={0.033}
        color={CARBON}
        rough={0.65}
      />
      <Cylinder
        p={[-0.17, -0.11, -side * 0.21]}
        radius={0.035}
        length={0.03}
        axis="z"
        color="#303c43"
        metal={0.1}
      />
    </group>
  );
}
