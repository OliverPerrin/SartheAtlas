import type { Car } from "../data/cars.ts";
import { engineeringLayoutFor } from "../data/engineeringDetails.ts";
import type { SystemId } from "../data/systems.ts";
import type { Body } from "./body.ts";
import { cockpitLayout } from "./cockpitLayout.ts";
import {
  drivelineInterfaces,
  engineBanks,
  mechanicalLayout,
  rotatedBankPoint,
} from "./mechanicalGeometry.ts";
import type { V3 } from "./primitives.tsx";
import type { Shape } from "./shapes.ts";

/** A point on a part, plus words that find its entry in the component list. */
export type CalloutAnchor = { match: string[]; at: V3 };

const a = (match: string | string[], at: V3): CalloutAnchor => ({
  match: Array.isArray(match) ? match : [match],
  at,
});

// Car-space points that mirror where the procedural assemblies place each
// part. Front is +X; corner parts use the front +Z corner that the default
// and running-gear cameras face.
export function calloutAnchors(
  car: Car,
  body: Body,
  shape: Shape,
  system: SystemId,
): CalloutAnchor[] {
  const proto = car.category !== "LMGT3";
  const l = mechanicalLayout(car, body, shape);
  const r = body.spec.wheelR;
  const x0 = body.frontX;
  const z0 = body.wheelZ;
  switch (system) {
    case "engine": {
      const L = l.engineLength;
      const s = l.engineScale;
      const e = ([x, y, z]: V3): V3 => [
        l.engineX + s * x,
        l.engineY + s * y,
        s * z,
      ];
      const banks = engineBanks(car, L);
      const bank = banks.find((b) => b.side >= 0) ?? banks[0];
      const turbos = engineeringLayoutFor(car).turboCount;
      const turbo: V3 =
        car.engine.config === "I"
          ? [-L * 0.25 + (turbos - 1) * L * 0.44, 0.04, 0.31]
          : [-L * 0.43, 0.025, 0.3];
      return [
        a("cylinder", e([L * 0.22, -0.03, 0.15])),
        a("cam covers", e(rotatedBankPoint(-L * 0.2, 0.34, 0, bank.angle))),
        car.engine.turbo
          ? a("turbo", e(turbo))
          : a(
              "airbox",
              e([L * 0.2, car.engine.config === "F" ? 0.29 : 0.4, 0]),
            ),
        a("exhaust", e([L * 0.12, 0.05, 0.285])),
        a(
          "circuit",
          e(
            engineeringLayoutFor(car).drySump
              ? [L * 0.43, 0.2, -0.29]
              : [L * 0.36, -0.0825, 0.13],
          ),
        ),
      ];
    }
    case "gearbox": {
      const d = drivelineInterfaces(car, l);
      const len = l.gearboxTransverse ? 0.38 : l.gearboxLength;
      const half = l.gearboxTransverse ? 0.32 : 0.165;
      const x = l.gearboxX;
      const tail = x - d.direction * len * 0.38;
      return [
        a("clutch", [d.bellhousingX, 0.3, 0.12]),
        a("cassette", [x, 0.33, half]),
        a("shift actuator", [x + d.direction * len * 0.15, 0.46, 0]),
        a("final drive", [tail, 0.27, half * 0.8]),
        a(["output", "longitudinal"], [tail, 0.22, half + 0.14]),
      ];
    }
    case "hybrid": {
      if (!car.hybrid) return [];
      const front = car.hybrid.kind === "LMH front axle";
      const motorX = front
        ? body.frontX
        : l.gearboxX +
          (l.gearboxTransverse ? 0.27 : l.gearboxLength / 2 + 0.025);
      const motorY = front ? 0.31 : l.engineY;
      const batteryX = body.x(shape.cockpit.to) + 0.35;
      return [
        a(["motor-generator", "mgu"], [motorX, motorY + 0.08, 0.1]),
        a("battery", [batteryX, 0.22, 0.12]),
        a("inverter", [front ? motorX - 0.22 : batteryX - 0.15, 0.26, 0.08]),
        a("high-voltage", [(batteryX + motorX) / 2, 0.22, 0.06]),
        a("control unit", [batteryX + 0.11, 0.27, -0.02]),
      ];
    }
    case "cooling": {
      const x = proto
        ? body.x(shape.cockpit.to) + 0.12
        : body.spec.length / 2 - 0.36;
      const z = proto ? 0.55 : 0;
      return [
        a("radiator", [x, proto ? 0.38 : 0.45, z]),
        a("inlet duct", [x + 0.22, proto ? 0.3 : 0.38, proto ? 0.68 : 0.3]),
      ];
    }
    case "fuel": {
      const front = engineeringLayoutFor(car).fuelLocation === "front";
      const y = front ? 0.3 : proto ? 0.31 : 0.34;
      const width = front ? 0.54 : 0.62;
      const height = front ? 0.31 : 0.42;
      return [
        a("fuel cell", [l.fuelX, y, width / 2]),
        a("collector", [l.fuelX, y - height / 2 + 0.06, width / 2 - 0.12]),
        a("refuelling", [l.fuelX, y + height / 2, width / 2 + 0.1]),
      ];
    }
    case "suspension": {
      const pushrod =
        engineeringLayoutFor(car).suspensionKind === "pushrod" ||
        (proto && engineeringLayoutFor(car).suspensionKind === "unverified");
      const inZ = proto ? 0.23 : 0.45;
      const outZ = z0 - 0.12;
      const upY = proto ? 0.465 : 0.505;
      return [
        a(["wishbone", "link"], [x0 + 0.1, upY - 0.01, (inZ + outZ) / 2]),
        a("upright", [x0, 0.33, outZ + 0.03]),
        a(
          ["pushrod", "damper attachment"],
          pushrod ? [x0 - 0.015, 0.455, inZ] : [x0, upY - 0.03, outZ - 0.1],
        ),
        a(
          ["torsion", "spring and damper"],
          pushrod
            ? [x0 - 0.16, 0.44, (inZ + 0.09) / 2]
            : [x0 - 0.02, 0.4, outZ - 0.12],
        ),
        a("anti-roll", [x0 - 0.24, 0.43, 0.05]),
      ];
    }
    case "brakes": {
      const outer = r * 0.54;
      const z = z0 - 0.06;
      return [
        a(["disc", "ring"], [x0 - outer * 0.55, r + outer * 0.55, z]),
        a("caliper", [x0 + outer * 0.79, r + outer * 0.17, z]),
        a("disc bell", [x0, r, z - 0.04]),
      ];
    }
    case "wheels": {
      const tyre = body.spec.tyreW;
      return [
        a("centre-lock", [x0, r, z0 + tyre / 2 + 0.02]),
        a("rim", [x0 + r * 0.35, r + r * 0.32, z0 + tyre / 2]),
        a("tyre", [x0 - r * 0.2, r * 1.97, z0]),
        a("hub bearing", [x0, r, z0 - tyre / 2]),
      ];
    }
    case "cockpit": {
      const c = cockpitLayout(car, body, shape);
      // Surface points rather than part centres, so leaders start on visible
      // upholstery, rim, pedal face and instrument face.
      return [
        a("seat", [c.seatX + 0.11, c.floor + 0.085, c.z + 0.14]),
        a("harness", [c.seatX - 0.2, c.floor + 0.46, c.z + 0.095]),
        a("wheel", [c.wheel[0] - 0.02, c.wheel[1] + 0.15, c.wheel[2] + 0.11]),
        a("pedal box", [
          c.pedals[0] + 0.035,
          c.pedals[1] + 0.16,
          c.pedals[2] + 0.09,
        ]),
        a("display", [c.dash[0] - 0.06, c.dash[1] + 0.04, c.dash[2] + 0.09]),
      ];
    }
    case "body": {
      const fa = body.spec.frontAxle;
      const roof = shape.cockpit.roof;
      return [
        a("nose", body.pointAt(fa, 0.55).toArray() as V3),
        a("cooling inlets", body.pointAt(fa + 0.08, 0.8).toArray() as V3),
        a(["canopy", "roof"], [body.x(roof), body.topAt(roof), 0]),
        a("rear cover", [body.x(0.86), body.topAt(0.86), 0.25]),
      ];
    }
    case "wing": {
      const w = shape.wing;
      const x = body.x(w.t);
      return [
        a("main aerofoil", [x + w.chord * 0.1, w.y, w.span * 0.22]),
        a("trailing-edge", [x - w.chord * 0.3, w.y + 0.06, -w.span * 0.15]),
        a("endplates", [x, w.y - 0.04, w.span / 2]),
        a("pylons", [x + 0.05, w.y - 0.1, 0.18]),
      ];
    }
    case "floor": {
      const y = body.spec.kind === "gt" ? 0.085 : 0.05;
      return [
        a("splitter", [body.x(0.02), y + 0.02, 0.45]),
        a("working surface", [(x0 + body.rearX) / 2, y, z0 - 0.35]),
        a("diffuser", [body.rearX - 0.3, y + 0.12, 0.35]),
        a("skid", [(x0 + body.rearX) / 2 + 0.4, y - 0.02, 0]),
      ];
    }
    case "lights":
      return [
        a("headlamp", body.pointAt(0.035, 0.5).toArray() as V3),
        a("tail", body.pointAt(0.975, 0.55).toArray() as V3),
      ];
    case "chassis": {
      const c = cockpitLayout(car, body, shape);
      return [
        a(
          ["survival cell", "monocage", "structural shell"],
          [c.seat[0] + 0.2, proto ? 0.4 : 0.6, proto ? 0.38 : 0.6],
        ),
        a(
          ["safety cage", "bulkhead"],
          proto ? [x0 + 0.3, 0.3, 0.2] : [c.wheel[0], 1.0, 0.45],
        ),
        a("side-impact", [c.seat[0], proto ? 0.3 : 0.45, proto ? 0.45 : 0.75]),
        a("crash structures", [body.x(0.03), 0.25, 0]),
      ];
    }
  }
}
