import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  buildTrack,
  pointAt,
  profileElevationAt,
  projectLngLat,
  terrainElevationAt,
  unprojectXZ,
} from "../src/data/trackGeo.ts";

const geography = JSON.parse(
  await readFile(
    new URL("../public/data/sarthe.geojson", import.meta.url),
    "utf8",
  ),
);
const base = buildTrack(geography.features);
const origin = [base.origin.longitude, base.origin.latitude];
const syntheticContext = () => ({
  schemaVersion: 1,
  origin,
  elevation: {
    source: "Synthetic interpolation fixture",
    verticalDatum: "NGF-IGN69",
    samples: [
      {
        fraction: 0,
        distance: 0,
        lng: origin[0],
        lat: origin[1],
        elevation: 50,
      },
      {
        fraction: 0.25,
        distance: base.length / 4,
        lng: origin[0],
        lat: origin[1],
        elevation: null,
      },
      {
        fraction: 0.5,
        distance: base.length / 2,
        lng: origin[0],
        lat: origin[1],
        elevation: 60,
      },
      {
        fraction: 1,
        distance: base.length,
        lng: origin[0],
        lat: origin[1],
        elevation: 50,
      },
    ],
  },
});

test("the real circuit outline round-trips through metric scene coordinates without moving its geographic position", () => {
  assert.equal(base.points.length, base.lngLat.length);
  assert.equal(base.points.length, base.elevations.length);
  assert.equal(base.cum.length, base.points.length + 1);
  for (let index = 0; index < base.points.length; index += 13) {
    const [longitude, latitude] = base.lngLat[index];
    const [x, z] = projectLngLat(base, longitude, latitude);
    assert.ok(Math.abs(x - base.points[index][0]) < 1e-7);
    assert.ok(Math.abs(z - base.points[index][1]) < 1e-7);
    const restored = unprojectXZ(base, x, z);
    assert.ok(Math.abs(restored[0] - longitude) < 1e-10);
    assert.ok(Math.abs(restored[1] - latitude) < 1e-10);
  }
  const [east] = projectLngLat(
    base,
    base.origin.longitude + 0.001,
    base.origin.latitude,
  );
  const [, north] = projectLngLat(
    base,
    base.origin.longitude,
    base.origin.latitude + 0.001,
  );
  assert.ok(east > 0, "positive scene x points east");
  assert.ok(north < 0, "positive scene z points south");
});

test("the lap stays closed and geographic interpolation agrees with its scene location", () => {
  assert.ok(base.length > 13000 && base.length < 14500);
  assert.ok(
    base.cum.every(
      (distance, index) => index === 0 || distance > base.cum[index - 1],
    ),
  );
  const start = pointAt(base, 0),
    finish = pointAt(base, 1),
    repeated = pointAt(base, 2);
  assert.deepEqual(finish, start);
  assert.deepEqual(repeated, start);
  for (const fraction of [0, 0.07, 0.25, 0.57, 0.82, 0.9999]) {
    const point = pointAt(base, fraction);
    assert.ok(
      [point.x, point.z, point.heading, point.longitude, point.latitude].every(
        Number.isFinite,
      ),
    );
    const projected = projectLngLat(base, point.longitude, point.latitude);
    assert.ok(
      Math.hypot(projected[0] - point.x, projected[1] - point.z) < 1e-6,
    );
  }
});

test("an unavailable elevation source does not turn into a measured zero-height lap", () => {
  assert.equal(base.contextStatus, "unavailable");
  assert.ok(base.elevations.every((elevation) => elevation === null));
  assert.equal(pointAt(base, 0.35).elevation, null);
  assert.equal(
    pointAt(base, 0.35).y,
    0,
    "flat fallback is only a neutral scene offset",
  );
});

test("known profile anchors remain valid, and interpolation never bridges a missing source segment", () => {
  const context = syntheticContext();
  assert.equal(profileElevationAt(context, 0), 50);
  assert.equal(profileElevationAt(context, 0.25), null);
  assert.equal(profileElevationAt(context, 0.1), null);
  assert.equal(profileElevationAt(context, 0.4), null);
  assert.equal(profileElevationAt(context, 0.5), 60);
  assert.equal(profileElevationAt(context, 0.75), 55);
  assert.equal(profileElevationAt(context, 1), 50);
});

test("explicit missing indexed heights are preserved even when a second profile could supply a value", () => {
  const context = syntheticContext();
  context.elevation.samples = [
    { ...context.elevation.samples[0], elevation: 50 },
    { ...context.elevation.samples.at(-1), elevation: 50 },
  ];
  context.elevation.trackSamples = Array(base.points.length + 1).fill(50);
  context.elevation.trackSamples[5] = null;
  const track = buildTrack(geography.features, context);
  assert.equal(track.elevations[5], null);
  assert.equal(track.elevations[6], 50);
  assert.equal(track.contextStatus, "partial");
  const middleOfMissingSegment =
    (track.cum[4] + track.cum[5]) / 2 / track.length;
  assert.equal(pointAt(track, middleOfMissingSegment).elevation, null);
  assert.equal(pointAt(track, track.cum[6] / track.length).elevation, 50);
});

test("north-to-south terrain grids interpolate ground metres and refuse missing cells or outside extrapolation", () => {
  const west = origin[0] - 0.001,
    east = origin[0] + 0.001;
  const south = origin[1] - 0.001,
    north = origin[1] + 0.001;
  const context = syntheticContext();
  context.terrainGrid = {
    bbox: [west, south, east, north],
    rows: 2,
    columns: 2,
    values: [60, 80, 40, 60],
  };
  const track = buildTrack(geography.features, context);
  const sample = (lng, lat) =>
    terrainElevationAt(track, ...projectLngLat(track, lng, lat));
  assert.ok(Math.abs(sample(origin[0], origin[1]) - 60) < 1e-8);
  assert.ok(Math.abs(sample(west, north) - 60) < 1e-8);
  assert.ok(Math.abs(sample(east, south) - 60) < 1e-8);
  assert.equal(sample(east + 0.002, origin[1]), null);
  context.terrainGrid.values[0] = null;
  assert.equal(sample(origin[0], origin[1]), null);
});

const context = JSON.parse(
  await readFile(
    new URL("../public/data/circuit-context.json", import.meta.url),
    "utf8",
  ),
);
const sourcedTrack = buildTrack(geography.features, context);
const manifest = JSON.parse(
  await readFile(
    new URL("../public/data/circuit-terrain-manifest.json", import.meta.url),
    "utf8",
  ),
);

async function geographicLayer(name) {
  const reference = context.layers?.[name];
  if (reference) {
    assert.match(reference, /^\/data\/[\w.-]+\.geojson$/);
    return JSON.parse(
      await readFile(new URL(`../public${reference}`, import.meta.url), "utf8"),
    );
  }
  return context[name];
}

test("the frozen IGN samples retain a genuine non-flat NGF-IGN69 profile and align with the mapped outline", () => {
  const elevation = context.elevation;
  assert.equal(elevation.source, "IGN RGE ALTI");
  assert.equal(elevation.resource, "ign_rge_alti_wld");
  assert.equal(elevation.verticalDatum, "NGF-IGN69");
  assert.equal(elevation.verticalCrs, "EPSG:5720");
  assert.equal(elevation.units, "m");
  assert.equal(elevation.samples.length, 801);
  assert.equal(
    elevation.trackSamples.length,
    geography.features.find((feature) => feature.properties.role === "outline")
      .geometry.coordinates.length,
  );
  assert.equal(
    elevation.trackCoordinates.length,
    elevation.trackSamples.length,
  );
  assert.equal(elevation.samples[0].fraction, 0);
  assert.equal(elevation.samples.at(-1).fraction, 1);
  assert.equal(
    elevation.samples[0].elevation,
    elevation.samples.at(-1).elevation,
  );
  assert.ok(
    elevation.samples.every(
      (sample, index) =>
        Number.isFinite(sample.elevation) &&
        (index === 0 ||
          sample.fraction > elevation.samples[index - 1].fraction),
    ),
  );
  const heights = elevation.samples.map((sample) => sample.elevation);
  assert.equal(Math.min(...heights), elevation.minimum);
  assert.equal(Math.max(...heights), elevation.maximum);
  assert.equal(elevation.missingCount, 0);
  assert.ok(
    elevation.maximum - elevation.minimum > 30 &&
      elevation.maximum - elevation.minimum < 50,
    "Sarthe's observed ground relief is retained, not flattened",
  );
  assert.ok(elevation.minimum > 40 && elevation.maximum < 90);
  assert.equal(sourcedTrack.contextStatus, "ready");
  assert.equal(sourcedTrack.elevations.length, sourcedTrack.points.length);
  for (let index = 0; index < sourcedTrack.points.length; index += 17) {
    assert.equal(sourcedTrack.elevations[index], elevation.trackSamples[index]);
    assert.deepEqual(
      sourcedTrack.lngLat[index],
      elevation.trackCoordinates[index].slice(0, 2),
    );
  }
  for (const fraction of [0, 0.12, 0.37, 0.63, 0.86, 0.99]) {
    const point = pointAt(sourcedTrack, fraction);
    assert.ok(Number.isFinite(point.elevation));
    assert.ok(
      Math.abs(point.y + sourcedTrack.elevationBase - point.elevation) < 1e-8,
      "scene height is a relative offset, not a changed source datum",
    );
  }
  assert.ok(
    typeof elevation.accuracy === "string" && elevation.accuracy.length > 10,
    "source accuracy description survives the snapshot",
  );
});

test("local raster terrain preserves its source encoding, geographic coverage and independent consistency checks", async () => {
  assert.equal(manifest.encoding, "mapbox");
  assert.equal(manifest.verticalDatum, "NGF-IGN69");
  assert.equal(manifest.sourceLayer, "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES");
  assert.equal(manifest.sourceTileMatrixSet, "WGS84G_6_14");
  assert.equal(manifest.tileCount, manifest.outputTiles.length);
  assert.ok(manifest.tileCount > 20);
  assert.ok(
    manifest.sourceSampleSpacingMetresApprox.eastWest > 3 &&
      manifest.sourceSampleSpacingMetresApprox.eastWest < 4,
  );
  assert.ok(
    manifest.sourceSampleSpacingMetresApprox.northSouth > 4 &&
      manifest.sourceSampleSpacingMetresApprox.northSouth < 5,
  );
  assert.equal(manifest.quantizationMetres, 0.1);
  assert.equal(context.terrainGrid.rowOrder, "north-to-south");
  assert.equal(context.terrainGrid.columnOrder, "west-to-east");
  assert.equal(
    context.terrainGrid.values.length,
    context.terrainGrid.rows * context.terrainGrid.columns,
  );
  assert.ok(context.terrainGrid.values.every(Number.isFinite));
  assert.ok(context.validation.pointRasterComparison.length >= 10);
  const errors = context.validation.pointRasterComparison.map((sample) => {
    assert.ok(
      Number.isFinite(sample.apiElevation) &&
        Number.isFinite(sample.tileElevation),
    );
    return Math.abs(sample.differenceMetres);
  });
  assert.ok(
    Math.max(...errors) < 1,
    "independent API checks catch a bad raster projection, byte order or vertical offset; this is not an accuracy claim",
  );
  for (const output of manifest.outputTiles) {
    const file = manifest.tiles[0]
      .replace("{z}", String(output.z))
      .replace("{x}", String(output.x))
      .replace("{y}", String(output.y));
    assert.equal(typeof file, "string");
    const bytes = await readFile(
      new URL(
        `../public${file.startsWith("/") ? file : `/${file}`}`,
        import.meta.url,
      ),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      output.sha256,
      "frozen terrain tile checksum",
    );
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      "valid PNG tile signature",
    );
  }
});

test("building volumes are backed by source polygons and reported heights, with unknown heights kept unknown", async () => {
  const layer = await geographicLayer("buildings");
  assert.equal(layer.type, "FeatureCollection");
  assert.equal(layer.features.length, context.counts.buildings);
  assert.ok(layer.features.length > 1000);
  assert.equal(
    new Set(layer.features.map((feature) => feature.properties.id)).size,
    layer.features.length,
  );
  let known = 0,
    unknown = 0;
  const [west, south, east, north] = context.bbox;
  for (const feature of layer.features) {
    const properties = feature.properties;
    assert.equal(properties.source, "IGN BD TOPO");
    assert.ok(properties.id && properties.sourceFeatureId);
    for (const key of ["horizontalAccuracyMetres", "verticalAccuracyMetres"]) {
      const accuracy = properties[key];
      assert.ok(
        accuracy === null ||
          (Number.isFinite(accuracy) && accuracy > 0 && accuracy < 100),
        "unknown source precision flags are not shown as huge measured accuracy values",
      );
    }
    if (properties.height === null) unknown++;
    else {
      known++;
      assert.ok(
        Number.isFinite(properties.height) &&
          properties.height > 0 &&
          properties.height < 100,
      );
      assert.match(properties.heightSource, /IGN BD TOPO.*hauteur/);
    }
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type));
    assert.ok(polygons.length > 0);
    const coordinates = [];
    for (const polygon of polygons) {
      assert.ok(polygon.length > 0);
      for (const ring of polygon) {
        assert.ok(ring.length >= 4);
        assert.deepEqual(ring[0].slice(0, 2), ring.at(-1).slice(0, 2));
        for (const point of ring) {
          assert.ok(Number.isFinite(point[0]) && Number.isFinite(point[1]));
          assert.ok(
            point[0] > 0 && point[0] < 1 && point[1] > 47 && point[1] < 49,
            "geographic source coordinates, not random scene units",
          );
          coordinates.push(point);
        }
      }
    }
    const xs = coordinates.map((point) => point[0]),
      ys = coordinates.map((point) => point[1]);
    assert.ok(
      Math.max(...xs) >= west - 0.00001 &&
        Math.min(...xs) <= east + 0.00001 &&
        Math.max(...ys) >= south - 0.00001 &&
        Math.min(...ys) <= north + 0.00001,
      "sourced polygon intersects the queried circuit area within a small service-envelope tolerance (0.00001 degrees)",
    );
  }
  assert.equal(known, context.counts.buildingsWithHeight);
  assert.equal(unknown, context.counts.buildingsWithoutHeight);
  assert.ok(
    unknown > 0,
    "missing source heights were not filled with invented measurements",
  );
});

test("the frozen source register keeps provider attribution and licences separate from numerical precision", async () => {
  assert.ok(Number.isFinite(Date.parse(context.fetchedAt)));
  assert.match(context.source.attribution, /IGN/);
  assert.equal(new URL(context.source.license).hostname, "www.etalab.gouv.fr");
  assert.equal(context.source.trackGeometry.license, "ODbL-1.0");
  assert.match(context.source.trackGeometry.source, /OpenStreetMap/);
  assert.match(context.source.trackGeometry.sha256, /^[0-9a-f]{64}$/);
  const sourceBytes = await readFile(
    new URL("../public/data/sarthe.geojson", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(sourceBytes).digest("hex"),
    context.source.trackGeometry.sha256,
  );
  assert.equal(
    new URL(context.source.elevationResource).hostname,
    "data.geopf.fr",
  );
  assert.equal(context.validation.syntheticElevationValues, 0);
  assert.equal(context.validation.estimatedBuildingHeights, 0);
  assert.match(
    context.elevation.limitation,
    /precision is not measurement accuracy/i,
  );
});

test("the light context keeps complete geographic layers as separate files instead of loading them on every page", async () => {
  const coreBytes = await readFile(
    new URL("../public/data/circuit-context.json", import.meta.url),
  );
  assert.ok(
    coreBytes.byteLength < 1_000_000,
    "the common elevation/core request remains below 1 MB",
  );
  assert.ok(!context.buildings && !context.roads && !context.landuse);
  for (const [name, count] of [
    ["buildings", context.counts.buildings],
    ["roads", context.counts.roads],
    ["landuse", context.counts.vegetationAreas],
  ]) {
    assert.equal(typeof context.layers[name], "string");
    const layer = await geographicLayer(name);
    assert.equal(layer.type, "FeatureCollection");
    assert.equal(layer.features.length, count);
    assert.ok(
      layer.features.every(
        (feature) => feature.properties.source === "IGN BD TOPO",
      ),
    );
  }
});
