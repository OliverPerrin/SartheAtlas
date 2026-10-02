import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import { cockpitLayout } from "./cockpitLayout.ts";
import { seatShellGeometry } from "./cockpitGeometry.ts";
import { Mat } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
import { annularDiscGeometry } from "./mechanicalGeometry.ts";

function Pad({
  p,
  size,
  rotation,
  color = "#353a3e",
  metal = 0,
  rough = 0.9,
}: {
  p: V3;
  size: V3;
  rotation?: V3;
  color?: string;
  metal?: number;
  rough?: number;
}) {
  const key = JSON.stringify(size);
  const g = useMemo(
    () => new RoundedBoxGeometry(...(JSON.parse(key) as V3), 2, 0.015),
    [key],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh position={p} rotation={rotation} geometry={g}>
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  );
}

// The same seat cradle and cabin placement remain visible through the glazing.
// Subpixel fasteners, wiring, pedals and instruments are deferred until reveal.
export function CabinOverview({
  car,
  body,
  shape,
}: {
  car: Car;
  body: Body;
  shape: Shape;
}) {
  const layout = cockpitLayout(car, body, shape);
  const recline = layout.prototype ? 1 : 0.78;
  const g = useMemo(() => seatShellGeometry(recline), [recline]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <group name="Cabin overview">
      <group position={[layout.seatX, layout.floor, layout.z]}>
        <mesh geometry={g}>
          <Mat color="#20252a" metal={0} rough={0.55} side={THREE.DoubleSide} />
        </mesh>
        <Pad p={[0.07, 0.045, 0]} size={[0.32, 0.045, 0.29]} />
        <Pad
          p={[-0.19 * recline, 0.32, 0]}
          size={[0.04, 0.39, 0.29]}
          rotation={[0, 0, -0.3]}
        />
        <Pad
          p={[-0.265 * recline, 0.56, 0]}
          size={[0.05, 0.16, 0.22]}
          rotation={[0, 0, -0.18]}
        />
        {[-1, 1].map((side) => (
          <Pad
            key={side}
            p={[-0.21 * recline, 0.575, side * 0.15]}
            size={[0.21, 0.14, 0.065]}
            color="#20252a"
          />
        ))}
      </group>
      <Pad
        p={layout.wheel}
        size={[0.035, 0.15, 0.29]}
        color="#181c20"
        rotation={[0, 0, 0.22]}
      />
      <Pad
        p={layout.dash}
        size={[0.15, 0.16, layout.prototype ? 0.4 : 0.56]}
        color="#20252a"
      />
    </group>
  );
}

// Keep the visible disc/hat/caliper silhouette between spokes, without hidden
// hydraulic lines and cooling vanes. Selecting a corner loads the full assembly.
export function BrakeOverview({
  car,
  body,
  x,
  z,
  front,
}: {
  car: Car;
  body: Body;
  x: number;
  z: number;
  front: boolean;
}) {
  const r = body.spec.wheelR;
  const proto = car.category !== "LMGT3";
  const outer = r * (front ? 0.54 : 0.51);
  const g = useMemo(
    () => annularDiscGeometry(outer, outer * 0.45, 0.006),
    [outer],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <group position={[x, r, z - Math.sign(z) * 0.06]} name="Brake overview">
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, 0, (side * (proto ? 0.031 : 0.029)) / 2]}
          geometry={g}
        >
          <Mat
            color={proto ? "#3b4144" : "#919a9f"}
            metal={proto ? 0.08 : 0.88}
            rough={proto ? 0.86 : 0.45}
          />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[outer * 0.45, outer * 0.45, 0.015, 24]} />
        <Mat color="#667c86" metal={0.85} rough={0.42} />
      </mesh>
      <Pad
        p={[outer * 0.79, outer * 0.17, 0]}
        size={[0.083, outer * 0.86, 0.089]}
        color="#56626b"
        metal={0.8}
        rough={0.47}
        rotation={[0, 0, -0.16]}
      />
    </group>
  );
}
