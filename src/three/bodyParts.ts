import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Body } from "./body.ts";

// Exterior pieces as plain three.js geometry, shared by the studio model and
// the cars drawn inside the aerial map.

/** A lip following each wheel opening on the body side. */
export function archLipGeometry(body: Body, radius = 0.016, segments = 28) {
  const { wheelR, archGap } = body.spec;
  const R = wheelR + archGap;
  const tubes: THREE.BufferGeometry[] = [];
  for (const axle of [body.frontX, body.rearX])
    for (const side of [1, -1]) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = Math.PI * (0.04 + (0.92 * i) / segments);
        const x = axle + R * Math.cos(a) * 0.998;
        const p = body.pointAt(body.t(x), 0.2, side);
        points.push(new THREE.Vector3(x, p.y, p.z + side * 0.004));
      }
      tubes.push(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          segments * 2,
          radius,
          6,
          false,
        ),
      );
    }
  const merged = mergeGeometries(tubes)!;
  tubes.forEach((tube) => tube.dispose());
  return merged;
}
