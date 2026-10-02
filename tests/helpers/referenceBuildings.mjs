// Test-only reference: the Three.js building pipeline shipped before offline Rust compilation.
// Kept independent of the compiler to check coverage, holes, height semantics and GPU coordinates.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLngLat, terrainElevationAt } from "../../src/data/trackGeo.ts";
import { createTrackProximityTester } from "../../src/data/trackProximity.ts";
const S = 0.1;
export const referenceBuildingGeometry = (track) => {
  const solids = [],
    footprints = [];
  // The map view contains the full dataset; the lap study keeps a sourced 600 m corridor.
  const nearTrack = createTrackProximityTester(track, 600);
  let featureCount = 0;
  for (const feature of track.context?.buildings?.features ?? []) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    const height = feature.properties.height;
    const heightKnown =
      typeof height === "number" &&
      Number.isFinite(height) &&
      height > 0 &&
      !!feature.properties.heightSource;
    let included = false;
    for (const rings of polygons) {
      if (!rings[0] || rings[0].length < 4) continue;
      const centre = rings[0].reduce(
        ([lng, lat], p) => [
          lng + p[0] / rings[0].length,
          lat + p[1] / rings[0].length,
        ],
        [0, 0],
      );
      const [cx, cz] = projectLngLat(track, centre[0], centre[1]);
      if (!nearTrack(cx, cz)) continue;
      const projected = rings.map((ring) =>
        ring.map((p) => projectLngLat(track, p[0], p[1])),
      );
      const ground =
        feature.properties.groundElevation ??
        feature.properties.altitude_minimale_sol;
      const base =
        typeof ground === "number" &&
        Number.isFinite(ground) &&
        ground > -1000 &&
        ground < 10000
          ? ground
          : terrainElevationAt(track, cx, cz);
      const shape = new THREE.Shape(
        projected[0].map(([x, z]) => new THREE.Vector2(x * S, -z * S)),
      );
      for (const hole of projected.slice(1))
        shape.holes.push(
          new THREE.Path(
            hole.map(([x, z]) => new THREE.Vector2(x * S, -z * S)),
          ),
        );
      const solid = heightKnown && base !== null;
      const geometry = solid
        ? new THREE.ExtrudeGeometry(shape, {
            depth: height * S,
            bevelEnabled: false,
            steps: 1,
          })
        : new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(
        0,
        (base === null ? 0 : (base - track.elevationBase) * S) + 0.006,
        0,
      );
      const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
      if (nonIndexed !== geometry) geometry.dispose();
      (solid ? solids : footprints).push(nonIndexed);
      included = true;
    }
    if (included) featureCount++;
  }
  const solid = solids.length ? mergeGeometries(solids) : null,
    footprint = footprints.length ? mergeGeometries(footprints) : null;
  [...solids, ...footprints].forEach((geometry) => geometry.dispose());
  return { solid, footprint, featureCount };
};
