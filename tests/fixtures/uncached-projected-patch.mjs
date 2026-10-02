import * as THREE from "three";

// Frozen pre-optimization projection algorithm. Kept independent from the new
// helper so parity covers triangulation, subdivision order, winding and normals.
export function uncachedProjectedPatch(
  body,
  points,
  side,
  lift = 0.003,
  detail = 3,
) {
  const contour = points.map(([t, v]) => new THREE.Vector2(t, v));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos = [],
    normals = [];
  const project = (a, b, c, depth) => {
    if (depth) {
      const ab = a.clone().add(b).multiplyScalar(0.5);
      const bc = b.clone().add(c).multiplyScalar(0.5);
      const ca = c.clone().add(a).multiplyScalar(0.5);
      project(a, ab, ca, depth - 1);
      project(ab, b, bc, depth - 1);
      project(ca, bc, c, depth - 1);
      project(ab, bc, ca, depth - 1);
      return;
    }
    for (const vertex of side > 0 ? [a, c, b] : [a, b, c]) {
      const base = body.pointAt(vertex.x, vertex.y, side);
      const n = body
        .surfaceAt(vertex.x, vertex.y, side, 1)
        .sub(base)
        .normalize();
      normals.push(...n.toArray());
      pos.push(...base.addScaledVector(n, lift).toArray());
    }
  };
  for (const [a, b, c] of faces)
    project(contour[a], contour[b], contour[c], detail);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
