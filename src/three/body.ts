import * as THREE from "three";
import { BodyProfile } from "../data/bodyProfile.ts";
import { projectedPatchGeometry } from "./projectedPatch.ts";
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
    return projectedPatchGeometry(this, points, side, lift, detail);
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
      // End closures. Each end is a short stack of rings shrunk toward the
      // section centre, finished with a fan: a flat nose, a painted GT tail (the
      // profile already domes it), and on prototypes an open tail recessed
      // behind a rim.
      for (const end of [0, ts.length - 1]) {
        const sec = secs[end];
        const tail = end !== 0;
        const paint = !tail || this.spec.tailCap === "paint";
        const capUV: [number, number] = paint ? [0.002, 0.75] : [0.002, 0.502];
        const cy = sec.reduce((acc, p) => acc + p[1], 0) / m;
        const x0 = this.x(ts[end]);
        // [offset along x, scale about the section centre]
        const rings: [number, number][] = !tail
          ? [[0, 1]]
          : paint
            ? [[0, 1]]
            : [
                [0, 1],
                [0.004, 0.925],
                [0.22, 0.86],
              ];
        const recessed = tail && !paint;
        const inside = new THREE.Vector3(x0 + (tail ? 0.8 : -0.8), cy, 0);
        const behind = new THREE.Vector3(x0 - 2, cy, 0);
        const at = (i: number) =>
          new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        // Orient each triangle by where it should face, rather than by a
        // winding convention that differs per side, end and ring direction.
        const tri = (a: number, b: number, c: number, towardBehind: boolean) => {
          const pa = at(a),
            pb = at(b),
            pc = at(c);
          const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa));
          if (normal.lengthSq() < 1e-14) return;
          const centre = pa.add(pb).add(pc).multiplyScalar(1 / 3);
          const facing = towardBehind
            ? normal.dot(behind.clone().sub(centre))
            : normal.dot(centre.clone().sub(inside));
          if (facing >= 0) idx.push(a, b, c);
          else idx.push(a, c, b);
        };
        // A painted tail carries the livery round the corner; its centre takes
        // the colour of the body side so the bumper never borrows the nose's.
        const wrap = tail && paint;
        const skinUV = (v: number): [number, number] =>
          side < 0 ? [ts[end], 0.5 + v * 0.5] : [1 - ts[end], v * 0.5];
        const centreUV = wrap ? skinUV(0.32) : capUV;
        const starts: number[] = [];
        for (const [dx, scale] of rings) {
          starts.push(pos.length / 3);
          for (const [z, y, v] of sec) {
            pos.push(x0 + dx, cy + (y - cy) * scale, z * scale * side);
            uv.push(...(wrap ? skinUV(v) : capUV));
          }
        }
        for (let r = 0; r < rings.length - 1; r++)
          for (let j = 0; j < m - 1; j++) {
            const a = starts[r] + j,
              b = starts[r + 1] + j;
            // The recess walls and back face whoever stands behind the car.
            const look = recessed && r >= 1;
            tri(a, a + 1, b, look);
            tri(b, a + 1, b + 1, look);
          }
        const c = pos.length / 3;
        pos.push(x0 + rings[rings.length - 1][0], cy, 0);
        uv.push(...centreUV);
        const start = starts[starts.length - 1];
        for (let j = 0; j < m - 1; j++)
          tri(c, start + j, start + j + 1, recessed);
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
