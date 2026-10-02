import * as THREE from "three";

// Rounded slick section in metres at the study's nominal 0.357 m radius.
const profile = [
  [0.232, -0.15],
  [0.3, -0.165],
  [0.34, -0.155],
  [0.354, -0.12],
  [0.357, 0],
  [0.354, 0.12],
  [0.34, 0.155],
  [0.3, 0.165],
  [0.232, 0.15],
].map(([r, y]) => new THREE.Vector2(r, y));

export function slickTyreGeometry() {
  const sampled = new THREE.SplineCurve(profile).getPoints(96);
  const rubber = new THREE.LatheGeometry(sampled, 80);
  // Branding follows the curved sidewall, including its shoulder transition.
  // A planar ring over this profile leaves a visibly detached outer lip.
  const sidewalls = [-1, 1].map((side) => {
    const wall = sampled
      .filter((p) => p.y * side > 0.135)
      .map((p) => new THREE.Vector2(p.x + 0.0004, p.y + side * 0.0005));
    const g = new THREE.LatheGeometry(wall, 80);
    const positions = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(
        i,
        0.5 - (side * positions.getX(i)) / 0.72,
        0.5 + (side * positions.getZ(i)) / 0.72,
      );
    }
    return g;
  });
  return { rubber, sidewalls };
}
