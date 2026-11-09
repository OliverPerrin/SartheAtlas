import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, Map as GeoMap } from "maplibre-gl";
import { carById, classInfo, classOrder } from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { sections } from "../data/track.ts";
import {
  fractionAtTime,
  pointAt,
  speedModel,
  unprojectXZ,
  useTrack,
} from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { isDark, usePhase } from "../data/racePhase.ts";
import type { Phase } from "../data/racePhase.ts";
import { createDroneCars } from "../three/droneCars.ts";
import type { DroneCarState } from "../three/droneCars.ts";
import Atmosphere from "./Atmosphere.tsx";
import PhaseSwitch from "./PhaseSwitch.tsx";
import { useFonts } from "./useFonts.ts";
import "maplibre-gl/dist/maplibre-gl.css";
import "./DroneView.css";

maplibregl.setWorkerUrl(mapWorkerUrl);

const PHOTO =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=HR.ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}";

const GAP: Record<ClassName, number> = { Hypercar: 0, LMP2: -9, LMGT3: -19 };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const deg = (radians: number) => (radians * 180) / Math.PI;
const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

/** One car per class: the entry whose colour study each 3D model wears. */
const CAST: Record<ClassName, string> = {
  Hypercar: "50",
  LMP2: "22",
  LMGT3: "92",
};

const lighting: Record<
  Phase,
  { brightness: number; saturation: number; contrast: number; hue: number }
> = {
  day: { brightness: 1, saturation: 0.1, contrast: 0.06, hue: 0 },
  dusk: { brightness: 0.74, saturation: 0.05, contrast: 0.2, hue: -8 },
  night: { brightness: 0.4, saturation: -0.55, contrast: 0.28, hue: 0 },
  dawn: { brightness: 0.7, saturation: -0.2, contrast: 0.12, hue: 6 },
};
// Haze at the horizon sells the altitude, and carries the colour of the hour.
const skies: Record<Phase, Record<string, string | number>> = {
  day: {
    "sky-color": "#7fa6cf",
    "horizon-color": "#f3d6ae",
    "fog-color": "#d9c7a8",
    "sky-horizon-blend": 0.7,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.82,
    "atmosphere-blend": 0,
  },
  dusk: {
    "sky-color": "#3b3f78",
    "horizon-color": "#ff8a3d",
    "fog-color": "#c96a3c",
    "sky-horizon-blend": 0.85,
    "horizon-fog-blend": 0.75,
    "fog-ground-blend": 0.7,
    "atmosphere-blend": 0,
  },
  night: {
    "sky-color": "#02040c",
    "horizon-color": "#1b2550",
    "fog-color": "#0b1024",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.5,
    "fog-ground-blend": 0.8,
    "atmosphere-blend": 0,
  },
  dawn: {
    "sky-color": "#5f79b8",
    "horizon-color": "#ffb3a6",
    "fog-color": "#c9a7b4",
    "sky-horizon-blend": 0.8,
    "horizon-fog-blend": 0.7,
    "fog-ground-blend": 0.72,
    "atmosphere-blend": 0,
  },
};
const smooth = (x: number) => x * x * (3 - 2 * x);

function bearingBetween(track: TrackGeo, fraction: number) {
  const here = pointAt(track, fraction);
  const ahead = pointAt(track, fraction + 70 / track.length);
  return 90 + deg(Math.atan2(ahead.z - here.z, ahead.x - here.x));
}

function Drone({ track }: { track: TrackGeo }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GeoMap | null>(null);
  const cars = useRef<DroneCarState[]>(
    classOrder.map(() => ({ x: 0, z: 0, heading: 0, visible: false })),
  );
  const origin = useRef<[number, number]>([0, 0]);
  const carScale = useRef(1.6);
  const fontsReady = useFonts();
  const hud = {
    speed: useRef<HTMLElement>(null),
    sector: useRef<HTMLElement>(null),
    km: useRef<HTMLElement>(null),
    lap: useRef<HTMLElement>(null),
    bar: useRef<HTMLDivElement>(null),
  };
  const [follow, setFollow] = useState<ClassName>("Hypercar");
  const followRef = useRef(follow);
  const [ready, setReady] = useState(false);
  const phase = usePhase();
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const models = useMemo(
    () =>
      Object.fromEntries(
        classOrder.map((cls) => [cls, speedModel(track, cls)]),
      ) as Record<ClassName, ReturnType<typeof speedModel>>,
    [track],
  );
  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  // Build the map once.
  useEffect(() => {
    if (!host.current) return;
    const start = pointAt(track, 0.02);
    let m: GeoMap;
    try {
      m = new maplibregl.Map({
        container: host.current,
        interactive: false,
        attributionControl: false,
        center: [start.longitude, start.latitude],
        zoom: 18.6,
        pitch: 66,
        bearing: bearingBetween(track, 0.02),
        maxPitch: 80,
        fadeDuration: 0,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        style: {
          version: 8,
          sources: {
            photo: {
              type: "raster",
              tiles: [PHOTO],
              tileSize: 256,
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#0b0d0c" },
            },
            {
              id: "photo",
              type: "raster",
              source: "photo",
              paint: {
                "raster-fade-duration": 0,
                "raster-brightness-max-transition": { duration: 1400, delay: 0 },
                "raster-saturation-transition": { duration: 1400, delay: 0 },
                "raster-contrast-transition": { duration: 1400, delay: 0 },
              },
            },
          ],
        },
      });
    } catch {
      return;
    }
    map.current = m;
    // "style.load" rather than "load": the lap can start while imagery streams in.
    m.on("style.load", () => {
      const ring = [...track.lngLat, track.lngLat[0]];
      m.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: ring },
        },
      });
      m.addSource("trail", {
        type: "geojson",
        lineMetrics: true,
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: ring.slice(0, 2) },
        },
      });
      m.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 18,
          "line-blur": 14,
          "line-opacity": 0.12,
          "line-opacity-transition": { duration: 1400, delay: 0 },
        },
      });
      m.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.6,
          "line-opacity": 0.45,
          "line-dasharray": [2, 3],
        },
      });
      m.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-width": 16,
          "line-blur": 10,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(255,30,60,0)",
            1,
            "rgba(255,30,60,0.75)",
          ],
        },
      });
      m.addLayer({
        id: "trail",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-width": 3.5,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(255,255,255,0)",
            1,
            "rgba(255,240,240,0.95)",
          ],
        },
      });
      // Pools of light along the circuit, switched on after dark.
      const posts = [];
      const spacing = 55 / track.length;
      for (let f = 0; f < 1; f += spacing) {
        const p = pointAt(track, f);
        posts.push({
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "Point" as const,
            coordinates: [p.longitude, p.latitude],
          },
        });
      }
      m.addSource("posts", {
        type: "geojson",
        data: { type: "FeatureCollection", features: posts },
      });
      m.addLayer(
        {
          id: "posts",
          type: "circle",
          source: "posts",
          paint: {
            "circle-pitch-alignment": "map",
            "circle-color": "#ffb066",
            "circle-blur": 1,
            "circle-opacity": 0,
            "circle-opacity-transition": { duration: 1400, delay: 0 },
            "circle-radius": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              15, 6,
              17, 24,
              19, 96,
            ],
          },
        },
        "route",
      );
      setReady(true);
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, [track]);

  // The 3D cars join once the map and the livery fonts are ready.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !fontsReady) return;
    const cast = classOrder.map((cls) => {
      const entry = entries.find((e) => e.number === CAST[cls])!;
      return { car: carById(entry.carId)!, entry };
    });
    const layer = createDroneCars(
      cast,
      () => cars.current,
      () => phaseRef.current,
      () => origin.current,
      () => carScale.current,
    );
    m.addLayer(layer);
    m.triggerRepaint();
    return () => {
      if (m.getLayer(layer.id)) m.removeLayer(layer.id);
      else layer.dispose();
    };
  }, [ready, fontsReady]);

  // Lighting follows the shared time of day.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const look = lighting[phase];
    m.setSky(skies[phase]);
    m.setPaintProperty("photo", "raster-brightness-max", look.brightness);
    m.setPaintProperty("photo", "raster-saturation", look.saturation);
    m.setPaintProperty("photo", "raster-contrast", look.contrast);
    m.setPaintProperty("photo", "raster-hue-rotate", look.hue);
    const dark = isDark(phase);
    const lit = phase === "night" ? 1 : phase === "dusk" ? 0.55 : phase === "dawn" ? 0.3 : 0;
    // After dark the circuit is a ribbon of sodium light.
    m.setPaintProperty("posts", "circle-opacity", lit * 0.5);
    m.setPaintProperty("route-glow", "line-opacity", 0.1 + lit * 0.4);
    m.setPaintProperty("route-glow", "line-color", dark ? "#ffb066" : "#ffffff");
    m.setPaintProperty("route", "line-color", dark ? "#ffd29a" : "#ffffff");
    m.setPaintProperty("route", "line-opacity", 0.4 + lit * 0.4);
    m.triggerRepaint();
  }, [phase, ready]);

  // The drone: smoothed chase camera plus HUD, only while on screen.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !host.current) return;
    let frame = 0,
      previous = 0,
      lastHud = 0,
      t = 40,
      zoom = m.getZoom(),
      bearing = m.getBearing(),
      visible = false;
    const still = reduced();
    const step = (now: number) => {
      frame = 0;
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
      previous = now;
      t += dt;
      const followed = followRef.current;
      const followFraction = fractionAtTime(
        models[followed],
        t + GAP[followed],
        track.length,
      );
      const car = pointAt(track, followFraction);
      origin.current = [car.longitude, car.latitude];
      classOrder.forEach((cls, i) => {
        const fraction = fractionAtTime(models[cls], t + GAP[cls], track.length);
        const point = pointAt(track, fraction);
        // Aim each car where the road goes next, not along one short segment.
        const ahead = pointAt(track, fraction + 6 / track.length);
        const state = cars.current[i];
        state.x = point.x - car.x;
        state.z = point.z - car.z;
        state.heading = Math.atan2(ahead.z - point.z, ahead.x - point.x);
        state.visible = Math.hypot(state.x, state.z) < 1400;
      });
      const model = models[followed];
      const kmh =
        model.speeds[
          Math.min(
            model.speeds.length - 1,
            Math.floor((followFraction * track.length) / model.step),
          )
        ] * 3.6;
      // Like a helicopter shot: close in the slow corners, pulled back and
      // flatter on the straights, where the ground goes by fastest.
      const pace = smooth(Math.min(1, Math.max(0, (kmh - 110) / 190)));
      zoom += (19.25 - pace * 1.15 - zoom) * Math.min(1, dt * 0.8);
      // Cars are drawn a little over scale, more so from further away, so
      // they stay readable from the air.
      carScale.current = 1.6 + (19.25 - zoom) * 0.9;
      const target = bearingBetween(track, followFraction);
      const diff = ((target - bearing + 540) % 360) - 180;
      bearing += diff * Math.min(1, dt * 1.6);
      // Frame the car in the lower part of the picture by aiming the camera
      // at the road ahead of it. (Map padding would do this too, but the sky
      // is drawn from the unpadded centre and leaves a blank band.)
      const view = bearing + Math.sin(t / 11) * 14;
      const tilt = 71 + pace * 4 + Math.sin(t / 13) * 2;
      const metresPerPixel =
        (78271.517 * Math.cos((car.latitude * Math.PI) / 180)) / 2 ** zoom;
      const lead =
        (host.current!.clientHeight * 0.13 * metresPerPixel) /
        Math.cos((tilt * Math.PI) / 180);
      const aim = unprojectXZ(
        track,
        car.x + Math.sin((view * Math.PI) / 180) * lead,
        car.z - Math.cos((view * Math.PI) / 180) * lead,
      );
      m.jumpTo({
        center: aim,
        bearing: view,
        zoom: zoom + Math.sin(t / 9) * 0.12,
        pitch: tilt,
      });
      if (now - lastHud > 90) {
        lastHud = now;
        const sector =
          sections.find((s) => followFraction >= s.from && followFraction < s.to) ??
          sections[sections.length - 1];
        const elapsed =
          (((t + GAP[followed]) % model.lapTime) + model.lapTime) % model.lapTime;
        if (hud.speed.current)
          hud.speed.current.textContent = String(Math.round(kmh));
        if (hud.sector.current && hud.sector.current.textContent !== sector.name) {
          hud.sector.current.textContent = sector.name;
          hud.sector.current.style.setProperty("--c", sector.color);
        }
        if (hud.km.current)
          hud.km.current.textContent = ((followFraction * track.length) / 1000).toFixed(2);
        if (hud.lap.current) hud.lap.current.textContent = clock(elapsed);
        hud.bar.current?.style.setProperty("--f", followFraction.toFixed(4));
        const tail = Math.max(0, followFraction - 0.006);
        const steps = 24;
        const coordinates: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const p = pointAt(track, tail + ((followFraction - tail) * i) / steps);
          coordinates.push([p.longitude, p.latitude]);
        }
        (m.getSource("trail") as GeoJSONSource | undefined)?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        });
      }
      if (visible && !document.hidden && !still) frame = requestAnimationFrame(step);
    };
    const wake = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (still) step(performance.now());
      else if (visible && !document.hidden) frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    observer.observe(host.current);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", wake);
    };
    // HUD refs are stable; models and track change together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, models, track]);

  return (
    <div className={`drone ${phase}${ready ? " ready" : ""}`}>
      <div className="drone-map" ref={host} />
      <div className="drone-grade" aria-hidden="true" />
      <Atmosphere phase={phase} className="drone-atmosphere" layers="sky" />
      <div className="drone-hud">
        <div className="drone-follow" role="group" aria-label="Car to follow">
          {classOrder.map((cls) => (
            <button
              key={cls}
              aria-pressed={follow === cls}
              style={{ "--c": classInfo[cls].color } as React.CSSProperties}
              onClick={() => setFollow(cls)}
            >
              <i />
              {cls}
            </button>
          ))}
        </div>
        <div className="drone-readout" aria-live="off">
          <span className="drone-label">Modelled speed</span>
          <strong>
            <b ref={hud.speed}>0</b>
            <small>km/h</small>
          </strong>
          <span className="drone-sector" ref={hud.sector}>
            {sections[0].name}
          </span>
          <div className="drone-meta">
            <span>
              Lap <b ref={hud.lap}>0:00.0</b>
            </span>
            <span>
              <b ref={hud.km}>0.00</b> / {(track.length / 1000).toFixed(3)} km
            </span>
          </div>
        </div>
        <PhaseSwitch className="drone-toggle" />
        <div className="drone-bar" ref={hud.bar} aria-hidden="true">
          {sections.map((section) => (
            <i
              key={section.id}
              style={
                {
                  "--c": section.color,
                  flexGrow: section.to - section.from,
                } as React.CSSProperties
              }
            />
          ))}
          <em />
        </div>
        <p className="drone-credit">
          Aerial imagery © IGN BD ORTHO · Track © OpenStreetMap contributors ·
          Illustrative lap model and car studies, not telemetry
        </p>
      </div>
    </div>
  );
}

export default function DroneView() {
  const { track, error } = useTrack({ context: false });
  if (error)
    return <div className="drone drone-fallback">The aerial view could not load.</div>;
  if (!track) return <div className="drone drone-fallback">Launching the drone…</div>;
  return <Drone track={track} />;
}
