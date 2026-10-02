import * as THREE from "three";

type Point = [number, number, number];

/** Smooth open seat cradle. Cross-section shoulders and hips turn toward the driver. */
export function seatShellGeometry(recline = 1) {
  const profile = new THREE.CatmullRomCurve3(
    [
      [0.27, 0.02, 0.16],
      [0.17, -0.002, 0.19],
      [-0.025, 0.018, 0.19],
      [-0.13, 0.16, 0.18],
      [-0.19, 0.33, 0.2],
      [-0.25, 0.48, 0.23],
      [-0.29, 0.65, 0.145],
    ].map((p) => new THREE.Vector3(...p)),
  );
  const position: number[] = [],
    index: number[] = [],
    uv: number[] = [];
  const rows = 40,
    cols = 24;
  for (let i = 0; i <= rows; i++) {
    const { x, y, z: width } = profile.getPoint(i / rows);
    const lower = 1 - THREE.MathUtils.smoothstep(y, 0.07, 0.19);
    for (let j = 0; j <= cols; j++) {
      const u = (j / cols) * 2 - 1,
        edge = Math.pow(Math.abs(u), 3);
      position.push(
        x * recline + edge * 0.12 * (1 - lower),
        y + edge * 0.12 * lower,
        u * width,
      );
      uv.push(j / cols, i / rows);
      if (i < rows && j < cols) {
        const a = i * (cols + 1) + j;
        index.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Finite-width webbing follows the path, including lap paths across the seat. */
export function harnessRibbonGeometry(points: Point[], width = 0.046) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const position: number[] = [],
    index: number[] = [],
    uv: number[] = [];
  let previous: THREE.Vector3 | null = null;
  for (let i = 0; i <= 32; i++) {
    const p = curve.getPoint(i / 32),
      tangent = curve.getTangent(i / 32);
    let transverse = tangent.clone().cross(new THREE.Vector3(1, 0, 0));
    if (transverse.lengthSq() < 0.01)
      transverse = tangent.clone().cross(new THREE.Vector3(0, 1, 0));
    transverse.normalize();
    if (previous && previous.dot(transverse) < 0) transverse.negate();
    previous = transverse.clone();
    transverse.multiplyScalar(width / 2);
    const left = p.clone().sub(transverse),
      right = p.clone().add(transverse);
    position.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uv.push(0, i / 32, 1, i / 32);
    if (i < 32) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
