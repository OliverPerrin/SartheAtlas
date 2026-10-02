import { useEffect, useState } from "react";
import type { FeatureCollection, LineString, Point } from "geojson";

export type PitLaneProperties = {
  role: string;
  name?: string;
  source?: string;
  url?: string;
  lengthMetres?: number;
  [key: string]: unknown;
};
export type PitLane = {
  data: FeatureCollection<LineString | Point, PitLaneProperties> & {
    source?: {
      segments?: { name: string; startIndex: number; endIndex: number }[];
    };
  };
  coordinates: [number, number][];
  serviceCentre?: [number, number];
  lengthMetres: number;
  bounds: [number, number, number, number];
};

function distance(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
    Math.cos(a[1] * rad) *
      Math.cos(b[1] * rad) *
      Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function validPosition(position: number[]) {
  return (
    position.length >= 2 &&
    position.slice(0, 2).every(Number.isFinite) &&
    Math.abs(position[0]) <= 180 &&
    Math.abs(position[1]) <= 90
  );
}

export function readPitLane(data: PitLane["data"]): PitLane {
  const route = data.features?.find(
    (feature) =>
      feature.properties?.role === "pit_lane" &&
      feature.geometry?.type === "LineString",
  );
  if (
    !route ||
    route.geometry.type !== "LineString" ||
    route.geometry.coordinates.length < 2 ||
    !route.geometry.coordinates.every(validPosition)
  )
    throw new Error("Mapped pit lane unavailable");
  const coordinates = route.geometry.coordinates.map(
    (p) => [p[0], p[1]] as [number, number],
  );
  let lengthMetres = 0;
  for (let i = 1; i < coordinates.length; i++) {
    lengthMetres += distance(coordinates[i - 1], coordinates[i]);
  }
  const servicePaths = (data.source?.segments ?? [])
    .filter(
      (segment) =>
        segment.name === "Pit Lane" &&
        Number.isInteger(segment.startIndex) &&
        Number.isInteger(segment.endIndex) &&
        segment.startIndex >= 0 &&
        segment.endIndex < coordinates.length &&
        segment.endIndex > segment.startIndex,
    )
    .map((segment) => {
      const points = coordinates.slice(
        segment.startIndex,
        segment.endIndex + 1,
      );
      const length = points
        .slice(1)
        .reduce((sum, point, i) => sum + distance(points[i], point), 0);
      return { points, length };
    })
    .sort((a, b) => b.length - a.length);
  let serviceCentre: [number, number] | undefined;
  if (servicePaths.length) {
    const { points, length } = servicePaths[0];
    let remaining = length / 2;
    for (let i = 1; i < points.length; i++) {
      const span = distance(points[i - 1], points[i]);
      if (remaining <= span && span > 0) {
        const t = remaining / span;
        serviceCentre = [
          points[i - 1][0] + t * (points[i][0] - points[i - 1][0]),
          points[i - 1][1] + t * (points[i][1] - points[i - 1][1]),
        ];
        break;
      }
      remaining -= span;
    }
  }
  return {
    data,
    coordinates,
    lengthMetres,
    serviceCentre,
    bounds: [
      Math.min(...coordinates.map((p) => p[0])),
      Math.min(...coordinates.map((p) => p[1])),
      Math.max(...coordinates.map((p) => p[0])),
      Math.max(...coordinates.map((p) => p[1])),
    ],
  };
}

let pending: Promise<PitLane> | undefined;
export function loadPitLane() {
  pending ??= fetch(`${import.meta.env.BASE_URL}data/circuit-pitlane.geojson`)
    .then((response) => {
      if (!response.ok) throw new Error("Mapped pit lane unavailable");
      return response.json() as Promise<PitLane["data"]>;
    })
    .then(readPitLane)
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

export function usePitLane() {
  const [pitLane, setPitLane] = useState<PitLane>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    void loadPitLane()
      .then((data) => {
        if (live) setPitLane(data);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, []);
  return { pitLane, error };
}
