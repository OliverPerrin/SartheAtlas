import type { TrackGeo } from "./trackGeo.ts";

// Spatially index the actual segments; test exactly the same point-to-segment
// distance as the full scan, without scanning the whole lap for every building.
export function createTrackProximityTester(
  track: Pick<TrackGeo, "points">,
  radius: number,
) {
  if (!(radius > 0) || !Number.isFinite(radius))
    throw Error("Invalid corridor radius");
  const cells = new Map<string, number[]>();
  const size = radius;
  const key = (x: number, z: number) => `${x},${z}`;
  for (let i = 0; i < track.points.length; i++) {
    const a = track.points[i],
      b = track.points[(i + 1) % track.points.length];
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - radius) / size);
      x <= Math.floor((Math.max(a[0], b[0]) + radius) / size);
      x++
    )
      for (
        let z = Math.floor((Math.min(a[1], b[1]) - radius) / size);
        z <= Math.floor((Math.max(a[1], b[1]) + radius) / size);
        z++
      ) {
        const id = key(x, z);
        const candidates = cells.get(id);
        if (candidates) candidates.push(i);
        else cells.set(id, [i]);
      }
  }
  return (x: number, z: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const candidates =
      cells.get(key(Math.floor(x / size), Math.floor(z / size))) ?? [];
    for (const i of candidates) {
      const a = track.points[i],
        b = track.points[(i + 1) % track.points.length];
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
        ),
      );
      if ((x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2 <= radius ** 2)
        return true;
    }
    return false;
  };
}
