import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, Map as GeoMap, Marker } from "maplibre-gl";
import { Moon, Sun } from "lucide-react";
import { classInfo, classOrder } from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { sections } from "../data/track.ts";
import {
  fractionAtTime,
  pointAt,
  speedModel,
  useTrack,
} from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { setPhase, usePhase } from "../data/racePhase.ts";
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

const lighting = {
  day: { brightness: 1, saturation: 0.08, contrast: 0.06 },
  night: { brightness: 0.46, saturation: -0.55, contrast: 0.25 },
};
// Haze at the horizon sells the altitude: warm afternoon by day, deep blue by night.
const skies = {
  day: {
    "sky-color": "#7fa6cf",
    "horizon-color": "#f3d6ae",
    "fog-color": "#d9c7a8",
    "sky-horizon-blend": 0.7,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.82,
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
};

function bearingBetween(track: TrackGeo, fraction: number) {
  const here = pointAt(track, fraction);
  const ahead = pointAt(track, fraction + 70 / track.length);
  return 90 + deg(Math.atan2(ahead.z - here.z, ahead.x - here.x));
}

function Drone({ track }: { track: TrackGeo }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GeoMap | null>(null);
  const markers = useRef<Partial<Record<ClassName, Marker>>>({});
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
        zoom: 16.4,
        pitch: 62,
        bearing: bearingBetween(track, 0.02),
        maxPitch: 78,
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
    m.on("load", () => {
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
      for (const cls of classOrder) {
        const element = document.createElement("div");
        element.className = "drone-car";
        element.style.setProperty("--c", classInfo[cls].color);
        element.innerHTML = "<i></i><b></b>";
        markers.current[cls] = new maplibregl.Marker({
          element,
          rotationAlignment: "map",
          pitchAlignment: "map",
        })
          .setLngLat([start.longitude, start.latitude])
          .addTo(m);
      }
      setReady(true);
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      markers.current = {};
    };
  }, [track]);

  // Lighting follows the shared day/night phase.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const look = lighting[phase];
    m.setSky(skies[phase]);
    m.setPaintProperty("photo", "raster-brightness-max", look.brightness);
    m.setPaintProperty("photo", "raster-saturation", look.saturation);
    m.setPaintProperty("photo", "raster-contrast", look.contrast);
    const night = phase === "night";
    // At night the circuit lights up like a sodium-lit road.
    m.setPaintProperty("route-glow", "line-opacity", night ? 0.55 : 0.12);
    m.setPaintProperty("route-glow", "line-color", night ? "#ffb066" : "#ffffff");
    m.setPaintProperty("route", "line-color", night ? "#ffd29a" : "#ffffff");
    m.setPaintProperty("route", "line-opacity", night ? 0.85 : 0.45);
  }, [phase, ready]);

  // The drone: smoothed chase camera plus HUD, only while on screen.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !host.current) return;
    let frame = 0,
      previous = 0,
      lastHud = 0,
      t = 40,
      bearing = m.getBearing(),
      visible = false;
    const still = reduced();
    const step = (now: number) => {
      frame = 0;
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
      previous = now;
      t += dt;
      const followed = followRef.current;
      let followFraction = 0;
      for (const cls of classOrder) {
        const fraction = fractionAtTime(models[cls], t + GAP[cls], track.length);
        const point = pointAt(track, fraction);
        markers.current[cls]
          ?.setLngLat([point.longitude, point.latitude])
          .setRotation(deg(point.heading) + 90);
        if (cls === followed) followFraction = fraction;
      }
      const car = pointAt(track, followFraction);
      const target = bearingBetween(track, followFraction);
      const diff = ((target - bearing + 540) % 360) - 180;
      bearing += diff * Math.min(1, dt * 1.8);
      m.jumpTo({
        center: [car.longitude, car.latitude],
        bearing,
        zoom: 16.85 + Math.sin(t / 9) * 0.3,
        pitch: 70 + Math.sin(t / 13) * 3,
        padding: { top: host.current!.clientHeight * 0.38, bottom: 0, left: 0, right: 0 },
      });
      if (now - lastHud > 90) {
        lastHud = now;
        const model = models[followed];
        const index = Math.min(
          model.speeds.length - 1,
          Math.floor((followFraction * track.length) / model.step),
        );
        const sector =
          sections.find((s) => followFraction >= s.from && followFraction < s.to) ??
          sections[sections.length - 1];
        const elapsed =
          (((t + GAP[followed]) % model.lapTime) + model.lapTime) % model.lapTime;
        if (hud.speed.current)
          hud.speed.current.textContent = String(Math.round(model.speeds[index] * 3.6));
        if (hud.sector.current && hud.sector.current.textContent !== sector.name) {
          hud.sector.current.textContent = sector.name;
          hud.sector.current.style.setProperty("--c", sector.color);
        }
        if (hud.km.current)
          hud.km.current.textContent = ((followFraction * track.length) / 1000).toFixed(2);
        if (hud.lap.current) hud.lap.current.textContent = clock(elapsed);
        hud.bar.current?.style.setProperty("--f", followFraction.toFixed(4));
        const tail = Math.max(0, followFraction - 0.012);
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
        <div className="drone-toggle glass-switch" role="group" aria-label="Lighting">
          <button aria-pressed={phase === "day"} onClick={() => setPhase("day")}>
            <Sun size={14} /> Day
          </button>
          <button aria-pressed={phase === "night"} onClick={() => setPhase("night")}>
            <Moon size={14} /> Night
          </button>
        </div>
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
          Illustrative lap model, not telemetry
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
