import * as THREE from "three";

export type SurfaceProjector = {
  pointAt: (t: number, v: number, side?: number) => THREE.Vector3;
  surfaceAt: (
    t: number,
    v: number,
    side?: number,
    lift?: number,
  ) => THREE.Vector3;
};

export type ProjectionStats = {
  emittedVertices: number;
  evaluatedSamples: number;
};
export type ProjectionOptions = { cache?: boolean; stats?: ProjectionStats };
type Sample = [number, number, number, number, number, number];

/** Project the same ordered triangle soup while evaluating shared UV points once.
 * The cache belongs to this build only. No car, geometry, or renderer is retained.
 */
export function projectedPatchGeometry(
  body: SurfaceProjector,
  points: [number, number][],
  side: number,
  lift = 0.003,
  detail = 3,
  options: ProjectionOptions = {},
) {
  const contour = points.map(([t, v]) => new THREE.Vector2(t, v));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const vertexCount = faces.length * 4 ** detail * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const cache =
    options.cache === false ? null : new Map<number, Map<number, Sample>>();
  let cursor = 0;
  let evaluatedSamples = 0;

  const sample = (vertex: THREE.Vector2): Sample => {
    let row = cache?.get(vertex.x);
    const cached = row?.get(vertex.y);
    if (cached) return cached;
    const base = body.pointAt(vertex.x, vertex.y, side);
    const normal = body
      .surfaceAt(vertex.x, vertex.y, side, 1)
      .sub(base)
      .normalize();
    base.addScaledVector(normal, lift);
    const value: Sample = [
      base.x,
      base.y,
      base.z,
      normal.x,
      normal.y,
      normal.z,
    ];
    evaluatedSamples++;
    if (cache) {
      if (!row) {
        row = new Map();
        cache.set(vertex.x, row);
      }
      row.set(vertex.y, value);
    }
    return value;
  };

  const project = (
    a: THREE.Vector2,
    b: THREE.Vector2,
    c: THREE.Vector2,
    depth: number,
  ) => {
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
    // Retain the old triangle order and mirrored winding exactly. The patches
    // have no UV attribute; (t,v) is only the projection coordinate system.
    const vertices = side > 0 ? [a, c, b] : [a, b, c];
    for (const vertex of vertices) {
      const value = sample(vertex);
      positions[cursor] = value[0];
      positions[cursor + 1] = value[1];
      positions[cursor + 2] = value[2];
      normals[cursor] = value[3];
      normals[cursor + 1] = value[4];
      normals[cursor + 2] = value[5];
      cursor += 3;
    }
  };
  for (const [a, b, c] of faces)
    project(contour[a], contour[b], contour[c], detail);

  if (options.stats) {
    options.stats.emittedVertices = vertexCount;
    options.stats.evaluatedSamples = evaluatedSamples;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
