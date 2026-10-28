import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Car } from "../data/cars.ts";
import { engineBanks, rotatedBankPoint } from "./mechanicalGeometry.ts";

// Local cover motion inside the engine group. The parent driveline lift is
// unchanged. Illustrative distances, not manufacturer CAD.
// Phase is 0 at exploded <= 0.5, 1 at exploded >= 0.75, unless housings are open.
export const drivelineCoverBand = { start: 0.5, end: 0.75 } as const;

export function engineCoverPhase(exploded: number, sectioned = false) {
  if (sectioned) return 1;
  const span = drivelineCoverBand.end - drivelineCoverBand.start;
  const x = Math.min(
    1,
    Math.max(0, (exploded - drivelineCoverBand.start) / span),
  );
  return x * x * (3 - 2 * x);
}

// Remap a delayed layer so it is seated at phase 0 and fully clear at phase 1.
export function coverLayer(phase: number, delay: number) {
  const span = 1 - delay;
  const x = Math.min(1, Math.max(0, (phase - delay) / span));
  return x * x * (3 - 2 * x);
}

export const coverLayerDelay = {
  camCover: 0,
  plenum: 0.12,
  barrel: 0.2,
  crankcaseSide: 0.2,
  sump: 0.28,
  compressorCover: 0.4,
} as const;

// Full-open travel in engine-local metres. Cam covers move on the bank normal.
// The barrel tube moves on the liner opening. Other covers use a fixed axis.
export const engineCoverTravel = {
  camCover: 0.13,
  barrel: 0.1,
  crankcaseSide: 0.11,
  sump: 0.058,
  plenum: 0.09,
  compressorCover: 0.05,
} as const;

export const barrelTubeRadius = 0.056;
export const linerOuterRadius = 0.049;

export function coverDistances(phase: number) {
  return {
    camCover:
      engineCoverTravel.camCover * coverLayer(phase, coverLayerDelay.camCover),
    barrel:
      engineCoverTravel.barrel * coverLayer(phase, coverLayerDelay.barrel),
    crankcaseSide:
      engineCoverTravel.crankcaseSide *
      coverLayer(phase, coverLayerDelay.crankcaseSide),
    sump: engineCoverTravel.sump * coverLayer(phase, coverLayerDelay.sump),
    plenum:
      engineCoverTravel.plenum * coverLayer(phase, coverLayerDelay.plenum),
    compressorCover:
      engineCoverTravel.compressorCover *
      coverLayer(phase, coverLayerDelay.compressorCover),
  };
}

// Lift clear of the valve gear before tipping the lid away from the front
// shoulder view. Both moves reverse to the exact gasket seat when closed.
export function camCoverPose(bankAngle: number, phase: number) {
  const fold = coverLayer(phase, 0.5);
  const direction = Math.cos(bankAngle) - Math.sin(bankAngle) > 0 ? -1 : 1;
  return {
    position: [
      0,
      0.31 + coverDistances(phase).camCover,
      direction * 0.04 * fold,
    ] as [number, number, number],
    rotation: [((direction * Math.PI) / 2) * fold, 0, 0] as [
      number,
      number,
      number,
    ],
  };
}

export function bankNormal(angle: number): [number, number, number] {
  return [0, Math.cos(angle), Math.sin(angle)];
}

// Bank-local +Z, after the bank's X rotation. This is the open face of the liner.
export function sleeveOpeningDirection(
  angle: number,
): [number, number, number] {
  return [0, -Math.sin(angle), Math.cos(angle)];
}

export type EngineFamily =
  | "flat-six"
  | "inline-six"
  | "vee-twelve"
  | "single-turbo-vee-six"
  | "twin-turbo-vee-six"
  | "twin-turbo-vee-eight"
  | "naturally-aspirated-vee-eight";

export type EngineArchitecture = {
  family: EngineFamily;
  turboCount: 0 | 1 | 2;
  turboSite: "none" | "bank-exhaust" | "single-collector";
  intake: "airbox" | "charge-manifold" | "inline-side" | "boxer-plenum";
  // Porsche's published 992 GT3 R induction is one throttle butterfly.
  singleThrottle: boolean;
  crankcaseOpening: "camera-side" | "valley";
};

export function engineArchitecture(car: Car): EngineArchitecture {
  const turboCount = (!car.engine.turbo ? 0 : (car.engine.turboCount ?? 2)) as
    0 | 1 | 2;
  const config = car.engine.config;
  if (config === "F") {
    return {
      family: "flat-six",
      turboCount,
      turboSite: "none",
      intake: "boxer-plenum",
      singleThrottle: true,
      crankcaseOpening: "valley",
    };
  }
  if (config === "I") {
    return {
      family: "inline-six",
      turboCount,
      turboSite: turboCount > 0 ? "bank-exhaust" : "none",
      intake: "inline-side",
      singleThrottle: false,
      crankcaseOpening: "camera-side",
    };
  }
  if (car.engine.cylinders >= 12) {
    return {
      family: "vee-twelve",
      turboCount: 0,
      turboSite: "none",
      intake: "airbox",
      singleThrottle: false,
      crankcaseOpening: "camera-side",
    };
  }
  if (car.engine.cylinders === 6 && turboCount === 1) {
    return {
      family: "single-turbo-vee-six",
      turboCount,
      turboSite: "single-collector",
      intake: "charge-manifold",
      singleThrottle: false,
      crankcaseOpening: "camera-side",
    };
  }
  if (car.engine.cylinders === 6) {
    return {
      family: "twin-turbo-vee-six",
      turboCount,
      turboSite: turboCount > 0 ? "bank-exhaust" : "none",
      intake: turboCount > 0 ? "charge-manifold" : "airbox",
      singleThrottle: false,
      crankcaseOpening: "camera-side",
    };
  }
  return {
    family:
      turboCount > 0 ? "twin-turbo-vee-eight" : "naturally-aspirated-vee-eight",
    turboCount,
    turboSite: turboCount > 0 ? "bank-exhaust" : "none",
    intake: turboCount > 0 ? "charge-manifold" : "airbox",
    singleThrottle: false,
    crankcaseOpening: "camera-side",
  };
}

export function camCoverColor(car: Car) {
  if (car.make === "Ferrari") return "#9e2027";
  if (car.make === "Aston Martin") return "#38544a";
  return "#343d43";
}

// Same study points the engine callouts already use. Do not drift these.
export function turboStudyPositions(
  car: Car,
  length: number,
): [number, number, number][] {
  const count = !car.engine.turbo ? 0 : (car.engine.turboCount ?? 2);
  return Array.from({ length: count }, (_, i) =>
    car.engine.config === "I"
      ? [-length * 0.25 + i * length * 0.44, 0.04, 0.31]
      : [-length * 0.43, 0.025, count === 1 ? 0.3 : (i ? 1 : -1) * 0.3],
  );
}

export type BoxPlacement = {
  center: [number, number, number];
  size: [number, number, number];
};

export function plenumPlacement(car: Car, length: number): BoxPlacement {
  if (car.engine.config === "F") {
    return {
      center: [length * 0.2, 0.29, 0],
      size: [length * 0.62, 0.07, 0.16],
    };
  }
  if (car.engine.config === "I") {
    return {
      center: [0, 0.16, -0.24],
      size: [length * 0.78, 0.11, 0.1],
    };
  }
  const wide = car.engine.bankAngle >= 110;
  return {
    center: [length * 0.2, wide ? 0.34 : 0.4, 0],
    size: [length * 0.52, car.engine.turbo ? 0.06 : 0.09, wide ? 0.2 : 0.14],
  };
}

function box(
  width: number,
  height: number,
  depth: number,
  position: [number, number, number],
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(position[0], position[1], position[2]);
  return geometry;
}

function merged(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error("Engine cover geometry failed to merge");
  return geometry;
}

// Hollow cover. y=0 is the open gasket seat; the lid is at +Y.
export function openCoverGeometry(
  length: number,
  width: number,
  height: number,
  wall = 0.007,
) {
  const flange = 0.011;
  const skirt = height - wall;
  return merged([
    box(length, wall, width, [0, height - wall / 2, 0]),
    box(length, skirt, wall, [0, skirt / 2, width / 2 - wall / 2]),
    box(length, skirt, wall, [0, skirt / 2, -(width / 2 - wall / 2)]),
    box(wall, skirt, width - wall * 2, [length / 2 - wall / 2, skirt / 2, 0]),
    box(wall, skirt, width - wall * 2, [
      -(length / 2 - wall / 2),
      skirt / 2,
      0,
    ]),
    box(length + flange * 2, wall * 0.7, wall, [
      0,
      wall * 0.35,
      width / 2 + flange / 2,
    ]),
    box(length + flange * 2, wall * 0.7, wall, [
      0,
      wall * 0.35,
      -(width / 2 + flange / 2),
    ]),
    box(wall, wall * 0.7, width + flange * 2, [
      length / 2 + flange / 2,
      wall * 0.35,
      0,
    ]),
    box(wall, wall * 0.7, width + flange * 2, [
      -(length / 2 + flange / 2),
      wall * 0.35,
      0,
    ]),
  ]);
}

export function gasketFrameGeometry(
  length: number,
  width: number,
  wall = 0.014,
  thickness = 0.004,
) {
  return merged([
    box(length + wall, thickness, wall, [0, thickness / 2, width / 2]),
    box(length + wall, thickness, wall, [0, thickness / 2, -width / 2]),
    box(wall, thickness, width, [length / 2, thickness / 2, 0]),
    box(wall, thickness, width, [-length / 2, thickness / 2, 0]),
  ]);
}

// Full water-jacket tube. Seated, it surrounds the open liner half.
export function barrelTubeGeometry(length = 0.176, radius = barrelTubeRadius) {
  return new THREE.CylinderGeometry(radius, radius, length, 20, 1, true);
}

// Tilt the removed jackets toward the front shoulder for inspection. They
// retain their local peel translation; their open ends no longer mask the bore.
export function jacketInspectionTilt(bankAngle: number, phase: number) {
  const bankInverse = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -bankAngle,
  );
  const direction = new THREE.Vector3(1, 1, 1)
    .normalize()
    .applyQuaternion(bankInverse);
  const tilted = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );
  return new THREE.Quaternion().slerp(
    tilted,
    coverLayer(phase, coverLayerDelay.barrel),
  );
}

// A machined deck with actual bore apertures, not a slab across piston crowns.
// Hole centres come from the mechanism, including its bank stagger.
export function cylinderDeckGeometry(
  length: number,
  width: number,
  xs: number[],
) {
  const radius = 0.045;
  const half = Math.max(
    length * 0.45,
    ...xs.map((x) => Math.abs(x) + radius + 0.007),
  );
  const deck = new THREE.Shape();
  deck.moveTo(-half, -width / 2);
  deck.lineTo(half, -width / 2);
  deck.lineTo(half, width / 2);
  deck.lineTo(-half, width / 2);
  deck.closePath();
  for (const x of xs) {
    const bore = new THREE.Path();
    bore.absarc(x, 0, radius, 0, Math.PI * 2, true);
    deck.holes.push(bore);
  }
  const geometry = new THREE.ExtrudeGeometry(deck, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.009, 0);
  return geometry;
}

// Crankcase side cover, open toward local -Z so the gasket face meets the case.
export function sideShellGeometry(
  length: number,
  height: number,
  depth = 0.016,
) {
  const wall = 0.006;
  const flange = 0.01;
  return merged([
    box(length, height, wall, [0, 0, depth - wall / 2]),
    box(length, wall, depth, [0, height / 2 - wall / 2, depth / 2]),
    box(length, wall, depth, [0, -height / 2 + wall / 2, depth / 2]),
    box(wall, height, depth, [length / 2 - wall / 2, 0, depth / 2]),
    box(wall, height, depth, [-length / 2 + wall / 2, 0, depth / 2]),
    box(length + flange * 2, wall, wall, [
      0,
      height / 2 + flange / 2,
      wall / 2,
    ]),
    box(length + flange * 2, wall, wall, [
      0,
      -height / 2 - flange / 2,
      wall / 2,
    ]),
    box(wall, height + flange * 2, wall, [
      length / 2 + flange / 2,
      0,
      wall / 2,
    ]),
    box(wall, height + flange * 2, wall, [
      -length / 2 - flange / 2,
      0,
      wall / 2,
    ]),
  ]);
}

// Sump pan, open upward. Rim at local y=0.
export function sumpPanGeometry(length: number, width: number, depth: number) {
  const wall = 0.007;
  const flange = 0.012;
  return merged([
    box(length, wall, width, [0, -depth + wall / 2, 0]),
    box(length, depth, wall, [0, -depth / 2, width / 2 - wall / 2]),
    box(length, depth, wall, [0, -depth / 2, -(width / 2 - wall / 2)]),
    box(wall, depth, width - wall * 2, [length / 2 - wall / 2, -depth / 2, 0]),
    box(wall, depth, width - wall * 2, [
      -(length / 2 - wall / 2),
      -depth / 2,
      0,
    ]),
    box(length + flange * 2, wall * 0.7, wall, [
      0,
      -wall * 0.2,
      width / 2 + flange / 2,
    ]),
    box(length + flange * 2, wall * 0.7, wall, [
      0,
      -wall * 0.2,
      -(width / 2 + flange / 2),
    ]),
    box(wall, wall * 0.7, width + flange * 2, [
      length / 2 + flange / 2,
      -wall * 0.2,
      0,
    ]),
    box(wall, wall * 0.7, width + flange * 2, [
      -(length / 2 + flange / 2),
      -wall * 0.2,
      0,
    ]),
  ]);
}

function onBoxSurface(
  port: [number, number, number],
  placement: BoxPlacement,
): [number, number, number] {
  const dx = port[0] - placement.center[0];
  const dy = port[1] - placement.center[1];
  const dz = port[2] - placement.center[2];
  const scale = Math.min(
    placement.size[0] / 2 / Math.max(Math.abs(dx), 1e-6),
    placement.size[1] / 2 / Math.max(Math.abs(dy), 1e-6),
    placement.size[2] / 2 / Math.max(Math.abs(dz), 1e-6),
  );
  const length = Math.hypot(dx, dy, dz) || 1;
  const pull = 0.006 / length;
  return [
    placement.center[0] + dx * (scale + pull),
    placement.center[1] + dy * (scale + pull),
    placement.center[2] + dz * (scale + pull),
  ];
}

export function intakePaths(car: Car, length: number) {
  const plenum = plenumPlacement(car, length);
  const banks = engineBanks(car, length);
  return banks.flatMap((bank) => {
    const side = bank.side || 1;
    return bank.cylinders.map((x) => {
      const port = rotatedBankPoint(x, 0.235, -side * 0.095, bank.angle);
      const flange = onBoxSurface(port, plenum);
      return [port, flange] as [number, number, number][];
    });
  });
}

export function headerPaths(car: Car, length: number) {
  const turbos = turboStudyPositions(car, length);
  const banks = engineBanks(car, length);
  return banks.flatMap((bank) => {
    const side = bank.side || 1;
    const collector = collectorFor(turbos, length, side);
    return bank.cylinders.map((x, index) => {
      const port = rotatedBankPoint(x, 0.205, side * 0.11, bank.angle);
      const nearest =
        index ===
        bank.cylinders.reduce(
          (best, cx, i) =>
            Math.abs(cx - length * 0.12) <
            Math.abs(bank.cylinders[best] - length * 0.12)
              ? i
              : best,
          0,
        );
      const mid: [number, number, number] = nearest
        ? [length * 0.12, 0.05, side * 0.285]
        : [port[0] * 0.55 + collector[0] * 0.45, 0.05, side * 0.285];
      return [port, mid, collector] as [number, number, number][];
    });
  });
}

function collectorFor(
  turbos: [number, number, number][],
  length: number,
  side: number,
): [number, number, number] {
  if (turbos.length === 1) {
    return [turbos[0][0] - 0.06, turbos[0][1] - 0.01, side * 0.16];
  }
  if (turbos.length === 2) {
    const match =
      turbos.find((turbo) => Math.sign(turbo[2]) === Math.sign(side)) ??
      turbos[0];
    return [match[0] - 0.04, match[1] - 0.015, match[2] * 0.82];
  }
  return [-length * 0.46, 0.02, side * 0.26];
}

export function chargeFlanges(car: Car, length: number) {
  const plenum = plenumPlacement(car, length);
  return turboStudyPositions(car, length).map((turbo) => {
    const outlet: [number, number, number] = [
      turbo[0] + 0.1,
      turbo[1] + 0.045,
      turbo[2] * 0.72,
    ];
    return { outlet, flange: onBoxSurface(outlet, plenum) };
  });
}
