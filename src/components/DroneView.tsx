import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, Map as GeoMap } from "maplibre-gl";
import { classInfo, classOrder } from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { sections } from "../data/track.ts";
import { pointAt, useTrack } from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { usePhase } from "../data/racePhase.ts";
import { createDroneCars } from "../three/droneCars.ts";
import Atmosphere from "./Atmosphere.tsx";
import PhaseSwitch from "./PhaseSwitch.tsx";
import {
  createDroneRig,
  droneCast,
  droneLit,
  groundWidth,
  lightDroneMap,
} from "./droneRig.ts";
import { useFonts } from "./useFonts.ts";
import "maplibre-gl/dist/maplibre-gl.css";
import "./DroneView.css";

maplibregl.setWorkerUrl(mapWorkerUrl);

const PHOTO =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=HR.ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}";

// The other classes start behind the Hypercar, so nothing is ever overtaken
// through another car on the same line.
const GAP: Record<ClassName, number> = { Hypercar: 0, LMP2: -9, LMGT3: -19 };
// The lap opens on the pit straight, a few seconds before the line.
const START = 0.975;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

function Drone({ track }: { track: TrackGeo }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GeoMap | null>(null);
  const rig = useMemo(() => createDroneRig(track, GAP), [track]);
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
  useEffect(() => {
    followRef.current = follow;
    // A change of car is a cut, not a pan across the circuit.
    rig.cut();
  }, [follow, rig]);

  // Build the map once.
  useEffect(() => {
    if (!host.current) return;
    const start = rig.opening(START);
    let m: GeoMap;
    try {
      m = new maplibregl.Map({
        container: host.current,
        interactive: false,
        attributionControl: false,
        center: start.center,
        zoom: 18.5,
        pitch: 72,
        bearing: start.bearing,
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
      // After dark the circuit is lit: a soft ribbon about a road wide, so
      // the asphalt stays readable between the cars' own lamps.
      m.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffc98f",
          "line-width": groundWidth(26) as never,
          "line-blur": groundWidth(18) as never,
          "line-opacity": 0,
          "line-opacity-transition": { duration: 1400, delay: 0 },
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
        "trail-glow",
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
  }, [track, rig]);

  // The 3D cars join once the map and the livery fonts are ready.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !fontsReady) return;
    const layer = createDroneCars(
      droneCast(),
      rig.states,
      () => phaseRef.current,
      rig.origin,
      rig.scale,
    );
    m.addLayer(layer);
    m.triggerRepaint();
    return () => {
      if (m.getLayer(layer.id)) m.removeLayer(layer.id);
      else layer.dispose();
    };
  }, [ready, fontsReady, rig]);

  // Lighting follows the shared time of day.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    lightDroneMap(m, "photo", phase);
    const lit = droneLit(phase);
    m.setPaintProperty("posts", "circle-opacity", lit * 0.42);
    m.setPaintProperty("route-glow", "line-opacity", lit * 0.2);
    m.triggerRepaint();
  }, [phase, ready]);

  // The drone: smoothed chase camera plus HUD, only while on screen.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !host.current) return;
    let frame = 0,
      previous = 0,
      lastHud = 0,
      t = rig.timeAt("Hypercar", START),
      visible = false;
    const still = reduced();
    const step = (now: number) => {
      frame = 0;
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
      previous = now;
      // One second of lap per second of screen time.
      t += dt;
      const car = rig.place(t, followRef.current);
      rig.chase(m, car, dt, host.current!.clientHeight);
      if (now - lastHud > 90) {
        lastHud = now;
        const sector =
          sections.find((s) => car.fraction >= s.from && car.fraction < s.to) ??
          sections[sections.length - 1];
        if (hud.speed.current)
          hud.speed.current.textContent = String(Math.round(car.kmh));
        if (hud.sector.current && hud.sector.current.textContent !== sector.name) {
          hud.sector.current.textContent = sector.name;
          hud.sector.current.style.setProperty("--c", sector.color);
        }
        if (hud.km.current)
          hud.km.current.textContent = ((car.fraction * track.length) / 1000).toFixed(2);
        if (hud.lap.current) hud.lap.current.textContent = clock(car.elapsed);
        hud.bar.current?.style.setProperty("--f", car.fraction.toFixed(4));
        (m.getSource("trail") as GeoJSONSource | undefined)?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: rig.trail(car) },
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
    // Development only: jump the lap to a fraction, for checking corners.
    if (import.meta.env.DEV)
      Object.assign(window, {
        __droneSeek: (fraction: number) => {
          t = rig.timeAt(followRef.current, fraction);
          rig.cut();
        },
      });
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
    // HUD refs are stable; the rig changes with the track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rig, track]);

  return (
    <div className={`drone ${phase}${ready ? " ready" : ""}`}>
      <div className="drone-map" ref={host} />
      <div className="drone-grade" aria-hidden="true" />
      <Atmosphere phase={phase} className="drone-atmosphere" layers="sky" />
      <div className="drone-hud">
        <div className="seg drone-follow" role="group" aria-label="Car to follow">
          {classOrder.map((cls) => (
            <button
              key={cls}
              aria-pressed={follow === cls}
              style={{ "--cls": classInfo[cls].color } as React.CSSProperties}
              onClick={() => setFollow(cls)}
            >
              <i className="dot" />
              {cls}
            </button>
          ))}
        </div>
        <div className="drone-readout" aria-live="off">
          <strong>
            <b ref={hud.speed}>0</b>
            <small>km/h, modelled</small>
          </strong>
          <span className="drone-sector" ref={hud.sector}>
            {sections[0].name}
          </span>
          <dl className="drone-meta">
            <div>
              <dt>Lap time</dt>
              <dd ref={hud.lap}>0:00.0</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>
                <span ref={hud.km}>0.00</span> of {(track.length / 1000).toFixed(2)} km
              </dd>
            </div>
          </dl>
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
          Aerial imagery © IGN BD ORTHO. Track © OpenStreetMap contributors.
          The lap, the driving line and the cars are modelled, not telemetry.
        </p>
      </div>
    </div>
  );
}

export default function DroneView() {
  const { track, error } = useTrack({ context: false });
  if (error)
    return <div className="drone drone-fallback">The aerial view could not load.</div>;
  if (!track) return <div className="drone drone-fallback">Loading the aerial view…</div>;
  return <Drone track={track} />;
}
