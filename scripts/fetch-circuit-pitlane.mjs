#!/usr/bin/env node
// Keyless OSM source snapshot; retain source vertices and directed node topology.
import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const PIT_WAY_IDS = [
  258179494, 849478718, 354149765, 777192900, 777192901, 257063576,
];
const API = "https://api.openstreetmap.org/api/0.6";
const MAP_URL = `${API}/map.json?bbox=0.203,47.944,0.213,47.958`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function distanceMetres(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
    Math.cos(a[1] * rad) *
      Math.cos(b[1] * rad) *
      Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function buildPitLane(data, source) {
  const nodes = new Map(
    data.elements.filter((e) => e.type === "node").map((n) => [n.id, n]),
  );
  const ways = PIT_WAY_IDS.map((id) =>
    data.elements.find((e) => e.type === "way" && e.id === id),
  );
  const coordinates = [],
    nodeIds = [],
    segments = [];
  for (const [index, way] of ways.entries()) {
    if (
      !way ||
      way.tags.highway !== "raceway" ||
      way.tags.oneway !== "yes" ||
      !["Pit Entry", "Pit Lane", "Pit Exit"].includes(way.tags.name)
    )
      throw new Error(
        `Missing or changed directed pit way ${PIT_WAY_IDS[index]}`,
      );
    if (index && nodeIds.at(-1) !== way.nodes[0])
      throw new Error(
        `Disconnected pit ways at ${way.id}; review source changes before publishing`,
      );
    const startIndex = index ? coordinates.length - 1 : 0;
    const wayCoordinates = way.nodes.map((id) => {
      const node = nodes.get(id);
      if (!node || !Number.isFinite(node.lon) || !Number.isFinite(node.lat))
        throw new Error(`Missing coordinate for node ${id}`);
      return [node.lon, node.lat];
    });
    coordinates.push(...wayCoordinates.slice(index ? 1 : 0));
    nodeIds.push(...way.nodes.slice(index ? 1 : 0));
    segments.push({
      wayId: way.id,
      version: way.version,
      timestamp: way.timestamp,
      url: `https://www.openstreetmap.org/way/${way.id}`,
      name: way.tags.name,
      startIndex,
      endIndex: coordinates.length - 1,
      startNode: way.nodes[0],
      endNode: way.nodes.at(-1),
      tags: way.tags,
    });
  }
  const junctions = [coordinates[0], coordinates.at(-1)].map(
    (coordinate, index) => {
      const nodeId = index ? nodeIds.at(-1) : nodeIds[0];
      const joiningWays = data.elements.filter(
        (e) =>
          e.type === "way" &&
          !PIT_WAY_IDS.includes(e.id) &&
          e.tags?.highway === "raceway" &&
          e.nodes.includes(nodeId),
      );
      if (!joiningWays.length)
        throw new Error(
          `Pit endpoint ${nodeId} has no mapped main-track junction`,
        );
      return {
        coordinate,
        nodeId,
        trackWays: joiningWays.map((w) => ({
          wayId: w.id,
          name: w.tags.name ?? null,
          version: w.version,
          url: `https://www.openstreetmap.org/way/${w.id}`,
        })),
      };
    },
  );
  const lengthMetres = coordinates
    .slice(1)
    .reduce(
      (sum, point, index) => sum + distanceMetres(coordinates[index], point),
      0,
    );
  const common = {
    source: "OpenStreetMap",
    attribution: "© OpenStreetMap contributors",
    license: "ODbL 1.0",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    widthMetres: null,
    speedLimitKmh: null,
  };
  return {
    type: "FeatureCollection",
    schemaVersion: 1,
    source: {
      ...source,
      coordinateReferenceSystem: "EPSG:4326",
      geometrySha256: sha256(JSON.stringify(coordinates)),
      nodeIds,
      segments,
      junctions,
      geometryMethod:
        "Original OSM vertices concatenated in source one-way order; shared endpoints deduplicated. No smoothing, snapping or invented connector.",
      accuracy: null,
      limitations:
        "Mapped route, not a surveyed pavement boundary. OSM maxspeed tags are preserved only as source tags, not asserted as current event regulations. Widths, pit boxes and garage assignments are not supplied.",
    },
    features: [
      {
        type: "Feature",
        id: "pit-lane",
        properties: {
          ...common,
          role: "pit_lane",
          name: "Pit lane",
          url: "https://www.openstreetmap.org/way/354149765",
          direction: "entry_to_exit",
          lengthMetres: Math.round(lengthMetres * 100) / 100,
        },
        geometry: { type: "LineString", coordinates },
      },
      ...junctions.map((junction, index) => ({
        type: "Feature",
        id: index ? "pit-exit" : "pit-entry",
        properties: {
          ...common,
          role: index ? "pit_exit" : "pit_entry",
          name: index ? "Pit exit" : "Pit entry",
          url: `https://www.openstreetmap.org/node/${junction.nodeId}`,
          sourceNodeId: junction.nodeId,
        },
        geometry: { type: "Point", coordinates: junction.coordinate },
      })),
    ],
  };
}
async function main() {
  const inputIndex = process.argv.indexOf("--source");
  const buffer =
    inputIndex >= 0
      ? await readFile(process.argv[inputIndex + 1])
      : await (async () => {
          const response = await fetch(MAP_URL, {
            headers: { "User-Agent": "SartheAtlas geographic source snapshot" },
            signal: AbortSignal.timeout(45000),
          });
          if (!response.ok) throw new Error(`OSM HTTP ${response.status}`);
          return Buffer.from(await response.arrayBuffer());
        })();
  const output = buildPitLane(JSON.parse(buffer), {
    provider: "OpenStreetMap contributors",
    url: MAP_URL,
    fetchedAt: new Date().toISOString(),
    rawResponseSha256: sha256(buffer),
  });
  const filename = fileURLToPath(
    new URL("../public/data/circuit-pitlane.geojson", import.meta.url),
  );
  await writeFile(`${filename}.tmp`, JSON.stringify(output));
  await rename(`${filename}.tmp`, filename);
  console.log(
    `${output.features[0].geometry.coordinates.length} vertices; ${output.features[0].properties.lengthMetres} m; ${PIT_WAY_IDS.length} connected source ways`,
  );
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
