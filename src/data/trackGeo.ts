import { useEffect, useState } from "react";
import { lapTargets } from "./track.ts";
import type { ClassName } from "./cars.ts";

type Feature = {
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: {
    role: string;
    display?: string;
    number?: number;
    direction?: string;
    scale?: number;
    marker?: number;
    labels?: Record<string, string>;
  };
};

export type LngLat = [number, number];
export type GeoOrigin = { longitude: number; latitude: number };
export type ElevationSample = {
  fraction: number;
  distance: number;
  lng: number;
  lat: number;
  elevation: number | null;
  accuracy?: number | string | null;
};
export type TerrainGrid = {
  bbox: [number, number, number, number];
  columns: number;
  rows: number;
  values: (number | null)[];
  source?: string;
  [key: string]: unknown;
};
export type BuildingFeature = {
  type: "Feature";
  id?: string | number;
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
  properties: {
    id?: string | number;
    name?: string | null;
    type?: string;
    height?: number | null;
    heightSource?: string | null;
    source?: string;
    [key: string]: unknown;
  };
};
export type CircuitContext = {
  schemaVersion: number;
  fetchedAt?: string;
  bbox?: [number, number, number, number];
  origin?: [number, number];
  elevation?: {
    source: string;
    resource?: string;
    verticalDatum?: string;
    verticalCrs?: string;
    units?: string;
    sampleSpacingMetres?: number;
    samples: ElevationSample[];
    trackSamples?: (number | null | ElevationSample)[];
    [key: string]: unknown;
  };
  terrainGrid?: TerrainGrid;
  buildings?: { type: "FeatureCollection"; features: BuildingFeature[] };
  layers?: { buildings?: string; roads?: string; landuse?: string };
  [key: string]: unknown;
};

export type Corner = {
  number: number;
  name: string;
  official?: string;
  direction: string;
  scale: number;
  fraction: number;
  x: number;
  z: number;
  longitude: number;
  latitude: number;
  elevation: number | null;
};

export type TrackGeo = {
  points: [number, number][]; // metres, x east, z south
  lngLat: LngLat[];
  origin: GeoOrigin;
  elevations: (number | null)[]; // absolute source datum, missing samples stay null
  elevationBase: number; // local 3D zero; not a replacement vertical datum
  context?: CircuitContext;
  contextStatus: "ready" | "partial" | "unavailable";
  cum: number[];
  length: number;
  corners: Corner[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

// Local tangent approximation using WGS84 meridional/transverse radii at the origin.
// It is reversible and keeps metric scene geometry aligned to the geographic source.
const DEG = Math.PI / 180;
const projectionScale = new WeakMap<GeoOrigin, [number, number]>();
function originOf(reference: TrackGeo | GeoOrigin): GeoOrigin {
  return "origin" in reference ? reference.origin : reference;
}
function scales(origin: GeoOrigin): [number, number] {
  const cached = projectionScale.get(origin);
  if (cached) return cached;
  const a = 6378137,
    e2 = 0.00669437999014;
  const latitude = origin.latitude * DEG;
  const w = Math.sqrt(1 - e2 * Math.sin(latitude) ** 2);
  const value: [number, number] = [
    ((DEG * a) / w) * Math.cos(latitude),
    (DEG * a * (1 - e2)) / w ** 3,
  ];
  projectionScale.set(origin, value);
  return value;
}
export function projectLngLat(
  reference: TrackGeo | GeoOrigin,
  longitude: number,
  latitude: number,
): [number, number] {
  const origin = originOf(reference),
    [east, north] = scales(origin);
  return [
    (longitude - origin.longitude) * east,
    -(latitude - origin.latitude) * north,
  ];
}
export function unprojectXZ(
  reference: TrackGeo | GeoOrigin,
  x: number,
  z: number,
): LngLat {
  const origin = originOf(reference),
    [east, north] = scales(origin);
  return [origin.longitude + x / east, origin.latitude - z / north];
}
function validElevation(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > -1000 &&
    value < 10000
  );
}

export function profileElevationAt(
  context: CircuitContext | undefined,
  fraction: number,
): number | null {
  const samples = context?.elevation?.samples;
  if (!samples?.length) return null;
  const f = ((fraction % 1) + 1) % 1;
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].fraction <= f) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi];
  const u = Math.min(
    1,
    Math.max(0, (f - a.fraction) / (b.fraction - a.fraction || 1)),
  );
  if (u <= 1e-9 && validElevation(a.elevation)) return a.elevation;
  if (u >= 1 - 1e-9 && validElevation(b.elevation)) return b.elevation;
  if (!validElevation(a.elevation) || !validElevation(b.elevation)) return null;
  return a.elevation + (b.elevation - a.elevation) * u;
}
export function terrainElevationAt(
  track: TrackGeo,
  x: number,
  z: number,
): number | null {
  const grid = track.context?.terrainGrid;
  if (
    !grid ||
    grid.columns < 2 ||
    grid.rows < 2 ||
    grid.values.length !== grid.columns * grid.rows
  )
    return null;
  const [lng, lat] = unprojectXZ(track, x, z),
    [west, south, east, north] = grid.bbox;
  if (
    lng < west ||
    lng > east ||
    lat < south ||
    lat > north ||
    east <= west ||
    north <= south
  )
    return null;
  const gx = ((lng - west) / (east - west)) * (grid.columns - 1),
    gy = ((north - lat) / (north - south)) * (grid.rows - 1);
  const ix = Math.min(grid.columns - 2, Math.floor(gx)),
    iy = Math.min(grid.rows - 2, Math.floor(gy));
  const u = gx - ix,
    v = gy - iy;
  const values = [
    grid.values[iy * grid.columns + ix],
    grid.values[iy * grid.columns + ix + 1],
    grid.values[(iy + 1) * grid.columns + ix],
    grid.values[(iy + 1) * grid.columns + ix + 1],
  ];
  if (!values.every(validElevation)) return null;
  return (
    values[0]! * (1 - u) * (1 - v) +
    values[1]! * u * (1 - v) +
    values[2]! * (1 - u) * v +
    values[3]! * u * v
  );
}

export function buildTrack(
  features: Feature[],
  context?: CircuitContext,
): TrackGeo {
  const outline = features.find((f) => f.properties.role === "outline");
  if (!outline || outline.geometry.type !== "LineString")
    throw Error("Circuit centreline is unavailable");
  const raw = outline.geometry.coordinates as number[][];
  if (
    raw.length < 3 ||
    raw.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))
  )
    throw Error("Circuit centreline is invalid");
  const origin: GeoOrigin = context?.origin
    ? { longitude: context.origin[0], latitude: context.origin[1] }
    : {
        longitude: raw.reduce((sum, p) => sum + p[0], 0) / raw.length,
        latitude: raw.reduce((sum, p) => sum + p[1], 0) / raw.length,
      };
  const lngLat: LngLat[] = raw.map((p) => [p[0], p[1]]);
  const points = lngLat.map((p) => projectLngLat(origin, p[0], p[1]));
  if (
    Math.hypot(
      points[0][0] - points.at(-1)![0],
      points[0][1] - points.at(-1)![1],
    ) < 1
  ) {
    points.pop();
    lngLat.pop();
  }
  const cum = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1],
      b = points[i % points.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[points.length];
  const indexed = context?.elevation?.trackSamples;
  const elevations = points.map((_, i) => {
    const sample = indexed?.[i];
    const value =
      typeof sample === "object" && sample !== null ? sample.elevation : sample;
    if (sample !== undefined) return validElevation(value) ? value : null;
    return profileElevationAt(context, cum[i] / length);
  });
  const known = elevations.filter(validElevation);
  const elevationBase = known.length ? Math.min(...known) : 0;
  const track: TrackGeo = {
    points,
    lngLat,
    origin,
    elevations,
    elevationBase,
    context,
    contextStatus: !context
      ? "unavailable"
      : known.length === points.length && !!context.terrainGrid
        ? "ready"
        : "partial",
    cum,
    length,
    corners: [],
    bounds: {
      minX: Math.min(...points.map((p) => p[0])),
      maxX: Math.max(...points.map((p) => p[0])),
      minZ: Math.min(...points.map((p) => p[1])),
      maxZ: Math.max(...points.map((p) => p[1])),
    },
  };
  track.corners = features
    .filter((f) => f.properties.role === "corner")
    .map((f) => {
      const [longitude, latitude] = f.geometry.coordinates as number[];
      const [x, z] = projectLngLat(track, longitude, latitude);
      let bestDistance = Infinity,
        along = 0;
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        const dx = b[0] - a[0],
          dz = b[1] - a[1];
        const u = Math.max(
          0,
          Math.min(
            1,
            ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
        const distance = Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u);
        if (distance < bestDistance) {
          bestDistance = distance;
          along = cum[i] + u * (cum[i + 1] - cum[i]);
        }
      }
      const fraction = along / length;
      return {
        number: f.properties.number ?? 0,
        name: f.properties.display ?? "Corner",
        official: f.properties.labels?.official,
        direction: f.properties.direction ?? "right",
        scale: f.properties.scale ?? 4,
        fraction,
        x,
        z,
        longitude,
        latitude,
        elevation: pointAt(track, fraction).elevation,
      };
    });
  return track;
}

export function pointAt(
  track: TrackGeo,
  fraction: number,
): {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  elevation: number | null;
  longitude: number;
  latitude: number;
} {
  const f = ((fraction % 1) + 1) % 1,
    d = f * track.length;
  let lo = 0,
    hi = track.points.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = track.points[lo],
    b = track.points[(lo + 1) % track.points.length];
  const segment = track.cum[lo + 1] - track.cum[lo] || 1,
    u = (d - track.cum[lo]) / segment;
  const x = a[0] + (b[0] - a[0]) * u,
    z = a[1] + (b[1] - a[1]) * u;
  const ea = track.elevations[lo],
    eb = track.elevations[(lo + 1) % track.points.length];
  const elevation =
    u <= 1e-9 && validElevation(ea)
      ? ea
      : u >= 1 - 1e-9 && validElevation(eb)
        ? eb
        : validElevation(ea) && validElevation(eb)
          ? ea + (eb - ea) * u
          : null;
  const [longitude, latitude] = unprojectXZ(track, x, z);
  return {
    x,
    y: elevation === null ? 0 : elevation - track.elevationBase,
    z,
    heading: Math.atan2(b[1] - a[1], b[0] - a[0]),
    pitch:
      validElevation(ea) && validElevation(eb)
        ? Math.atan2(eb - ea, segment)
        : 0,
    elevation,
    longitude,
    latitude,
  };
}

// Illustrative apex speeds (km/h) for each corner severity in the source data (1 = slowest).
const apex: Record<number, number> = {
  1: 95,
  2: 105,
  3: 115,
  4: 175,
  5: 230,
  6: 290,
};

export type SpeedModel = {
  speeds: Float32Array;
  step: number;
  lapTime: number;
  times: Float32Array;
};

// Builds a braking/acceleration-limited speed trace, then scales it to a typical class lap time.
export function speedModel(track: TrackGeo, cls: ClassName): SpeedModel {
  const step = 10;
  const n = Math.ceil(track.length / step);
  const target = lapTargets[cls];
  const vmax = target.top / 3.6;
  const brake = 3.4 * 9.81,
    accel = 0.75 * 9.81;
  const limit = new Float32Array(n).fill(vmax);
  for (const c of track.corners) {
    const v = Math.min(vmax, (apex[c.scale] ?? 180) / 3.6);
    const i0 = Math.round((c.fraction * track.length) / step);
    for (let i = 0; i < n; i++) {
      const di = (i - i0 + n) % n; // distance after the apex
      const bi = (i0 - i + n) % n; // distance before the apex
      const after = Math.sqrt(v * v + 2 * accel * di * step);
      const before = Math.sqrt(v * v + 2 * brake * bi * step);
      limit[i] = Math.min(limit[i], after, before);
    }
  }
  let k = 1;
  for (let it = 0; it < 6; it++) {
    let time = 0;
    for (let i = 0; i < n; i++) time += step / Math.min(vmax, limit[i] * k);
    k *= time / target.lap;
  }
  const speeds = new Float32Array(n);
  const times = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    speeds[i] = Math.min(vmax, limit[i] * k);
    times[i + 1] = times[i] + step / speeds[i];
  }
  return { speeds, step, lapTime: times[n], times };
}

export function fractionAtTime(m: SpeedModel, t: number, length: number) {
  const tt = ((t % m.lapTime) + m.lapTime) % m.lapTime;
  let lo = 0,
    hi = m.times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (m.times[mid] <= tt) lo = mid;
    else hi = mid;
  }
  const u = (tt - m.times[lo]) / (m.times[lo + 1] - m.times[lo]);
  return Math.min(1, ((lo + u) * m.step) / length);
}

export type TrackLoadOptions = { context?: boolean };
type TrackSource = { features: Feature[] };

// A small outline powers cards and maps without downloading/parsing terrain.
// Both request paths share geometry, so navigating to the full circuit upgrades once.
export function createTrackLoader(
  request: typeof fetch = fetch,
  base = import.meta.env?.BASE_URL ?? "/",
) {
  let geometry: Promise<TrackSource> | null = null;
  let context: Promise<CircuitContext | undefined> | null = null;
  let outline: Promise<TrackGeo> | null = null;
  let detailed: Promise<TrackGeo> | null = null;
  const loadGeometry = () =>
    (geometry ??= request(`${base}data/sarthe.geojson`)
      .then(async (response) => {
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        return response.json() as Promise<TrackSource>;
      })
      .catch((error) => {
        geometry = null;
        throw error;
      }));
  const loadContext = () =>
    (context ??= request(`${base}data/circuit-context.json`)
      .then(async (response) => {
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        return response.json() as Promise<CircuitContext>;
      })
      .catch(() => undefined));
  return (options: TrackLoadOptions = {}): Promise<TrackGeo> => {
    if (options.context === false)
      return (outline ??= loadGeometry()
        .then((data) => buildTrack(data.features))
        .catch((error) => {
          outline = null;
          throw error;
        }));
    return (detailed ??= Promise.all([loadGeometry(), loadContext()])
      .then(([data, sourceContext]) => buildTrack(data.features, sourceContext))
      .catch((error) => {
        detailed = null;
        throw error;
      }));
  };
}
export const loadTrack = createTrackLoader();

const layerCache = new Map<
  string,
  Promise<NonNullable<CircuitContext["buildings"]>>
>();
// Only the driving study opts into parsing the complete building layer.
// The geographic map can hand these URLs directly to its own worker.
export async function loadTrackContextLayers(
  track: TrackGeo,
): Promise<TrackGeo> {
  if (track.context?.buildings) return track;
  const source = track.context?.layers?.buildings;
  if (!source) return track;
  const url = /^https?:/.test(source)
    ? source
    : `${import.meta.env.BASE_URL}${source.replace(/^\//, "")}`;
  let request = layerCache.get(url);
  if (!request) {
    request = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw Error(`Building layer HTTP ${response.status}`);
        const data = await response.json();
        if (data.type !== "FeatureCollection" || !Array.isArray(data.features))
          throw Error("Building layer is invalid");
        return data as NonNullable<CircuitContext["buildings"]>;
      })
      .catch((error) => {
        layerCache.delete(url);
        throw error;
      });
    layerCache.set(url, request);
  }
  const buildings = await request;
  return { ...track, context: { ...track.context!, buildings } };
}

export function useTrack({ context = true }: TrackLoadOptions = {}) {
  const [track, setTrack] = useState<TrackGeo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    loadTrack({ context })
      .then((t) => live && setTrack(t))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [context]);
  return { track, error };
}
