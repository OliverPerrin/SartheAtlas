import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Map as GeoMap, GeoJSONSource, Marker } from "maplibre-gl";
import type {
  FeatureCollection,
  LineString,
  Polygon,
  MultiPolygon,
} from "geojson";
import {
  Building2,
  Layers,
  Map as MapIcon,
  Mountain,
  Navigation,
  RotateCcw,
  Flag,
  X,
} from "lucide-react";
import { classOrder } from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { lapTargets, sections } from "../data/track.ts";
import { fractionAtTime, pointAt, speedModel } from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { usePitLane } from "../data/pitLane.ts";
import type { CamMode, ColorMode, Tick } from "../three/TrackScene.tsx";
import { namedCorners } from "./TrackMap.tsx";
import "maplibre-gl/dist/maplibre-gl.css";
import "./CircuitGeoMap.css";

maplibregl.setWorkerUrl(mapWorkerUrl);

type GeoBuilding = {
  id?: string;
  name?: string;
  nature?: string;
  height?: number | null;
  heightSource?: string;
  [key: string]: unknown;
};
type CircuitContext = {
  buildings?: FeatureCollection<Polygon | MultiPolygon, GeoBuilding>;
  terrain?: {
    tiles?: string[];
    encoding?: "mapbox" | "terrarium";
    tileSize?: number;
    minzoom?: number;
    maxzoom?: number;
    bounds?: [number, number, number, number];
  };
  layers?: { buildings?: string; roads?: string; landuse?: string };
  counts?: { buildings?: number };
  sources?: unknown;
};
type Props = {
  track: TrackGeo;
  playing: boolean;
  timeScale: number;
  follow: ClassName;
  visible: Record<ClassName, boolean>;
  mode: ColorMode;
  cam: CamMode;
  night: boolean;
  cameraReset: number;
  activeCorner: string | null;
  focusFraction?: number | null;
  onCorner: (name: string) => void;
  onOverview: () => void;
  onMapFocus: () => void;
  pitFocused: boolean;
  onPitLaneClose: () => void;
  onTick: (tick: Tick) => void;
};

const imageryTile = (layer: string) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}`;
const PHOTO = imageryTile("HR.ORTHOIMAGERY.ORTHOPHOTOS");
const PLAN =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function geoAt(track: TrackGeo, fraction: number): [number, number] {
  const p = pointAt(track, fraction);
  return [p.longitude, p.latitude];
}
function minimizeAttribution(m: GeoMap) {
  m.getContainer()
    .querySelector<HTMLElement>(
      ".maplibregl-ctrl-attrib.maplibregl-compact-show > summary",
    )
    ?.click();
}
function courseColour(kmh: number) {
  const t = Math.max(0, Math.min(1, (kmh - 80) / 250));
  const a = t < 0.5 ? [247, 63, 70] : [250, 201, 61];
  const b = t < 0.5 ? [250, 201, 61] : [56, 204, 234];
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
}

export default function CircuitGeoMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GeoMap | null>(null);
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terrainReady, setTerrainReady] = useState(false);
  const [contextFailed, setContextFailed] = useState(false);
  const context = props.track.context as CircuitContext | undefined;
  const buildingsCount =
    context?.counts?.buildings ?? context?.buildings?.features.length ?? 0;
  const buildingsRequested = useRef(false);
  const [photography, setPhotography] = useState(true);
  const [tilted, setTilted] = useState(true);
  const [buildingsVisible, setBuildingsVisible] = useState(false);
  const [exaggeration, setExaggeration] = useState(1);
  const { pitLane, error: pitLaneFailed } = usePitLane();
  const pitFocused = props.pitFocused;
  const pitInspection = useRef(false);
  useLayoutEffect(() => {
    pitInspection.current = pitFocused;
  }, [pitFocused]);
  const carMarkers = useRef<Partial<Record<ClassName, Marker>>>({});
  const cornerMarkers = useRef<Map<string, Marker>>(new Map());
  const clock = useRef(0);
  const models = useMemo(
    () =>
      Object.fromEntries(
        classOrder.map((cls) => [cls, speedModel(props.track, cls)]),
      ),
    [props.track],
  );
  const bounds = useMemo(() => {
    const coords = props.track.lngLat;
    return new maplibregl.LngLatBounds(
      [
        Math.min(...coords.map((p) => p[0])),
        Math.min(...coords.map((p) => p[1])),
      ],
      [
        Math.max(...coords.map((p) => p[0])),
        Math.max(...coords.map((p) => p[1])),
      ],
    );
  }, [props.track]);
  const road = useMemo<FeatureCollection<LineString>>(() => {
    const features: FeatureCollection<LineString>["features"] = [];
    const count = props.track.points.length;
    // Long enough runs remain visible when the full circuit is fitted; individual
    // 10 m segments otherwise disappear under low-zoom tile simplification.
    for (let start = 0; start < count; start += 10) {
      const end = Math.min(count, start + 10);
      const middle = Math.min(count - 1, Math.floor((start + end) / 2));
      const fraction = props.track.cum[middle] / props.track.length;
      const section =
        sections.find(
          (section) => fraction >= section.from && fraction < section.to,
        ) ?? sections[0];
      const model = models[props.follow];
      const speed =
        model.speeds[
          Math.min(
            model.speeds.length - 1,
            Math.floor((fraction * props.track.length) / model.step),
          )
        ] * 3.6;
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: Array.from(
            { length: end - start + 1 },
            (_, i) => props.track.lngLat[(start + i) % count],
          ),
        },
        properties: { section: section.color, speed: courseColour(speed) },
      });
    }
    return { type: "FeatureCollection", features };
  }, [props.track, props.follow, models]);
  const currentRoad = useRef(road);
  const installedRoad = useRef<typeof road | null>(null);
  useLayoutEffect(() => {
    currentRoad.current = road;
  }, [road]);

  const fitCircuit = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const mobile = (host.current?.clientWidth ?? 1000) < 700;
    m.fitBounds(bounds, {
      padding: mobile
        ? { top: 245, bottom: 245, left: 34, right: 34 }
        : { top: 140, bottom: 95, left: 115, right: 280 },
      pitch: tilted ? 48 : 0,
      bearing: -14,
      duration: 650,
      maxZoom: 14,
    });
  }, [bounds, tilted]);
  const fit = useRef(fitCircuit);
  useLayoutEffect(() => {
    fit.current = fitCircuit;
  }, [fitCircuit]);
  const onMapFocus = props.onMapFocus;
  const inspectPitLane = useCallback(() => {
    if (!pitLane || !map.current) return;
    onMapFocus();
    minimizeAttribution(map.current);
    pitInspection.current = true;
    setTilted(false);
    map.current.setPitch(0);
    map.current.fitBounds(pitLane.bounds, {
      padding:
        (host.current?.clientWidth ?? 1000) < 700
          ? { top: 275, bottom: 470, left: 46, right: 46 }
          : { top: 180, bottom: 160, left: 110, right: 310 },
      bearing: 0,
      pitch: 0,
      duration: 900,
      maxZoom: 17,
    });
  }, [pitLane, onMapFocus]);
  const inspectPit = useRef(inspectPitLane);
  useLayoutEffect(() => {
    inspectPit.current = inspectPitLane;
  }, [inspectPitLane]);
  const inspectPitDetail = (part: "entry" | "lane" | "exit") => {
    if (!pitLane || !map.current) return;
    const center =
      part === "entry"
        ? pitLane.coordinates[0]
        : part === "exit"
          ? pitLane.coordinates.at(-1)
          : pitLane.serviceCentre;
    if (!center) return;
    onMapFocus();
    minimizeAttribution(map.current);
    map.current.flyTo({
      center,
      zoom: 17.5,
      bearing: 0,
      pitch: tilted ? 48 : 0,
      offset:
        (host.current?.clientWidth ?? 1000) < 700 ? [0, -100] : [-90, -35],
      duration: 700,
    });
  };

  useEffect(() => {
    if (!host.current) return;
    let live = true;
    const cornerRegistry = cornerMarkers.current;
    queueMicrotask(() => {
      if (live) {
        setReady(false);
        setTerrainReady(false);
        setContextFailed(false);
        buildingsRequested.current = false;
        if (host.current) host.current.dataset.buildingsRequested = "false";
      }
    });
    let m: GeoMap;
    try {
      m = new maplibregl.Map({
        container: host.current,
        center: [0.2256, 47.9375],
        zoom: 13,
        pitch: 48,
        bearing: -14,
        maxPitch: 75,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        minZoom: 10,
        maxZoom: 21,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            orthophoto: {
              type: "raster",
              tiles: [PHOTO],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                '<a href="https://geoservices.ign.fr/bdortho" target="_blank">© IGN · BD ORTHO</a>',
            },
            plan: {
              type: "raster",
              tiles: [PLAN],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                '<a href="https://geoservices.ign.fr" target="_blank">© IGN · Plan IGN</a>',
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#121b20" },
            },
            {
              id: "photography",
              type: "raster",
              source: "orthophoto",
              paint: { "raster-fade-duration": 180 },
            },
            {
              id: "plan",
              type: "raster",
              source: "plan",
              layout: { visibility: "none" },
            },
          ],
        },
      });
    } catch {
      queueMicrotask(() => {
        if (live)
          setError(
            "Your browser could not start the geographic map. The elevation profile and lap guide remain available.",
          );
      });
      return;
    }
    map.current = m;
    m.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );
    m.addControl(
      new maplibregl.AttributionControl({
        customAttribution:
          '<a href="https://geoservices.ign.fr/rgealti" target="_blank">Terrain © IGN RGE ALTI</a> · <a href="https://geoservices.ign.fr/bdtopo" target="_blank">Buildings © IGN BD TOPO</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank">Track © OpenStreetMap contributors</a>',
      }),
      "bottom-right",
    );
    // Bottom controls stack upwards, so the scale sits above the attribution,
    // clear of the hint and source caption on the left.
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-right",
    );
    m.on("error", (event) => {
      if (!live) return;
      if (host.current)
        host.current.dataset.mapError =
          event.error?.message?.slice(0, 300) ?? "Map source error";
      if (event.error?.message?.includes("WebGL"))
        setError(
          "The map renderer stopped. Reload to restore the geographic view.",
        );
    });
    let lastSourceCheck = 0;
    let terrainVerified = false;
    m.on("render", () => {
      if (!live || !host.current) return;
      const now = performance.now();
      if (now - lastSourceCheck < 500) return;
      lastSourceCheck = now;
      host.current.dataset.mapZoom = m.getZoom().toFixed(2);
      host.current.dataset.mapCenter = JSON.stringify(m.getCenter().toArray());
      host.current.dataset.demLoaded = m.getSource("elevation")
        ? String(m.isSourceLoaded("elevation"))
        : "absent";
      if (m.getLayer("route"))
        host.current.dataset.routeRenderedCount = String(
          m.queryRenderedFeatures({ layers: ["route"] }).length,
        );
      if (m.getTerrain()) {
        const elevation = m.queryTerrainElevation(m.getCenter());
        host.current.dataset.terrainValue = String(elevation);
        if (elevation != null && Number.isFinite(elevation) && elevation > 0) {
          host.current.dataset.groundElevation = (
            elevation / (m.getTerrain()?.exaggeration ?? 1)
          ).toFixed(2);
          if (!terrainVerified) {
            terrainVerified = true;
            setTerrainReady(true);
            const selection = latest.current;
            if (
              !pitInspection.current &&
              selection.cam === "overview" &&
              !selection.activeCorner &&
              selection.focusFraction == null
            )
              fit.current();
          }
        }
      }
    });
    m.on("style.load", () => {
      if (!live) return;
      m.addSource("route", { type: "geojson", data: currentRoad.current });
      installedRoad.current = currentRoad.current;
      m.addLayer({
        id: "route-halo",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#071018",
          "line-width": 5.5,
          "line-opacity": 0.75,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });
      m.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": ["get", "section"], "line-width": 2.5 },
        layout: { "line-join": "round", "line-cap": "round" },
      });
      m.addSource("pit-lane", { type: "geojson", data: EMPTY });
      m.addLayer({
        id: "pit-lane-halo",
        type: "line",
        source: "pit-lane",
        filter: ["==", ["get", "role"], "pit_lane"],
        paint: { "line-color": "#102126", "line-width": 5.5 },
        layout: { "line-join": "round", "line-cap": "round" },
      });
      m.addLayer({
        id: "pit-lane-route",
        type: "line",
        source: "pit-lane",
        filter: ["==", ["get", "role"], "pit_lane"],
        paint: {
          "line-color": "#ffe0a2",
          "line-width": 2.5,
          "line-dasharray": [2.4, 1.4],
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });
      m.addSource("buildings", { type: "geojson", data: EMPTY });
      m.addLayer({
        id: "building-footprints",
        type: "fill",
        source: "buildings",
        paint: { "fill-color": "#e5ded0", "fill-opacity": 0.22 },
        layout: { visibility: "none" },
      });
      m.addLayer({
        id: "buildings-3d",
        type: "fill-extrusion",
        source: "buildings",
        filter: [">", ["coalesce", ["get", "height"], 0], 0],
        paint: {
          "fill-extrusion-color": "#d5d3c9",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 0],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.8,
        },
        layout: { visibility: "none" },
      });
      const seen = new Set<string>();
      for (const corner of props.track.corners) {
        if (!namedCorners.includes(corner.number) || seen.has(corner.name))
          continue;
        seen.add(corner.name);
        const button = document.createElement("button");
        button.className = "geo-corner";
        button.textContent = String(corner.number);
        button.setAttribute("aria-label", `Explore ${corner.name}`);
        button.title = `${corner.number} · ${corner.name}`;
        button.addEventListener("click", () =>
          latest.current.onCorner(corner.name),
        );
        const marker = new maplibregl.Marker({
          element: button,
          anchor: "center",
        })
          .setLngLat(geoAt(props.track, corner.fraction))
          .addTo(m);
        cornerMarkers.current.set(corner.name, marker);
      }
      for (const cls of classOrder) {
        const element = document.createElement("div");
        element.className = "geo-car";
        element.style.setProperty("--car-color", lapTargets[cls].color);
        element.setAttribute("aria-label", `${cls} illustrative lap marker`);
        carMarkers.current[cls] = new maplibregl.Marker({
          element,
          rotationAlignment: "map",
          pitchAlignment: "map",
        })
          .setLngLat(geoAt(props.track, 0))
          .addTo(m);
      }
      m.on("click", ["building-footprints", "buildings-3d"], (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const properties = feature.properties ?? {};
        const content = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = String(
          properties.name ||
            properties.type ||
            properties.nature ||
            "Mapped building",
        );
        const info = document.createElement("p");
        const height = Number(properties.height);
        info.textContent =
          height > 0
            ? `Height: ${height.toFixed(1)} m · ${String(properties.heightSource || "IGN BD TOPO")}`
            : "Mapped footprint · height unavailable";
        content.append(name, info);
        new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
          .setLngLat(event.lngLat)
          .setDOMContent(content)
          .addTo(m);
      });
      setReady(true);
      fit.current();
      // useTrack already downloaded and parsed the context. Reuse its terrain
      // metadata; the optional 14 MB building layer stays untouched until enabled.
      const context = props.track.context as CircuitContext | undefined;
      const terrain = context?.terrain;
      if (terrain?.tiles?.length) {
        m.addSource("elevation", {
          type: "raster-dem",
          tiles: terrain.tiles.map((tile) =>
            tile.startsWith("http")
              ? tile
              : `${location.origin}${import.meta.env.BASE_URL}${tile.replace(/^\//, "")}`,
          ),
          encoding: terrain.encoding ?? "mapbox",
          tileSize: terrain.tileSize ?? 256,
          minzoom: terrain.minzoom,
          maxzoom: terrain.maxzoom,
          bounds: terrain.bounds,
        });
        m.setTerrain({ source: "elevation", exaggeration: 1 });
      } else {
        setContextFailed(true);
      }
    });
    let resizeFit: number | undefined;
    const observer = new ResizeObserver(() => {
      m.resize();
      window.clearTimeout(resizeFit);
      resizeFit = window.setTimeout(() => {
        if (
          live &&
          m.isStyleLoaded() &&
          latest.current.cam === "overview" &&
          !latest.current.activeCorner &&
          latest.current.focusFraction == null &&
          !pitInspection.current
        )
          fit.current();
      }, 250);
    });
    observer.observe(host.current);
    return () => {
      live = false;
      observer.disconnect();
      window.clearTimeout(resizeFit);
      cornerRegistry.clear();
      carMarkers.current = {};
      m.remove();
      map.current = null;
    };
  }, [props.track]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !buildingsVisible || buildingsRequested.current) return;
    if (context?.layers?.buildings) {
      const url = context.layers.buildings;
      (m.getSource("buildings") as GeoJSONSource).setData(
        url.startsWith("http")
          ? url
          : `${location.origin}${import.meta.env.BASE_URL}${url.replace(/^\//, "")}`,
      );
      buildingsRequested.current = true;
      if (host.current) host.current.dataset.buildingsRequested = "true";
    } else if (context?.buildings) {
      (m.getSource("buildings") as GeoJSONSource).setData(context.buildings);
      buildingsRequested.current = true;
      if (host.current) host.current.dataset.buildingsRequested = "true";
    }
  }, [ready, buildingsVisible, context]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !pitLane) return;
    (m.getSource("pit-lane") as GeoJSONSource).setData(pitLane.data);
    const markers = pitLane.data.features.flatMap((feature) => {
      if (
        feature.geometry.type !== "Point" ||
        !["pit_entry", "pit_exit"].includes(feature.properties.role)
      )
        return [];
      const button = document.createElement("button");
      button.className = "geo-pit-marker";
      button.textContent =
        feature.properties.role === "pit_entry" ? "PIT IN" : "PIT OUT";
      button.setAttribute(
        "aria-label",
        feature.properties.role === "pit_entry"
          ? "Inspect pit entry"
          : "Inspect pit exit",
      );
      button.addEventListener("click", () => inspectPit.current());
      return [
        new maplibregl.Marker({ element: button, anchor: "bottom" })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .addTo(m),
      ];
    });
    const updateMarkers = () => {
      for (const marker of markers)
        marker.getElement().hidden = m.getZoom() < 14 && !pitInspection.current;
    };
    m.on("zoom", updateMarkers);
    updateMarkers();
    return () => {
      m.off("zoom", updateMarkers);
      markers.forEach((marker) => marker.remove());
    };
  }, [ready, pitLane]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    if (installedRoad.current !== road) {
      (m.getSource("route") as GeoJSONSource).setData(road);
      installedRoad.current = road;
    }
  }, [ready, road]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setPaintProperty("route", "line-color", [
      "get",
      props.mode === "speed" ? "speed" : "section",
    ]);
  }, [ready, props.mode]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty(
      "photography",
      "visibility",
      photography ? "visible" : "none",
    );
    m.setLayoutProperty("plan", "visibility", photography ? "none" : "visible");
    m.setPaintProperty(
      "photography",
      "raster-brightness-max",
      props.night ? 0.52 : 1,
    );
  }, [photography, ready, props.night]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty(
      "buildings-3d",
      "visibility",
      buildingsVisible && tilted ? "visible" : "none",
    );
    m.setLayoutProperty(
      "building-footprints",
      "visibility",
      buildingsVisible ? "visible" : "none",
    );
    const targetPitch = tilted ? 48 : 0;
    if (Math.abs(m.getPitch() - targetPitch) > 0.05)
      m.easeTo({ pitch: targetPitch, duration: 700 });
    if (terrainReady && m.getTerrain()?.exaggeration !== exaggeration)
      m.setTerrain({ source: "elevation", exaggeration });
  }, [ready, tilted, buildingsVisible, exaggeration, terrainReady]);
  useEffect(() => {
    if (ready) fit.current();
  }, [props.cameraReset, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    for (const [name, marker] of cornerMarkers.current)
      marker.getElement().classList.toggle("on", name === props.activeCorner);
    const corner = props.track.corners.find(
      (corner) => corner.name === props.activeCorner,
    );
    if (corner) {
      minimizeAttribution(map.current);
      map.current.flyTo({
        center: geoAt(props.track, corner.fraction),
        zoom: 16.5,
        pitch: tilted ? 55 : 0,
        duration: 900,
      });
    }
  }, [props.activeCorner, props.track, ready, tilted]);
  useEffect(() => {
    if (!ready || !map.current || props.focusFraction == null) return;
    map.current.easeTo({
      center: geoAt(props.track, props.focusFraction),
      zoom: Math.max(15, map.current.getZoom()),
      duration: 500,
    });
  }, [props.focusFraction, props.track, ready]);

  useEffect(() => {
    if (!ready || !host.current) return;
    let frame = 0,
      previous = 0,
      lastTick = -Infinity,
      lastFollow = -Infinity;
    let inView = false;
    const offsets: Record<ClassName, number> = {
      Hypercar: 70,
      LMP2: 35,
      LMGT3: 0,
    };
    const animate = (now: number) => {
      frame = 0;
      if (document.hidden || !inView) return;
      const dt = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
      previous = now;
      const p = latest.current;
      if (p.playing) clock.current += dt * p.timeScale;
      if (now - lastTick > 100) {
        for (const cls of classOrder) {
          const marker = carMarkers.current[cls];
          if (!marker) continue;
          marker.getElement().style.display = p.visible[cls] ? "" : "none";
          const model = models[cls],
            time = clock.current + offsets[cls];
          const fraction = fractionAtTime(model, time, p.track.length);
          const point = pointAt(p.track, fraction);
          if (p.visible[cls])
            marker
              .setLngLat([point.longitude, point.latitude])
              .setRotation(90 + (point.heading * 180) / Math.PI);
          if (cls === p.follow) {
            const index = Math.min(
              model.speeds.length - 1,
              Math.floor((fraction * p.track.length) / model.step),
            );
            p.onTick({
              cls,
              fraction,
              speed: model.speeds[index] * 3.6,
              lap: model.lapTime,
              elapsed: ((time % model.lapTime) + model.lapTime) % model.lapTime,
            });
            if (p.cam === "follow" && now - lastFollow > 250) {
              map.current?.easeTo({
                center: [point.longitude, point.latitude],
                bearing: 90 + (point.heading * 180) / Math.PI,
                zoom: 17.2,
                pitch: 58,
                duration: 280,
                essential: true,
              });
              lastFollow = now;
            }
          }
        }
        lastTick = now;
      }
      if (p.playing) frame = requestAnimationFrame(animate);
    };
    const wake = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      lastTick = -Infinity;
      if (!document.hidden && inView) frame = requestAnimationFrame(animate);
    };
    // Intersection callbacks replace a layout read on every animation frame.
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      wake();
    });
    observer.observe(host.current);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", wake);
    };
  }, [ready, models, props.playing, props.follow, props.visible, props.cam]);

  return (
    <div
      className="geo-map-wrap"
      data-map-ready={ready}
      data-terrain-ready={terrainReady}
      data-pit-focused={pitFocused}
    >
      <div
        className="geo-map-canvas"
        ref={host}
        aria-label="Georeferenced aerial map of Circuit de la Sarthe"
      />
      {!ready && !error && (
        <div className="geo-map-loading">Loading IGN aerial imagery…</div>
      )}
      {error && (
        <div className="scene-error" role="alert">
          <p>{error}</p>
          <button className="btn ghost" onClick={() => location.reload()}>
            Reload map
          </button>
        </div>
      )}
      <div
        className="geo-layer-controls"
        role="group"
        aria-label="Geographic map layers"
      >
        <button
          aria-pressed={photography}
          onClick={() => setPhotography(!photography)}
        >
          {photography ? <Layers size={15} /> : <MapIcon size={15} />}
          <span>{photography ? "Aerial photography" : "IGN map"}</span>
        </button>
        <button aria-pressed={tilted} onClick={() => setTilted(!tilted)}>
          <Navigation size={15} />
          <span>{tilted ? "3D view" : "Overhead"}</span>
        </button>
        <button
          aria-pressed={buildingsVisible}
          disabled={!buildingsCount}
          onClick={() => setBuildingsVisible(!buildingsVisible)}
        >
          <Building2 size={15} />
          <span>
            Buildings
            {buildingsCount > 0 && (
              <small> · {buildingsCount.toLocaleString()}</small>
            )}
          </span>
        </button>
        <button
          className="geo-pit-button"
          disabled={!pitLane}
          aria-pressed={pitFocused}
          aria-label="Inspect pit lane"
          title={
            pitLaneFailed
              ? "Mapped pit lane unavailable"
              : "Explore the mapped pit entry, lane and exit"
          }
          onClick={inspectPitLane}
        >
          <Flag size={15} />
          <span>Pit lane</span>
        </button>
        <button
          className="geo-relief-button"
          disabled={!terrainReady}
          aria-pressed={exaggeration !== 1}
          onClick={() => setExaggeration(exaggeration === 1 ? 3 : 1)}
        >
          <Mountain size={15} />
          <span>Relief {exaggeration}×</span>
        </button>
        <button aria-label="Fit geographic circuit" onClick={props.onOverview}>
          <RotateCcw size={15} />
        </button>
      </div>
      {pitFocused && pitLane && (
        <div
          className="geo-pit-guide"
          role="region"
          aria-label="Pit lane guide"
        >
          <button
            className="geo-pit-close"
            aria-label="Close pit lane guide"
            onClick={props.onPitLaneClose}
          >
            <X size={15} />
          </button>
          <span className="kicker">Pit entry · service lane · pit exit</span>
          <h2>The pit lane</h2>
          <p>
            <i /> Mapped route · ≈ {(pitLane.lengthMetres / 1000).toFixed(2)} km
          </p>
          <div
            className="geo-pit-views"
            role="group"
            aria-label="Pit lane close-ups"
          >
            <button onClick={() => inspectPitDetail("entry")}>Entry</button>
            <button
              disabled={!pitLane.serviceCentre}
              onClick={() => inspectPitDetail("lane")}
            >
              Lane
            </button>
            <button onClick={() => inspectPitDetail("exit")}>Exit</button>
            <button onClick={inspectPitLane}>Full route</button>
          </div>
          <p className="geo-pit-description">
            Follow the lane past the garages, through the mapped underpass and
            back onto the circuit.
          </p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        </div>
      )}
      <div className="geo-source-caption">
        <span>
          {photography
            ? "IGN orthophotography · 20 cm imagery"
            : "IGN cartographic basemap"}
        </span>
        <span>
          {terrainReady
            ? `RGE ALTI terrain · ${exaggeration}× vertical scale`
            : contextFailed
              ? "Terrain source unavailable"
              : "Terrain source loading"}
        </span>
        {buildingsVisible && (
          <span>IGN mapped footprints · sourced heights where available</span>
        )}
      </div>
    </div>
  );
}
