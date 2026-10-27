import * as THREE from "three";
import type { Car } from "../data/cars.ts";
import { engineeringLayoutFor } from "../data/engineeringDetails.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";

export type MechanicalLayout = {
  engineX: number;
  engineY: number;
  engineLength: number;
  engineScale: number;
  gearboxX: number;
  gearboxLength: number;
  gearboxY: number;
  gearboxTransverse: boolean;
  rearTransaxle: boolean;
  fuelX: number;
};

// Packaging for the educational assembly. These are deliberately not CAD
// dimensions. Verified architecture is separate from this representative layout.
export function mechanicalLayout(
  car: Car,
  body: Body,
  shape: Shape,
): MechanicalLayout {
  const prototype = car.category !== "LMGT3";
  const rearCabin = body.x(shape.cockpit.to);
  const engineLength =
    car.engine.cylinders >= 12
      ? 0.82
      : car.engine.cylinders >= 8
        ? 0.64
        : car.engine.config === "I"
          ? 0.72
          : 0.54;
  const architecture = engineeringLayoutFor(car);
  const rearTransaxle =
    car.engine.position === "front-mid" &&
    architecture.gearboxLocation === "rear";
  let engineX: number;
  let gearboxX: number;
  let gearboxLength: number;
  if (prototype) {
    engineX = rearCabin - 0.08 - engineLength / 2;
    const start = engineX - engineLength / 2 - 0.02;
    gearboxLength = Math.max(0.35, start - (body.rearX - 0.42));
    gearboxX = start - gearboxLength / 2;
  } else if (car.engine.position === "front-mid") {
    engineX = body.frontX - engineLength / 2 + 0.05;
    gearboxLength = 0.46;
    // Only catalogue architectures explicitly identifying a transaxle get one.
    gearboxX = rearTransaxle
      ? body.rearX - 0.05
      : engineX - engineLength / 2 - gearboxLength / 2;
  } else if (car.engine.position === "mid") {
    engineX = body.rearX + 0.2 + engineLength / 2;
    gearboxLength = 0.44;
    gearboxX = body.rearX - 0.28;
  } else {
    engineX = body.rearX - 0.12 - engineLength / 2;
    gearboxLength = 0.42;
    gearboxX = body.rearX + 0.25;
  }
  return {
    engineX,
    engineLength,
    engineY: prototype ? 0.34 : car.engine.position === "rear" ? 0.4 : 0.45,
    engineScale: prototype ? 1 : 0.92,
    gearboxX,
    gearboxLength,
    gearboxY: 0.3,
    gearboxTransverse: car.platform === "LMDh" || car.id === "oreca",
    rearTransaxle,
    fuelX:
      architecture.fuelLocation === "front"
        ? body.frontX - 0.22
        : rearCabin + 0.2,
  };
}

export function engineBanks(car: Car, length: number) {
  const count =
    car.engine.config === "I" ? car.engine.cylinders : car.engine.cylinders / 2;
  const sides = car.engine.config === "I" ? [0] : [-1, 1];
  const halfAngle =
    car.engine.config === "F"
      ? Math.PI / 2
      : (car.engine.bankAngle * Math.PI) / 360;
  return sides.map((side) => ({
    side,
    angle: side * halfAngle,
    cylinders: Array.from(
      { length: count },
      (_, i) => -length * 0.38 + (i * length * 0.76) / Math.max(1, count - 1),
    ),
  }));
}

// An annular solid, rather than a filled cylinder hiding the rotor ventilation.
export function annularDiscGeometry(
  outer: number,
  inner: number,
  thickness: number,
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 48,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function rotatedBankPoint(
  x: number,
  y: number,
  z: number,
  angle: number,
): [number, number, number] {
  return [
    x,
    y * Math.cos(angle) - z * Math.sin(angle),
    y * Math.sin(angle) + z * Math.cos(angle),
  ];
}

// The Porsche rear engine reverses the bellhousing interface; other assemblies
// deliver torque toward the tail. Long front-engine propshafts remain separate.
export function drivelineInterfaces(car: Car, layout: MechanicalLayout) {
  const direction = car.engine.position === "rear" ? -1 : 1;
  const casingLength = layout.gearboxTransverse ? 0.38 : layout.gearboxLength;
  const bellhousingX = layout.gearboxX + direction * (casingLength / 2 + 0.08);
  const engineOutputX =
    layout.engineX - (direction * layout.engineLength * layout.engineScale) / 2;
  return {
    direction,
    bellhousingX,
    engineOutputX,
    couplingLength: Math.abs(engineOutputX - bellhousingX),
  };
}

// Same journal spacing as the sectioned crank. Illustrative, not a measured throw.
export function crankMainPositions(length: number, perBank: number) {
  return Array.from(
    { length: perBank + 1 },
    (_, i) => -length * 0.46 + (i * length * 0.92) / Math.max(1, perBank),
  );
}

// Fan and shroud peel across the first half of the cooling band.
// 0 at e <= 0.25, 1 at e >= 0.375. Smoothstep, then held.
export function coolingFanPhase(exploded: number) {
  const x = Math.min(1, Math.max(0, (exploded - 0.25) / 0.125));
  return x * x * (3 - 2 * x);
}

// Travel along the radiator's local +X face normal, not a world axis.
export const coolingFanTravel = { shroud: 0.1, rotor: 0.18 } as const;

// How many objects share each semantic name. Three.js name lookup is not used.
export function mechanicalGroupMultiplicity(car: Car) {
  const cooling = car.category === "LMGT3" ? 1 : 2;
  const turbos = car.engine.turbo ? (car.engine.turboCount ?? 2) : 0;
  return {
    "engine-crankcase": 1,
    "engine-bank": car.engine.config === "I" ? 1 : 2,
    "engine-sump": 1,
    "engine-turbo": turbos,
    "gearbox-case": 1,
    "cooling-radiator": cooling,
    "cooling-fan": cooling,
    "fan-shroud": cooling,
    "cooling-charge-cooler": car.engine.turbo ? cooling : 0,
  } as const;
}
