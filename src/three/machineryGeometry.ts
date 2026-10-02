import * as THREE from "three";
import type { Car } from "../data/cars.ts";
import {
  engineBanks,
  mechanicalLayout,
  rotatedBankPoint,
} from "./mechanicalGeometry.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";

export type Point = [number, number, number];
export type MechanismCylinder = {
  x: number;
  angle: number;
  piston: Point;
  wristPin: Point;
  crankPin: Point;
};

// Static mechanical topology only. Crank phase, bore/stroke, valve layout and
// piston crowns are illustrative; this is not a firing-order or kinematic model.
export function engineMechanism(car: Car, length: number) {
  const banks = engineBanks(car, length);
  const pins: Point[] = [];
  const cylinders: MechanismCylinder[] = [];
  const bankCylinderCount = banks[0].cylinders.length;
  for (const bank of banks) {
    bank.cylinders.forEach((baseX, i) => {
      const x = baseX + (bank.side || 0) * 0.008;
      const phase =
        (i * Math.PI * 2) / bankCylinderCount +
        (car.engine.config === "F" && bank.side < 0 ? Math.PI : 0);
      const crankPin: Point = [
        x,
        Math.cos(phase) * 0.026,
        Math.sin(phase) * 0.026,
      ];
      cylinders.push({
        x,
        angle: bank.angle,
        piston: rotatedBankPoint(x, 0.174, 0, bank.angle),
        wristPin: rotatedBankPoint(x, 0.152, 0, bank.angle),
        crankPin,
      });
      if (car.engine.config === "V") {
        if (bank.side > 0) pins.push([baseX, crankPin[1], crankPin[2]]);
      } else pins.push(crankPin);
    });
  }
  const mains = Array.from(
    { length: bankCylinderCount + 1 },
    (_, i) => -length * 0.46 + (i * length * 0.92) / bankCylinderCount,
  );
  return {
    banks,
    cylinders,
    pins,
    mains,
    illustratedValvesPerCylinder: 4,
    illustratedCamsPerBank: 2,
  };
}

export function pistonStudyGeometry(radius = 0.043) {
  const points: [number, number][] = [
    [0, 0.032],
    [radius * 0.87, 0.032],
    [radius, 0.026],
    [radius, 0.022],
    [radius - 0.002, 0.02],
    [radius, 0.018],
    [radius, 0.015],
    [radius - 0.002, 0.013],
    [radius, 0.011],
    [radius, 0.008],
    [radius - 0.002, 0.006],
    [radius, 0.004],
    [radius * 0.985, -0.028],
    [radius * 0.79, -0.028],
    [radius * 0.79, 0.02],
    [0, 0.025],
  ];
  return new THREE.LatheGeometry(
    points.map((p) => new THREE.Vector2(...p)),
    40,
  );
}

// A solid liner wall with a genuinely open near half, including exposed edges.
export function sleeveSectionGeometry(
  outer = 0.049,
  inner = 0.045,
  length = 0.16,
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, Math.PI, Math.PI * 2, false);
  shape.lineTo(inner, 0);
  shape.absarc(0, 0, inner, Math.PI * 2, Math.PI, true);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 32,
  });
  g.translate(0, 0, -length / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

export function transmissionGearCount(car: Car): number | null {
  if (/seven[-\s]speed|7[-\s]speed/i.test(car.gearbox)) return 7;
  if (/six[-\s]speed|6[-\s]speed/i.test(car.gearbox)) return 6;
  return null;
}

export function transmissionMechanism(car: Car, body: Body, shape: Shape) {
  const layout = mechanicalLayout(car, body, shape);
  const count = transmissionGearCount(car) ?? 4;
  const transverse = layout.gearboxTransverse;
  const axis: Point = transverse ? [0, 0, 1] : [1, 0, 0];
  const span = transverse ? 0.54 : layout.gearboxLength * 0.86;
  const shafts: Point[] = transverse
    ? [
        [layout.gearboxX + 0.06, 0.3, 0],
        [layout.gearboxX - 0.06, 0.3, 0],
        ...(car.platform === "LMDh"
          ? [[layout.gearboxX - 0.02, 0.385, 0] as Point]
          : []),
      ]
    : [
        [layout.gearboxX, 0.36, 0],
        [layout.gearboxX, 0.24, 0],
      ];
  // Sum of pitch radii stays at the shaft separation. Tooth/ratio choices here
  // illustrate meshing pairs and are not the manufacturer's actual ratios.
  const pairs = Array.from({ length: count }, (_, i) => {
    const offset = -span * 0.39 + (i * span * 0.78) / Math.max(1, count - 1);
    return { offset, teethA: 24 + i * 2, teethB: 36 - i * 2, module: 0.004 };
  });
  const position = (shaft: number, offset: number): Point => [
    shafts[shaft][0] + axis[0] * offset,
    shafts[shaft][1] + axis[1] * offset,
    shafts[shaft][2] + axis[2] * offset,
  ];
  return {
    count,
    countDocumented: transmissionGearCount(car) !== null,
    transverse,
    axis,
    span,
    shafts,
    pairs,
    position,
  };
}

// Ideal involute spur flanks with a 20-degree study pressure angle. The module,
// tooth count, root fillet and bevel remain illustrative, not OEM machining data.
// Reference: https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html
export function gearHalfThickness(
  teeth: number,
  module: number,
  radius: number,
) {
  const pitch = (teeth * module) / 2;
  const pressure = (20 * Math.PI) / 180;
  const base = pitch * Math.cos(pressure);
  const angle = Math.acos(Math.min(1, base / Math.max(radius, base)));
  return (
    Math.PI / (2 * teeth) +
    Math.tan(pressure) -
    pressure -
    (Math.tan(angle) - angle)
  );
}

export function toothedGearGeometry(
  teeth: number,
  module: number,
  thickness = 0.021,
) {
  const pitch = (teeth * module) / 2;
  const root = pitch - module * 1.25;
  const base = pitch * Math.cos((20 * Math.PI) / 180);
  const outer = pitch + module;
  const shape = new THREE.Shape();
  const points: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    const step = (Math.PI * 2) / teeth;
    const add = (angle: number, radius: number) =>
      points.push(
        new THREE.Vector2(
          Math.cos(a + angle) * radius,
          Math.sin(a + angle) * radius,
        ),
      );
    const start = Math.max(base, root);
    const baseHalf = gearHalfThickness(teeth, module, start);
    add(-step / 2, root);
    add(-baseHalf - 0.018, root);
    for (let j = 0; j <= 8; j++) {
      const radius = start + ((outer - start) * j) / 8;
      add(-gearHalfThickness(teeth, module, radius), radius);
    }
    add(0, outer);
    for (let j = 8; j >= 0; j--) {
      const radius = start + ((outer - start) * j) / 8;
      add(gearHalfThickness(teeth, module, radius), radius);
    }
    add(baseHalf + 0.018, root);
    add(step / 2, root);
  }
  shape.setFromPoints(points);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.012, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.0007,
    bevelSize: 0.0005,
    bevelSegments: 1,
    curveSegments: 24,
  });
  g.translate(0, 0, -thickness / 2);
  return g;
}
