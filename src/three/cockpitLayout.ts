import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import type { V3 } from "./primitives.tsx";

// World coordinates before the cockpit Part explosion offset. Front is +X.
export function cockpitLayout(car: Car, body: Body, shape: Shape) {
  const prototype = car.category !== "LMGT3";
  const x = body.x(shape.cockpit.roof);
  const z = prototype ? 0.08 : -0.36;
  const floor = prototype ? 0.12 : 0.17;
  return {
    prototype,
    floor,
    z,
    seatX: x + (prototype ? 0.02 : -0.05),
    wheel: [x + 0.4, prototype ? 0.5 : 0.62, z] as V3,
    dash: [x + 0.59, prototype ? 0.64 : 0.75, z] as V3,
    pedals: [x + 0.78, floor + 0.035, z] as V3,
    seat: [x - 0.11, floor + 0.35, z] as V3,
    // Bounds exclude the separate chassis/roll cage and exploded offset.
    bounds: {
      min: [x - 0.42, floor - 0.025, prototype ? -0.3 : -0.68] as V3,
      max: [x + 1.09, prototype ? 0.96 : 1.04, prototype ? 0.35 : 0.55] as V3,
    },
  };
}
