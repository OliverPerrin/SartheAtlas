import * as THREE from "three";
import { BodyProfile } from "../data/bodyProfile.ts";
export { V } from "../data/bodyProfile.ts";
export type { BodySpec, Keys } from "../data/bodyProfile.ts";

export class Body extends BodyProfile {
  // Surface point for placing details. side = 1 (+z) or -1 (−z).
  pointAt(t: number, v: number, side = 1) {
    const s = this.section(t);
    let i = 0;
    while (i < s.length - 2 && s[i + 1][2] < v) i++;
    const a = s[i],
      b = s[i + 1];
    const k = (v - a[2]) / Math.max(1e-6, b[2] - a[2]);
    const z = a[0] + (b[0] - a[0]) * k;
    const y = a[1] + (b[1] - a[1]) * k;
    return new THREE.Vector3(this.x(t), y, z * side);
  }
  // A point just above the skin, with the true surface normal. Details use the
  // same parametric surface as the shell, so glazing and seams never float.
  surfaceAt(t: number, v: number, side = 1, lift = 0.003) {
    const point = this.pointAt(t, v, side);
    const dt = this.pointAt(Math.min(1, t + 0.003), v, side).sub(
      this.pointAt(Math.max(0, t - 0.003), v, side),
    );
    const dv = this.pointAt(t, Math.min(1, v + 0.008), side).sub(
      this.pointAt(t, Math.max(0, v - 0.008), side),
    );
    const normal = dv.cross(dt).normalize().multiplyScalar(side);
    return point.addScaledVector(normal, lift);
  }
  // Triangulate in UV space, then subdivide before projecting onto the skin.
  // This preserves a curved windscreen rather than placing a flat polygon over it.
  patch(points: [number, number][], side: number, lift = 0.003, detail = 3) {
    const contour = points.map(([t, v]) => new THREE.Vector2(t, v));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const pos: number[] = [];
    const normals: number[] = [];
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
      const vertices = side > 0 ? [a, c, b] : [a, b, c];
      for (const vertex of vertices) {
        const base = this.pointAt(vertex.x, vertex.y, side);
        const n = this.surfaceAt(vertex.x, vertex.y, side, 1)
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
    // Analytic normals keep reflections smooth across the projected triangles.
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    return geometry;
  }
  geometry() {
    const ts = this.samples();
    const secs = ts.map((t) => this.section(t));
    const m = secs[0].length;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const centreRows: number[][] = [];
    for (const side of [1, -1]) {
      const base = pos.length / 3;
      centreRows.push(
        ts.flatMap((_, i) => [base + i * m, base + i * m + m - 1]),
      );
      ts.forEach((t, i) => {
        for (const [z, y, v] of secs[i]) {
          pos.push(this.x(t), y, z * side);
          // −z side: nose on the left of the texture's top band; +z side: mirrored, bottom band.
          if (side < 0) uv.push(t, 0.5 + v * 0.5);
          else uv.push(1 - t, v * 0.5);
        }
      });
      for (let i = 0; i < ts.length - 1; i++)
        for (let j = 0; j < m - 1; j++) {
          const a = base + i * m + j,
            b = a + m;
          if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
          else idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      // End caps (fan from the section centroid).
      for (const end of [0, ts.length - 1]) {
        const sec = secs[end];
        const cy = sec.reduce((acc, p) => acc + p[1], 0) / m;
        const c = pos.length / 3;
        pos.push(this.x(ts[end]), cy, 0);
        const paint = end === 0 || this.spec.tailCap === "paint";
        const capUV: [number, number] = paint ? [0.002, 0.75] : [0.002, 0.502];
        uv.push(...capUV);
        const start = pos.length / 3;
        for (const [z, y] of sec) {
          pos.push(this.x(ts[end]), y, z * side);
          uv.push(...capUV);
        }
        for (let j = 0; j < m - 1; j++) {
          const flip = (end === 0) !== side > 0;
          if (flip) idx.push(c, start + j, start + j + 1);
          else idx.push(c, start + j + 1, start + j);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // The two UV islands duplicate the centreline. Average their normals to
    // eliminate a hard lighting seam along the roof, bonnet and engine cover.
    const normals = g.getAttribute("normal");
    // Arch samples are deliberately nonuniform. Triangle-area-weighted normals
    // otherwise produce corrugated highlights where those tiny triangles meet
    // the regular longitudinal grid. Evaluate skin derivatives consistently.
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const side = sideIndex === 0 ? 1 : -1;
      const base = centreRows[sideIndex][0];
      ts.forEach((t, i) =>
        secs[i].forEach(([, , v], j) => {
          const n = this.surfaceAt(t, v, side, 1)
            .sub(this.pointAt(t, v, side))
            .normalize();
          normals.setXYZ(base + i * m + j, n.x, n.y, n.z);
        }),
      );
    }
    const average = new THREE.Vector3();
    for (let i = 0; i < centreRows[0].length; i++) {
      const a = centreRows[0][i],
        b = centreRows[1][i];
      average
        .set(
          normals.getX(a) + normals.getX(b),
          normals.getY(a) + normals.getY(b),
          0,
        )
        .normalize();
      normals.setXYZ(a, average.x, average.y, 0);
      normals.setXYZ(b, average.x, average.y, 0);
    }
    return g;
  }
}
