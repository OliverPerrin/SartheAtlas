#!/usr/bin/env node
// Separate official surface/bridge evidence. Does not modify the bare-earth profile.
import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const dataDir = fileURLToPath(new URL("../public/data/", import.meta.url));
const context = JSON.parse(
  await readFile(`${dataDir}circuit-context.json`, "utf8"),
);
const sourceLayer = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS";
const zoom = 17,
  span = 180 / 2 ** zoom,
  cell = span / 256;
const positions = [
  { label: "Tertre Rouge crossing", coordinate: [0.223473, 47.961063] },
  { label: "Porsche curves crossing", coordinate: [0.2108, 47.935835] },
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const valid = (h) => Number.isFinite(h) && h > -500 && h < 9000;
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
function insideRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = point,
      [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function insideGeometry(point, geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (rings) =>
      insideRing(point, rings[0]) &&
      !rings.slice(1).some((ring) => insideRing(point, ring)),
  );
}
const tiles = new Map(),
  bridgeFeatures = new Map(),
  samples = [];
const k = Math.cos((context.origin[1] * Math.PI) / 180),
  metresPerDegree = (Math.PI * 6371000) / 180;
for (const location of positions) {
  let index = 0,
    best = Infinity;
  context.elevation.trackCoordinates.forEach((p, i) => {
    const distance = Math.hypot(
      (p[0] - location.coordinate[0]) * k * metresPerDegree,
      (p[1] - location.coordinate[1]) * metresPerDegree,
    );
    if (distance < best) {
      best = distance;
      index = i;
    }
  });
  if (best > 20)
    throw new Error(
      "The source circuit no longer matches the investigated crossing",
    );
  const padLat = 150 / metresPerDegree,
    padLng = padLat / k;
  const bbox = [
    location.coordinate[0] - padLng,
    location.coordinate[1] - padLat,
    location.coordinate[0] + padLng,
    location.coordinate[1] + padLat,
  ];
  const query = new URLSearchParams({
    SERVICE: "WFS",
    REQUEST: "GetFeature",
    VERSION: "2.0.0",
    TYPENAMES: "BDTOPO_V3:construction_surfacique",
    OUTPUTFORMAT: "application/json",
    SRSNAME: "EPSG:4326",
    BBOX: `${bbox.join(",")},urn:ogc:def:crs:OGC:1.3:CRS84`,
    COUNT: "1000",
  });
  const url = `https://data.geopf.fr/wfs?${query}`;
  const response = await (await get(url)).json();
  const selected = response.features.filter(
    (f) =>
      f.properties.nature === "Pont" &&
      insideGeometry(location.coordinate, f.geometry),
  );
  if (!selected.length)
    throw new Error(`No published bridge footprint contains ${location.label}`);
  for (const feature of selected) {
    const elevations = [],
      positions2d = (value) => {
        if (typeof value[0] === "number") {
          elevations.push(valid(value[2]) ? value[2] : null);
          return [Number(value[0].toFixed(7)), Number(value[1].toFixed(7))];
        }
        return value.map(positions2d);
      };
    const geometry = {
      ...feature.geometry,
      coordinates: positions2d(feature.geometry.coordinates),
    };
    const finiteHeights = elevations.filter((h) => h !== null),
      p = feature.properties;
    bridgeFeatures.set(p.cleabs, {
      type: "Feature",
      id: p.cleabs,
      geometry,
      properties: {
        id: p.cleabs,
        name: p.toponyme ?? null,
        locationLabel: location.label,
        type: "Pont",
        source: "IGN BD TOPO construction_surfacique",
        sourceUrl: url,
        condition: p.etat_de_l_objet,
        sourceModifiedAt: p.date_modification,
        horizontalAccuracyMetres:
          p.precision_planimetrique < 9999 ? p.precision_planimetrique : null,
        verticalAccuracyMetres:
          p.precision_altimetrique < 9999 ? p.precision_altimetrique : null,
        acquisitionMethod: p.methode_d_acquisition_altimetrique,
        reportedVertexElevations: elevations,
        minimumReportedVertexElevation: finiteHeights.length
          ? Math.min(...finiteHeights)
          : null,
        maximumReportedVertexElevation: finiteHeights.length
          ? Math.max(...finiteHeights)
          : null,
        deckElevation: null,
        deckElevationSource: null,
        limitation:
          "No dedicated surveyed pavement/deck-height attribute. Boundary Z may mix lower road and bridge values; do not substitute a polygon maximum for a road survey.",
      },
    });
  }
  for (let i = index - 2; i <= index + 2; i++) {
    const [lng, lat] = context.elevation.trackCoordinates[i],
      x = Math.floor((lng + 180) / span),
      y = Math.floor((90 - lat) / span),
      key = `${x}/${y}`;
    if (!tiles.has(key)) {
      const params = new URLSearchParams({
        SERVICE: "WMTS",
        REQUEST: "GetTile",
        VERSION: "1.0.0",
        LAYER: sourceLayer,
        STYLE: "normal",
        FORMAT: "image/x-bil;bits=32",
        TILEMATRIXSET: "WGS84G_4_17",
        TILEMATRIX: String(zoom),
        TILECOL: String(x),
        TILEROW: String(y),
      });
      const sourceUrl = `https://data.geopf.fr/wmts?${params}`,
        bytes = Buffer.from(await (await get(sourceUrl)).arrayBuffer());
      const raw = bytes.length === 262144 ? bytes : inflateSync(bytes);
      if (raw.length !== 262144)
        throw new Error("Unexpected official MNS tile format");
      tiles.set(key, {
        raw,
        z: zoom,
        x,
        y,
        sourceUrl,
        sha256: sha256(bytes),
        decodedSha256: sha256(raw),
        byteLength: bytes.length,
      });
    }
    const tile = tiles.get(key),
      pixelX = Math.round((lng - (-180 + x * span)) / cell - 0.5),
      pixelY = Math.round((90 - y * span - lat) / cell - 0.5);
    const value = tile.raw.readFloatLE((pixelY * 256 + pixelX) * 4);
    const pixelLng = -180 + x * span + (pixelX + 0.5) * cell,
      pixelLat = 90 - y * span - (pixelY + 0.5) * cell;
    samples.push({
      trackIndex: i,
      lng,
      lat,
      groundElevation: context.elevation.trackSamples[i],
      surfaceElevation: valid(value) ? value : null,
      source: "IGN RGE ALTI MNS WMTS",
      sourceTile: { z: zoom, x, y },
      sourcePixel: { x: pixelX, y: pixelY, lng: pixelLng, lat: pixelLat },
      sampling: "Nearest published float32 pixel centre, no invented fill",
      pixelOffsetMetres: Math.hypot(
        (pixelLng - lng) * k * metresPerDegree,
        (pixelLat - lat) * metresPerDegree,
      ),
      insideBridgeIds: selected
        .filter((f) => insideGeometry([lng, lat], f.geometry))
        .map((f) => f.properties.cleabs),
    });
  }
}
const artifact = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  source: {
    sourceLayer,
    sourceTileMatrixSet: "WGS84G_4_17",
    sourceZoom: zoom,
    units: "m",
    verticalDatum: "NGF-IGN69",
    horizontalCrs: "EPSG:4326",
    nativeAngularPixelSizeDegrees: cell,
    sourceSampleSpacingMetresApprox: {
      eastWest: cell * metresPerDegree * k,
      northSouth: cell * metresPerDegree,
    },
    license: context.source.license,
    attribution:
      "© IGN — RGE ALTI MNS, BD TOPO; Licence Ouverte / Open Licence 2.0",
    limitation:
      "Surface model includes object/vegetation heights, not surveyed pavement or banking. Samples are separate evidence; original ground profile is unchanged.",
  },
  bridges: {
    type: "FeatureCollection",
    features: [...bridgeFeatures.values()],
  },
  surfaceSamples: samples,
  sourceTiles: [...tiles.values()].map((tile) => ({
    z: tile.z,
    x: tile.x,
    y: tile.y,
    sourceUrl: tile.sourceUrl,
    sha256: tile.sha256,
    decodedSha256: tile.decodedSha256,
    byteLength: tile.byteLength,
  })),
  groundProfileChanged: false,
  unavailableAlternatives: {
    lidarHdMultiPointApi: "HTTP 500",
    lidarHdAltimetrieApi:
      "Returned -99999 (coverage unavailable); no LiDAR HD heights used",
  },
};
const path = `${dataDir}circuit-bridge-evidence.json`;
await writeFile(`${path}.tmp`, JSON.stringify(artifact));
await rename(`${path}.tmp`, path);
context.elevation.bridgeEvidence = "/data/circuit-bridge-evidence.json";
await writeFile(`${dataDir}circuit-context.json.tmp`, JSON.stringify(context));
await rename(
  `${dataDir}circuit-context.json.tmp`,
  `${dataDir}circuit-context.json`,
);
console.log("Published separate, measured surface evidence", {
  bridges: artifact.bridges.features.length,
  surfaceSamples: samples.length,
  insideBridgeSamples: samples
    .filter((s) => s.insideBridgeIds.length)
    .map((s) => ({
      index: s.trackIndex,
      surface: s.surfaceElevation,
      ground: s.groundElevation,
    })),
  bytes: JSON.stringify(artifact).length,
});
