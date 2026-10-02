#!/usr/bin/env node
// Reproducible, keyless IGN source snapshots. No invented elevation or building heights.
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { inflateSync, deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT = join(ROOT, "public/data");
const CACHE = "/tmp/sarthe-geography-cache";
const ENDPOINT = "https://data.geopf.fr";
const DTM_LAYER = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES";
const DTM_ZOOM = 14;
const GEO_TILE_SPAN = 180 / 2 ** DTM_ZOOM;
const TILE_SIZE = 256;
const PROFILE_SEGMENTS = 800;
const EARTH_R = 6371000;
const BATCH_POINTS = 400;
const LICENSE = "https://www.etalab.gouv.fr/licence-ouverte-open-licence/";
const argv = new Set(process.argv.slice(2));
const tileZooms = [12, 13, 14, 15];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const validHeight = (n) => finite(n) && n > -500 && n < 9000;

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, JSON.stringify(value));
  await rename(temp, path);
}

async function request(url, options = {}, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent":
            "SartheAtlas geography snapshot (+https://cartes.gouv.fr)",
          ...options.headers,
        },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok)
        throw new Error(
          `HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`,
        );
      return response;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await delay(750 * 2 ** i);
    }
  }
}

async function pool(items, concurrency, callback) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await callback(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

const mercatorX = (lng, zoom) => ((lng + 180) / 360) * 2 ** zoom;
const mercatorY = (lat, zoom) => {
  const a = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(a) + 1 / Math.cos(a)) / Math.PI) / 2) * 2 ** zoom
  );
};
const lngAt = (x, zoom) => (x / 2 ** zoom) * 360 - 180;
const latAt = (y, zoom) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** zoom))) * 180) / Math.PI;

function bboxOf(points) {
  return [
    Math.min(...points.map((p) => p[0])),
    Math.min(...points.map((p) => p[1])),
    Math.max(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])),
  ];
}
function expandBbox(bbox, metres) {
  const lat = (bbox[1] + bbox[3]) / 2;
  const dy = ((metres / EARTH_R) * 180) / Math.PI;
  const dx = dy / Math.cos((lat * Math.PI) / 180);
  return [bbox[0] - dx, bbox[1] - dy, bbox[2] + dx, bbox[3] + dy];
}
function outputTileList(bbox, zoom) {
  const x0 = Math.floor(mercatorX(bbox[0], zoom) + 1e-9),
    x1 = Math.ceil(mercatorX(bbox[2], zoom) - 1e-9) - 1;
  const y0 = Math.floor(mercatorY(bbox[3], zoom) + 1e-9),
    y1 = Math.ceil(mercatorY(bbox[1], zoom) - 1e-9) - 1;
  const tiles = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) tiles.push({ z: zoom, x, y });
  return tiles;
}
function paddedCoverage(bbox) {
  const zoom = tileZooms.at(-1),
    tiles = outputTileList(bbox, zoom);
  const x0 = Math.min(...tiles.map((t) => t.x)) - 1,
    x1 = Math.max(...tiles.map((t) => t.x)) + 1;
  const y0 = Math.min(...tiles.map((t) => t.y)) - 1,
    y1 = Math.max(...tiles.map((t) => t.y)) + 1;
  return [
    lngAt(x0, zoom),
    latAt(y1 + 1, zoom),
    lngAt(x1 + 1, zoom),
    latAt(y0, zoom),
  ];
}
function tileBounds({ z, x, y }) {
  return [lngAt(x, z), latAt(y + 1, z), lngAt(x + 1, z), latAt(y, z)];
}

async function altitudes(coordinates) {
  const results = [];
  for (let i = 0; i < coordinates.length; i += BATCH_POINTS) {
    const points = coordinates.slice(i, i + BATCH_POINTS);
    // The documented public altitude service allows 5 requests/second.
    await delay(220);
    const response = await request(
      `${ENDPOINT}/altimetrie/1.0/calcul/alti/rest/elevation.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          lon: points.map((p) => p[0]).join("|"),
          lat: points.map((p) => p[1]).join("|"),
          resource: "ign_rge_alti_wld",
          delimiter: "|",
          indent: "false",
          measures: "false",
          zonly: "false",
        }),
      },
    );
    const data = await response.json();
    if (
      !Array.isArray(data.elevations) ||
      data.elevations.length !== points.length
    )
      throw new Error("IGN altitude response does not preserve input count");
    data.elevations.forEach((record, j) => {
      if (
        Math.abs(record.lon - points[j][0]) > 1e-7 ||
        Math.abs(record.lat - points[j][1]) > 1e-7
      )
        throw new Error("IGN altitude response coordinate order mismatch");
      results.push({
        elevation: validHeight(record.z) ? record.z : null,
        accuracy: record.acc ?? null,
      });
    });
    console.log(
      `IGN point elevations ${Math.min(i + points.length, coordinates.length)}/${coordinates.length}`,
    );
  }
  return results;
}

function resampleLine(raw, origin) {
  const k = Math.cos((origin[1] * Math.PI) / 180);
  const points = raw.map(([lng, lat]) => [
    ((lng - origin[0]) * Math.PI * EARTH_R * k) / 180,
    ((lat - origin[1]) * Math.PI * EARTH_R) / 180,
  ]);
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(
          points[i][0] - points[i - 1][0],
          points[i][1] - points[i - 1][1],
        ),
    );
  const length = distances.at(-1);
  let segment = 0;
  const samples = Array.from({ length: PROFILE_SEGMENTS + 1 }, (_, index) => {
    const distance = (length * index) / PROFILE_SEGMENTS;
    while (segment < raw.length - 2 && distances[segment + 1] < distance)
      segment++;
    const u =
      (distance - distances[segment]) /
      (distances[segment + 1] - distances[segment] || 1);
    return {
      fraction: index / PROFILE_SEGMENTS,
      distance: Number(distance.toFixed(3)),
      lng: raw[segment][0] + (raw[segment + 1][0] - raw[segment][0]) * u,
      lat: raw[segment][1] + (raw[segment + 1][1] - raw[segment][1]) * u,
    };
  });
  return { samples, length };
}

async function wfs(typeName, bbox) {
  const features = [];
  let expected = Infinity;
  for (let startIndex = 0; startIndex < expected; startIndex += 1000) {
    const params = new URLSearchParams({
      SERVICE: "WFS",
      REQUEST: "GetFeature",
      VERSION: "2.0.0",
      TYPENAMES: typeName,
      OUTPUTFORMAT: "application/json",
      SRSNAME: "EPSG:4326",
      BBOX: `${bbox.join(",")},urn:ogc:def:crs:OGC:1.3:CRS84`,
      COUNT: "1000",
      STARTINDEX: String(startIndex),
    });
    const data = await (await request(`${ENDPOINT}/wfs?${params}`)).json();
    if (!Array.isArray(data.features))
      throw new Error(`Invalid WFS feature response for ${typeName}`);
    if (Number.isFinite(Number(data.numberMatched)))
      expected = Number(data.numberMatched);
    features.push(...data.features);
    console.log(
      `${typeName} ${features.length}/${Number.isFinite(expected) ? expected : "unknown"}`,
    );
    if (!data.features.length || data.features.length < 1000) break;
  }
  const unique = [
    ...new Map(features.map((f) => [f.properties?.cleabs ?? f.id, f])).values(),
  ];
  if (Number.isFinite(expected) && unique.length !== expected)
    throw new Error(
      `${typeName} incomplete WFS pagination: ${unique.length}/${expected}`,
    );
  return {
    type: "FeatureCollection",
    features: unique,
    numberMatched: Number.isFinite(expected) ? expected : unique.length,
  };
}

function coordinates2d(value) {
  // At most 5.6 mm rounding displacement per coordinate; not a claim of survey accuracy.
  if (Array.isArray(value) && typeof value[0] === "number")
    return [Number(value[0].toFixed(7)), Number(value[1].toFixed(7))];
  return value.map(coordinates2d);
}
function normalizeBuildings(collection) {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => {
      const p = feature.properties;
      const height = finite(p.hauteur) && p.hauteur >= 0 ? p.hauteur : null;
      const ground = finite(p.altitude_minimale_sol)
        ? p.altitude_minimale_sol
        : null;
      return {
        type: "Feature",
        id: p.cleabs ?? feature.id,
        geometry: {
          ...feature.geometry,
          coordinates: coordinates2d(feature.geometry.coordinates),
        },
        properties: {
          id: p.cleabs ?? feature.id,
          name: p.nom ?? p.nom_du_batiment ?? null,
          type: p.nature ?? "Bâtiment",
          usage: p.usage_1 ?? null,
          height,
          heightSource:
            height === null ? null : "IGN BD TOPO attribute hauteur",
          source: "IGN BD TOPO",
          sourceFeatureId: feature.id,
          groundElevation: ground,
          groundElevationSource:
            ground === null
              ? null
              : "IGN BD TOPO altitude_minimale_sol (NGF-IGN69)",
          minimumRoofElevation: finite(p.altitude_minimale_toit)
            ? p.altitude_minimale_toit
            : null,
          maximumRoofElevation: finite(p.altitude_maximale_toit)
            ? p.altitude_maximale_toit
            : null,
          verticalAccuracyMetres:
            finite(p.precision_altimetrique) && p.precision_altimetrique < 9999
              ? p.precision_altimetrique
              : null,
          horizontalAccuracyMetres:
            finite(p.precision_planimetrique) &&
            p.precision_planimetrique < 9999
              ? p.precision_planimetrique
              : null,
          heightAcquisitionMethod: p.methode_d_acquisition_altimetrique ?? null,
          footprintAcquisitionMethod:
            p.methode_d_acquisition_planimetrique ?? null,
          sourceModifiedAt: p.date_modification ?? null,
          condition: p.etat_de_l_objet ?? null,
        },
      };
    }),
  };
}

function normalizeSurroundings(collection, sourceLayer) {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      type: "Feature",
      id: feature.properties.cleabs ?? feature.id,
      geometry: {
        ...feature.geometry,
        coordinates: coordinates2d(feature.geometry.coordinates),
      },
      properties: compactSurroundingProperties(
        feature.properties,
        feature.id,
        sourceLayer,
      ),
    })),
  };
}

function compactSurroundingProperties(p, featureId, sourceLayer) {
  const road = sourceLayer.includes("troncon_de_route");
  const result = {
    id: p.cleabs ?? p.id ?? featureId,
    type: p.nature ?? p.type ?? null,
    nature: p.nature ?? p.type ?? null,
    name:
      p.name ??
      p.cpx_toponyme_route_nommee ??
      p.nom_voie_ban_droite ??
      p.nom_voie_ban_gauche ??
      p.nom_collaboratif_droite ??
      p.nom_collaboratif_gauche ??
      null,
    source: "IGN BD TOPO",
    sourceLayer,
    sourceModifiedAt: p.date_modification ?? p.sourceModifiedAt ?? null,
    horizontalAccuracyMetres:
      finite(p.precision_planimetrique) && p.precision_planimetrique < 9999
        ? p.precision_planimetrique
        : (p.horizontalAccuracyMetres ?? null),
  };
  if (road)
    Object.assign(result, {
      importance: p.importance ?? null,
      width: finite(p.largeur_de_chaussee)
        ? p.largeur_de_chaussee
        : (p.width ?? null),
      widthSource: finite(p.largeur_de_chaussee)
        ? "IGN BD TOPO largeur_de_chaussee"
        : (p.widthSource ?? null),
      lanes: p.nombre_de_voies ?? p.lanes ?? null,
      direction: p.sens_de_circulation ?? p.direction ?? null,
      private: p.prive ?? p.private ?? null,
      condition: p.etat_de_l_objet ?? p.condition ?? null,
      groundPosition: p.position_par_rapport_au_sol ?? p.groundPosition ?? null,
    });
  return result;
}

async function publishContext(context) {
  const { buildings, roads, landuse, ...core } = context;
  core.layers = {
    buildings: "/data/circuit-buildings.geojson",
    roads: "/data/circuit-roads.geojson",
    landuse: "/data/circuit-landuse.geojson",
  };
  core.source.coordinateEncoding = {
    decimals: 7,
    maximumRoundingDisplacementMetresPerAxis: 0.0056,
    note: "Storage quantization below source accuracy; all mapped features and topology retained.",
  };
  await Promise.all([
    atomicJson(join(OUTPUT, "circuit-buildings.geojson"), buildings),
    atomicJson(join(OUTPUT, "circuit-roads.geojson"), roads),
    atomicJson(join(OUTPUT, "circuit-landuse.geojson"), landuse),
  ]);
  await atomicJson(join(OUTPUT, "circuit-context.json"), core);
}

async function compactExisting() {
  const context = JSON.parse(
    await readFile(join(OUTPUT, "circuit-context.json"), "utf8"),
  );
  for (const layer of ["buildings", "roads", "landuse"]) {
    if (!context[layer])
      context[layer] = JSON.parse(
        await readFile(join(OUTPUT, `circuit-${layer}.geojson`), "utf8"),
      );
    for (const feature of context[layer].features) {
      feature.geometry.coordinates = coordinates2d(
        feature.geometry.coordinates,
      );
      if (layer === "buildings") {
        for (const field of [
          "verticalAccuracyMetres",
          "horizontalAccuracyMetres",
        ]) {
          if (feature.properties[field] === 9999)
            feature.properties[field] = null;
        }
      } else
        feature.properties = compactSurroundingProperties(
          feature.properties,
          feature.id,
          `BDTOPO_V3:${layer === "roads" ? "troncon_de_route" : "zone_de_vegetation"}`,
        );
    }
  }
  await publishContext(context);
  console.log(
    "Split compact geographic layers without refetching or dropping mapped features",
    context.counts,
  );
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let n = i;
  for (let b = 0; b < 8; b++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  crcTable[i] = n >>> 0;
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, bytes) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([length, name, bytes, crc]);
}
function terrainPng(heights) {
  const rows = Buffer.alloc(TILE_SIZE * (1 + TILE_SIZE * 3));
  for (let y = 0; y < TILE_SIZE; y++)
    for (let x = 0; x < TILE_SIZE; x++) {
      const elevation = heights[y * TILE_SIZE + x];
      if (!validHeight(elevation))
        throw new Error(
          "Refusing to encode an invented height for a missing DEM pixel",
        );
      const value = Math.round((elevation + 10000) * 10),
        offset = y * (1 + TILE_SIZE * 3) + 1 + x * 3;
      rows[offset] = value >> 16;
      rows[offset + 1] = (value >> 8) & 255;
      rows[offset + 2] = value & 255;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(TILE_SIZE, 0);
  header.writeUInt32BE(TILE_SIZE, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function terrainSource(bbox, outputTiles, sourceZoom = DTM_ZOOM) {
  const sourceSpan = 180 / 2 ** sourceZoom;
  const expanded = outputTiles.map(tileBounds);
  const needed = [
    Math.min(bbox[0], ...expanded.map((b) => b[0])),
    Math.min(bbox[1], ...expanded.map((b) => b[1])),
    Math.max(bbox[2], ...expanded.map((b) => b[2])),
    Math.max(bbox[3], ...expanded.map((b) => b[3])),
  ];
  const x0 = Math.floor((needed[0] + 180) / sourceSpan) - 1,
    x1 = Math.floor((needed[2] + 180) / sourceSpan) + 1;
  const y0 = Math.floor((90 - needed[3]) / sourceSpan) - 1,
    y1 = Math.floor((90 - needed[1]) / sourceSpan) + 1;
  const keys = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) keys.push({ x, y });
  const sourceTiles = new Map(),
    provenance = [];
  await mkdir(CACHE, { recursive: true });
  await pool(keys, 4, async ({ x, y }, index) => {
    const params = new URLSearchParams({
      SERVICE: "WMTS",
      REQUEST: "GetTile",
      VERSION: "1.0.0",
      LAYER: DTM_LAYER,
      STYLE: "normal",
      FORMAT: "image/x-bil;bits=32",
      TILEMATRIXSET: "WGS84G_6_14",
      TILEMATRIX: String(sourceZoom),
      TILECOL: String(x),
      TILEROW: String(y),
    });
    const url = `${ENDPOINT}/wmts?${params}`,
      cached = join(CACHE, `rge-alti-${sourceZoom}-${x}-${y}.bil`);
    let bytes,
      usedCache = false;
    try {
      if (argv.has("--refresh")) throw new Error("Refresh requested");
      bytes = await readFile(cached);
      usedCache = true;
    } catch {
      bytes = Buffer.from(await (await request(url)).arrayBuffer());
      await writeFile(cached, bytes);
    }
    // IGN serves internally zlib-compressed BIL despite the float32 MIME type.
    const raw =
      bytes.length === TILE_SIZE ** 2 * 4 ? bytes : inflateSync(bytes);
    if (raw.length !== TILE_SIZE ** 2 * 4)
      throw new Error(`Unexpected BIL size ${raw.length} at ${x},${y}`);
    const values = new Float32Array(TILE_SIZE ** 2);
    for (let i = 0; i < values.length; i++) values[i] = raw.readFloatLE(i * 4);
    // Some coarse source-padding tiles contain provider no-data/artifacts outside
    // the sampled output. Preserve them in cache; refuse to SAMPLE any bad cell.
    const invalidPixelCount = [...values].filter((n) => !validHeight(n)).length;
    sourceTiles.set(`${x}/${y}`, values);
    provenance.push({
      z: sourceZoom,
      x,
      y,
      url,
      sha256: hash(bytes),
      byteLength: bytes.length,
      decodedByteLength: raw.length,
      invalidPixelCount,
      retrievedAt: (await stat(cached)).mtime.toISOString(),
      usedCache,
    });
    if (index % 10 === 0)
      console.log(
        `IGN source terrain level ${sourceZoom} tiles ${index + 1}/${keys.length}`,
      );
  });
  function pixelAt(gx, gy) {
    const tx = Math.floor(gx / TILE_SIZE),
      ty = Math.floor(gy / TILE_SIZE);
    const tile = sourceTiles.get(`${tx}/${ty}`);
    if (!tile) throw new Error(`Missing source terrain tile ${tx}/${ty}`);
    return tile[(gy - ty * TILE_SIZE) * TILE_SIZE + gx - tx * TILE_SIZE];
  }
  function sample(lng, lat) {
    const gx = ((lng + 180) / sourceSpan) * TILE_SIZE - 0.5,
      gy = ((90 - lat) / sourceSpan) * TILE_SIZE - 0.5;
    const x = Math.floor(gx),
      y = Math.floor(gy),
      u = gx - x,
      v = gy - y;
    const a = pixelAt(x, y),
      b = pixelAt(x + 1, y),
      c = pixelAt(x, y + 1),
      d = pixelAt(x + 1, y + 1);
    if (![a, b, c, d].every(validHeight))
      throw new Error(
        `Refusing to sample invalid/no-data source cells at ${lng},${lat}`,
      );
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  return { sample, provenance, sourceBounds: needed };
}

async function addCoarseTerrainLevels() {
  const contextPath = join(OUTPUT, "circuit-context.json"),
    manifestPath = join(OUTPUT, "circuit-terrain-manifest.json");
  const context = JSON.parse(await readFile(contextPath, "utf8")),
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const newInputs = [],
    newOutputs = [];
  const sourceZoomByOutputZoom = {
    9: 9,
    10: 10,
    11: 11,
    12: 14,
    13: 14,
    14: 14,
    15: 14,
  };
  const overviewValidation = [];
  for (const zoom of [9, 10, 11]) {
    const tiles = outputTileList(context.terrain.bounds, zoom);
    // Coarse official pyramid levels avoid requesting high-resolution data over huge parent tiles.
    const terrain = await terrainSource(
      context.bbox,
      tiles,
      sourceZoomByOutputZoom[zoom],
    );
    const rendered = await renderTiles(terrain, tiles);
    newInputs.push(...terrain.provenance);
    newOutputs.push(
      ...rendered.outputProvenance.map((tile) => ({
        ...tile,
        sourceZoom: sourceZoomByOutputZoom[zoom],
      })),
    );
    overviewValidation.push({
      outputZoom: zoom,
      sourceZoom: sourceZoomByOutputZoom[zoom],
      tileCount: tiles.length,
      trackOriginElevation: Number(
        terrain.sample(...context.origin).toFixed(3),
      ),
    });
  }
  manifest.inputTiles = [
    ...new Map(
      [...manifest.inputTiles, ...newInputs].map((t) => [
        `${t.z}/${t.x}/${t.y}`,
        t,
      ]),
    ).values(),
  ];
  manifest.outputTiles = [
    ...new Map(
      [
        ...manifest.outputTiles.map((t) => ({
          ...t,
          sourceZoom: t.sourceZoom ?? 14,
        })),
        ...newOutputs,
      ].map((t) => [`${t.z}/${t.x}/${t.y}`, t]),
    ).values(),
  ];
  const lat = (context.bbox[1] + context.bbox[3]) / 2;
  const samplingByOutputZoom = Object.fromEntries(
    Object.entries(sourceZoomByOutputZoom).map(([z, sourceZoom]) => {
      const degrees = 180 / 2 ** sourceZoom / TILE_SIZE;
      return [
        z,
        {
          sourceZoom,
          angularPixelSizeDegrees: degrees,
          sourceSpacingMetresApprox: {
            eastWest:
              ((degrees * Math.PI) / 180) *
              EARTH_R *
              Math.cos((lat * Math.PI) / 180),
            northSouth: ((degrees * Math.PI) / 180) * EARTH_R,
          },
        },
      ];
    }),
  );
  Object.assign(context.terrain, {
    minzoom: 9,
    tileCount: manifest.outputTiles.length,
    byteLength: manifest.outputTiles.reduce((s, t) => s + t.byteLength, 0),
    minimum: Math.min(...manifest.outputTiles.map((t) => t.minimum)),
    maximum: Math.max(...manifest.outputTiles.map((t) => t.maximum)),
    sourceZoomByOutputZoom,
    samplingByOutputZoom,
    overviewValidation,
  });
  Object.assign(manifest, context.terrain);
  await atomicJson(manifestPath, manifest);
  await atomicJson(contextPath, context);
  console.log("Added official overview terrain pyramid levels", {
    tiles: context.terrain.tileCount,
    minzoom: context.terrain.minzoom,
    bytes: context.terrain.byteLength,
    overviewValidation,
  });
}

async function renderTiles(terrain, outputTiles) {
  let totalBytes = 0,
    terrainMin = Infinity,
    terrainMax = -Infinity;
  const outputProvenance = [];
  for (const tile of outputTiles) {
    const heights = new Float64Array(TILE_SIZE ** 2);
    let tileMin = Infinity,
      tileMax = -Infinity;
    for (let y = 0; y < TILE_SIZE; y++)
      for (let x = 0; x < TILE_SIZE; x++) {
        const lng = lngAt(tile.x + (x + 0.5) / TILE_SIZE, tile.z),
          lat = latAt(tile.y + (y + 0.5) / TILE_SIZE, tile.z);
        const h = terrain.sample(lng, lat);
        heights[y * TILE_SIZE + x] = h;
        terrainMin = Math.min(terrainMin, h);
        terrainMax = Math.max(terrainMax, h);
        tileMin = Math.min(tileMin, h);
        tileMax = Math.max(tileMax, h);
      }
    const png = terrainPng(heights),
      target = join(
        OUTPUT,
        "terrain",
        String(tile.z),
        String(tile.x),
        `${tile.y}.png`,
      );
    await mkdir(dirname(target), { recursive: true });
    await writeFile(`${target}.tmp`, png);
    await rename(`${target}.tmp`, target);
    totalBytes += png.length;
    outputProvenance.push({
      ...tile,
      byteLength: png.length,
      sha256: hash(png),
      minimum: tileMin,
      maximum: tileMax,
    });
  }
  return { totalBytes, terrainMin, terrainMax, outputProvenance };
}

async function extendExistingTerrain() {
  const path = join(OUTPUT, "circuit-context.json"),
    context = JSON.parse(await readFile(path, "utf8"));
  const bounds = paddedCoverage(context.bbox),
    outputTiles = tileZooms.flatMap((zoom) => outputTileList(bounds, zoom));
  const terrain = await terrainSource(context.bbox, outputTiles);
  const rendered = await renderTiles(terrain, outputTiles);
  const preparedAt = new Date().toISOString();
  Object.assign(context.terrain, {
    bounds,
    preparedAt,
    tileCount: outputTiles.length,
    byteLength: rendered.totalBytes,
    minimum: rendered.terrainMin,
    maximum: rendered.terrainMax,
    rangeScope:
      "All encoded output tiles, including lower-zoom tile overhang outside published high-resolution bounds",
    coverageMinimum: Math.min(
      ...rendered.outputProvenance
        .filter((t) => t.z === tileZooms.at(-1))
        .map((t) => t.minimum),
    ),
    coverageMaximum: Math.max(
      ...rendered.outputProvenance
        .filter((t) => t.z === tileZooms.at(-1))
        .map((t) => t.maximum),
    ),
    coverage:
      "Full vector context plus one max-zoom tile padding; published bounds are actual tile edges",
    outsideCoverage: "unavailable, not measured zero elevation",
  });
  const validation = context.elevation.trackCoordinates
    .filter((_, i) => i % 100 === 0)
    .map((p, i) => {
      const index = i * 100,
        apiElevation = context.elevation.trackSamples[index],
        tileElevation = terrain.sample(p[0], p[1]);
      return {
        index,
        lng: p[0],
        lat: p[1],
        apiElevation,
        tileElevation: Number(tileElevation.toFixed(3)),
        differenceMetres:
          apiElevation === null
            ? null
            : Number((tileElevation - apiElevation).toFixed(3)),
      };
    });
  context.validation.pointRasterComparison = validation;
  context.validation.maximumPointRasterDifferenceMetres = Math.max(
    ...validation.map((v) => Math.abs(v.differenceMetres ?? 0)),
  );
  if (context.validation.maximumPointRasterDifferenceMetres > 8)
    throw new Error("Expanded terrain failed point-service cross-check");
  await atomicJson(join(OUTPUT, "circuit-terrain-manifest.json"), {
    schemaVersion: 1,
    fetchedAt: context.fetchedAt,
    ...context.terrain,
    inputTiles: terrain.provenance,
    outputTiles: rendered.outputProvenance,
    validation,
  });
  await atomicJson(path, context);
  console.log("Expanded full-context DEM", {
    bounds,
    tiles: outputTiles.length,
    bytes: rendered.totalBytes,
    sourceTiles: terrain.provenance.length,
    maxPointDifference: context.validation.maximumPointRasterDifferenceMetres,
  });
}

async function main() {
  const rawBytes = await readFile(join(OUTPUT, "sarthe.geojson")),
    geo = JSON.parse(rawBytes);
  const raw = geo.features.find((f) => f.properties.role === "outline").geometry
    .coordinates;
  if (Math.hypot(raw[0][0] - raw.at(-1)[0], raw[0][1] - raw.at(-1)[1]) > 1e-8)
    throw new Error("The source circuit outline is not closed");
  const origin = [
    raw.reduce((s, p) => s + p[0], 0) / raw.length,
    raw.reduce((s, p) => s + p[1], 0) / raw.length,
  ];
  const trackBounds = bboxOf(raw),
    contextBounds = expandBbox(trackBounds, 1400),
    terrainBounds = paddedCoverage(contextBounds);
  const { samples, length } = resampleLine(raw, origin);
  const fetchedAt = new Date().toISOString();
  const altitudeCoordinates = [...raw, ...samples.map((p) => [p.lng, p.lat])];
  console.log("Fetching geographic circuit context", {
    trackPoints: raw.length,
    profilePoints: samples.length,
    contextBounds,
  });

  // Independent, public datasets. Altitude requests are sequential/rate-limited internally.
  const [elevationValues, buildingsRaw, roadsRaw, vegetationRaw] =
    await Promise.all([
      altitudes(altitudeCoordinates),
      wfs("BDTOPO_V3:batiment", contextBounds),
      wfs("BDTOPO_V3:troncon_de_route", contextBounds),
      wfs("BDTOPO_V3:zone_de_vegetation", contextBounds),
    ]);
  const trackValues = elevationValues.slice(0, raw.length);
  const profile = samples.map((sample, i) => ({
    ...sample,
    ...elevationValues[raw.length + i],
  }));
  const valid = profile.map((s) => s.elevation).filter(finite);
  const buildings = normalizeBuildings(buildingsRaw);
  const roads = normalizeSurroundings(roadsRaw, "BDTOPO_V3:troncon_de_route");
  const landuse = normalizeSurroundings(
    vegetationRaw,
    "BDTOPO_V3:zone_de_vegetation",
  );
  const outputTiles = tileZooms.flatMap((zoom) =>
    outputTileList(terrainBounds, zoom),
  );
  const terrain = await terrainSource(contextBounds, outputTiles);
  console.log(
    `Reprojecting ${terrain.provenance.length} geodetic DTM source tiles into ${outputTiles.length} Web Mercator Terrain-RGB tiles`,
  );
  const { totalBytes, terrainMin, terrainMax, outputProvenance } =
    await renderTiles(terrain, outputTiles);
  const latMid = (contextBounds[1] + contextBounds[3]) / 2;
  const widthMetres =
    (((contextBounds[2] - contextBounds[0]) * Math.PI) / 180) *
    EARTH_R *
    Math.cos((latMid * Math.PI) / 180);
  const heightMetres =
    (((contextBounds[3] - contextBounds[1]) * Math.PI) / 180) * EARTH_R;
  const columns = Math.ceil(widthMetres / 50) + 1,
    rows = Math.ceil(heightMetres / 50) + 1;
  const grid = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++)
      grid.push(
        Number(
          terrain
            .sample(
              contextBounds[0] +
                ((contextBounds[2] - contextBounds[0]) * x) / (columns - 1),
              contextBounds[3] -
                ((contextBounds[3] - contextBounds[1]) * y) / (rows - 1),
            )
            .toFixed(2),
        ),
      );

  const validation = raw
    .filter((_, i) => i % 100 === 0)
    .map((p, i) => {
      const index = i * 100,
        apiElevation = trackValues[index].elevation,
        tileElevation = terrain.sample(p[0], p[1]);
      return {
        index,
        lng: p[0],
        lat: p[1],
        apiElevation,
        tileElevation: Number(tileElevation.toFixed(3)),
        differenceMetres:
          apiElevation === null
            ? null
            : Number((tileElevation - apiElevation).toFixed(3)),
      };
    });
  const maxDifference = Math.max(
    ...validation.map((v) => Math.abs(v.differenceMetres ?? 0)),
  );
  if (maxDifference > 8)
    throw new Error(
      `Terrain/point cross-check differs by ${maxDifference}m; possible reprojection/byte-order fault`,
    );
  const source = {
    organization:
      "Institut national de l'information géographique et forestière (IGN)",
    attribution:
      "© IGN — RGE ALTI, BD TOPO; Licence Ouverte / Open Licence 2.0",
    license: LICENSE,
    elevationDocumentation:
      "https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/",
    elevationResource: `${ENDPOINT}/altimetrie/resources/ign_rge_alti_wld`,
    wmtsCapabilities: `${ENDPOINT}/wmts?SERVICE=WMTS&REQUEST=GetCapabilities&VERSION=1.0.0`,
    wfsCapabilities: `${ENDPOINT}/wfs?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0`,
    productDocumentation: "https://geoservices.ign.fr/rgealti",
    verticalDatumDocumentation:
      "https://geoservices.ign.fr/sites/default/files/2021-07/DC_RGEALTI_2-0.pdf",
    trackGeometry: {
      file: "/data/sarthe.geojson",
      sha256: hash(rawBytes),
      source: "OpenStreetMap via tobi/track-atlas",
      license: "ODbL-1.0",
    },
  };
  const context = {
    schemaVersion: 1,
    fetchedAt,
    bbox: contextBounds,
    origin,
    source,
    elevation: {
      source: "IGN RGE ALTI",
      resource: "ign_rge_alti_wld",
      units: "m",
      verticalDatum: "NGF-IGN69",
      verticalCrs: "EPSG:5720",
      horizontalCrs: "EPSG:4326",
      accuracy: "Variable suivant la source de mesure",
      returnedDecimalPlaces: 2,
      limitation:
        "Bare-earth terrain model sampled along a mapped outline; not a surveyed pavement profile, road banking, kerb or bridge-deck model. Decimal precision is not measurement accuracy.",
      sampleSpacingMetres: length / PROFILE_SEGMENTS,
      outlineLengthMetres: length,
      trackSamples: trackValues.map((s) => s.elevation),
      trackCoordinates: raw,
      trackSampleAccuracy: trackValues.map((s) => s.accuracy),
      samples: profile,
      minimum: Math.min(...valid),
      maximum: Math.max(...valid),
      missingCount: profile.length - valid.length,
    },
    terrainGrid: {
      bbox: contextBounds,
      columns,
      rows,
      values: grid,
      rowOrder: "north-to-south",
      columnOrder: "west-to-east",
      source: "IGN RGE ALTI WMTS DTM",
      units: "m",
      verticalDatum: "NGF-IGN69",
      sampleSpacingMetres: {
        eastWest: widthMetres / (columns - 1),
        northSouth: heightMetres / (rows - 1),
      },
      interpolation:
        "Bilinear resampling of geodetic float32 source pixel centres; no artificial height fill",
    },
    terrain: {
      tiles: ["/data/terrain/{z}/{x}/{y}.png"],
      encoding: "mapbox",
      tileSize: TILE_SIZE,
      minzoom: tileZooms[0],
      maxzoom: tileZooms.at(-1),
      bounds: terrainBounds,
      sourceLayer: DTM_LAYER,
      sourceTileMatrixSet: "WGS84G_6_14",
      sourceZoom: DTM_ZOOM,
      nativeAngularPixelSizeDegrees: GEO_TILE_SPAN / TILE_SIZE,
      sourceSampleSpacingMetresApprox: {
        eastWest:
          (((GEO_TILE_SPAN / TILE_SIZE) * Math.PI) / 180) *
          EARTH_R *
          Math.cos((latMid * Math.PI) / 180),
        northSouth: (((GEO_TILE_SPAN / TILE_SIZE) * Math.PI) / 180) * EARTH_R,
      },
      quantizationMetres: 0.1,
      maximumEncodingErrorMetres: 0.05,
      verticalDatum: "NGF-IGN69",
      reprojection:
        "IGNF:WGS84G to EPSG:3857 XYZ, inverse pixel-centre mapping with bilinear interpolation",
      tileCount: outputTiles.length,
      byteLength: totalBytes,
      minimum: terrainMin,
      maximum: terrainMax,
      rangeScope:
        "All encoded output tiles, including lower-zoom tile overhang outside published high-resolution bounds",
      coverageMinimum: Math.min(
        ...outputProvenance
          .filter((t) => t.z === tileZooms.at(-1))
          .map((t) => t.minimum),
      ),
      coverageMaximum: Math.max(
        ...outputProvenance
          .filter((t) => t.z === tileZooms.at(-1))
          .map((t) => t.maximum),
      ),
      coverage:
        "Full vector context plus one max-zoom tile padding; published bounds are actual tile edges",
      outsideCoverage: "unavailable, not measured zero elevation",
      source,
      manifest: "/data/circuit-terrain-manifest.json",
    },
    buildings,
    roads,
    landuse,
    counts: {
      buildings: buildings.features.length,
      buildingsWithHeight: buildings.features.filter(
        (f) => f.properties.height !== null,
      ).length,
      buildingsWithoutHeight: buildings.features.filter(
        (f) => f.properties.height === null,
      ).length,
      roads: roads.features.length,
      vegetationAreas: landuse.features.length,
    },
    validation: {
      pointRasterComparison: validation,
      maximumPointRasterDifferenceMetres: maxDifference,
      geometryCoordinatesAreGeolocated: true,
      syntheticElevationValues: 0,
      estimatedBuildingHeights: 0,
    },
  };
  await atomicJson(join(OUTPUT, "circuit-terrain-manifest.json"), {
    schemaVersion: 1,
    fetchedAt,
    ...context.terrain,
    inputTiles: terrain.provenance,
    outputTiles: outputProvenance,
    validation,
  });
  await publishContext(context);
  await addCoarseTerrainLevels();
  console.log("Completed IGN circuit context", {
    ...context.counts,
    profileRange: [context.elevation.minimum, context.elevation.maximum],
    terrainTiles: outputTiles.length,
    terrainBytes: totalBytes,
    grid: [columns, rows],
    maxPointRasterDifference: maxDifference,
  });
}

if (argv.has("--help"))
  console.log(
    "node scripts/fetch-circuit-context.mjs\nFetches public IGN RGE ALTI elevation/DTM and BD TOPO buildings, roads, vegetation; outputs frozen geolocated data and local Terrain-RGB tiles. No keys or paid services.\n--compact-existing: split a previous context without refetching.\n--extend-existing-terrain: re-render full-context terrain using cached BIL tiles.\n--refresh: re-fetch source BIL tiles instead of reusing the local cache.",
  );
else if (argv.has("--compact-existing")) await compactExisting();
else if (argv.has("--add-coarse-terrain")) await addCoarseTerrainLevels();
else if (argv.has("--extend-existing-terrain")) {
  await extendExistingTerrain();
  await addCoarseTerrainLevels();
} else await main();
