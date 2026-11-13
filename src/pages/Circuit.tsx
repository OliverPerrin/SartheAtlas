import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  useRef,
  useEffect,
} from "react";
import { isDark, usePhase } from "../data/racePhase.ts";
import {
  ArrowUpRight,
  Box,
  Gauge,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  Video,
  X,
} from "lucide-react";
import { classOrder } from "../data/cars.ts";
import type { ClassName } from "../data/cars.ts";
import { circuit, cornerNotes, lapTargets, sections } from "../data/track.ts";
import { useTrack } from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { createLapStore } from "../data/lapStore.ts";
import type { LapStore } from "../data/lapStore.ts";
import ElevationProfile from "../components/ElevationProfile.tsx";

const TrackScene = lazy(() =>
  import("../three/TrackScene.tsx").then((module) => ({
    default: module.TrackScene,
  })),
);
const CircuitGeoMap = lazy(() => import("../components/CircuitGeoMap.tsx"));
import type { CamMode, ColorMode } from "../three/TrackScene.tsx";
import TrackMap, { namedCorners } from "../components/TrackMap.tsx";
import { useCoarsePointer } from "../components/useCoarsePointer.ts";
import "./Pages.css";
import "./Circuit.css";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

function LapReadout({
  store,
  follow,
  length,
}: {
  store: LapStore;
  follow: ClassName;
  /** Lap length in metres, once the circuit has loaded. */
  length?: number;
}) {
  const tick = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const section = tick
    ? sections.find((s) => tick.fraction >= s.from && tick.fraction < s.to)
    : null;
  return (
    <>
      <div className="hud-speed">
        <strong>{tick ? Math.round(tick.speed) : "0"}</strong>
        <span>km/h, modelled</span>
      </div>
      <div className="hud-bar">
        <i
          style={{
            width: `${(tick?.fraction ?? 0) * 100}%`,
            background: lapTargets[follow].color,
          }}
        />
      </div>
      <dl className="hud-rows">
        <div>
          <dt>Lap time</dt>
          <dd>{tick ? fmt(tick.elapsed) : "0:00.0"}</dd>
        </div>
        <div>
          <dt>Full lap</dt>
          <dd>{tick ? fmt(tick.lap) : fmt(lapTargets[follow].lap)}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>
            {tick && length
              ? ((tick.fraction * length) / 1000).toFixed(2)
              : "0.00"}{" "}
            of {length ? (length / 1000).toFixed(2) : circuit.length} km
          </dd>
        </div>
      </dl>
      <div
        className="hud-section"
        style={{ "--sec": section?.color } as React.CSSProperties}
      >
        {section?.name ?? "Start and finish"}
      </div>
    </>
  );
}

function useVisibleTick<T extends Element = HTMLDivElement>(store: LapStore) {
  const host = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const subscribe = useCallback(
    (listener: () => void) => (visible ? store.subscribe(listener) : () => {}),
    [store, visible],
  );
  const snapshot = useCallback(
    () => (visible ? store.getSnapshot() : null),
    [store, visible],
  );
  return { host, tick: useSyncExternalStore(subscribe, snapshot) };
}
function LiveElevationProfile({
  store,
  focusFraction,
  ...props
}: {
  store: LapStore;
  track: TrackGeo;
  focusFraction: number | null;
  activeCorner: string | null;
  onCorner: (name: string) => void;
  onFraction: (fraction: number) => void;
}) {
  const { host, tick } = useVisibleTick(store);
  return (
    <div ref={host}>
      <ElevationProfile
        {...props}
        activeFraction={focusFraction ?? tick?.fraction ?? null}
      />
    </div>
  );
}
function LiveTrackMap({
  store,
  follow,
  ...props
}: {
  store: LapStore;
  track: TrackGeo;
  follow: ClassName;
  activeCorner?: string;
  onCorner: (name: string) => void;
}) {
  const { host, tick } = useVisibleTick<SVGSVGElement>(store);
  const section = tick
    ? sections.find((s) => tick.fraction >= s.from && tick.fraction < s.to)
    : null;
  return (
    <TrackMap
      viewportRef={host}
      {...props}
      activeSection={section?.id}
      dots={
        tick
          ? [{ fraction: tick.fraction, color: lapTargets[follow].color }]
          : []
      }
    />
  );
}

export default function Circuit() {
  const { track, error } = useTrack();
  const [geographic, setGeographic] = useState(true);
  const [focusFraction, setFocusFraction] = useState<number | null>(null);
  const [mode, setMode] = useState<ColorMode>("sections");
  // The header's time-of-day control lights this page too.
  const night = isDark(usePhase());
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Real time: one second of lap per second on screen.
  const [timeScale, setTimeScale] = useState(1);
  const [cameraReset, setCameraReset] = useState(0);
  const [cam, setCam] = useState<CamMode>("overview");
  const [follow, setFollow] = useState<ClassName>("Hypercar");
  const [corner, setCorner] = useState<string | null>(null);
  const [pitFocused, setPitFocused] = useState(false);
  const touch = useCoarsePointer();
  const [telemetry] = useState(createLapStore);
  const sectionId = useSyncExternalStore(
    telemetry.subscribe,
    telemetry.getSection,
  );
  const [visible, setVisible] = useState<Record<ClassName, boolean>>({
    Hypercar: true,
    LMP2: true,
    LMGT3: true,
  });
  const chooseClass = (cls: ClassName) => {
    setFollow(cls);
    setVisible((current) => ({ ...current, [cls]: true }));
    telemetry.publish(null);
  };
  const onTick = telemetry.publish;
  const focusMap = useCallback(() => {
    setPitFocused(true);
    setCam("overview");
    setCorner(null);
    setFocusFraction(null);
    setPlaying(false);
  }, []);
  const resetView = () => {
    setPitFocused(false);
    setCam("overview");
    setCorner(null);
    setFocusFraction(null);
    setCameraReset((value) => value + 1);
  };
  const pickCorner = (name: string | null) => {
    setPitFocused(false);
    setCorner(name);
    if (name) {
      setFocusFraction(null);
      setCam("overview");
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  };
  const cornerData = useMemo(
    () => track?.corners.find((c) => c.name === corner),
    [track, corner],
  );
  const cornerList = useMemo(() => {
    if (!track) return [];
    const seen = new Set<string>();
    return track.corners.filter((c) => {
      if (!namedCorners.includes(c.number) || seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [track]);

  return (
    <main className="circuit">
      <section
        className={`circuit-stage${cam === "follow" ? " chasing" : ""}${geographic ? "" : " study"}`}
      >
        {error && (
          <div className="scene-error" role="alert">
            The circuit data could not load.
            <button
              className="btn ghost"
              onClick={() => window.location.reload()}
            >
              Reload circuit
            </button>
          </div>
        )}
        {!track && !error && (
          <div className="scene-error">Loading the circuit…</div>
        )}
        {track && (
          <Suspense
            fallback={
              <div className="scene-error">Preparing the circuit view…</div>
            }
          >
            {geographic ? (
              <CircuitGeoMap
                track={track}
                playing={playing}
                timeScale={timeScale}
                follow={follow}
                visible={visible}
                mode={mode}
                cam={cam}
                night={night}
                cameraReset={cameraReset}
                activeCorner={corner}
                focusFraction={focusFraction}
                onCorner={pickCorner}
                onOverview={resetView}
                onMapFocus={focusMap}
                pitFocused={pitFocused}
                onPitLaneClose={() => setPitFocused(false)}
                onTick={onTick}
              />
            ) : (
              <TrackScene
                track={track}
                cameraReset={cameraReset}
                mode={mode}
                night={night}
                playing={playing}
                timeScale={timeScale}
                cam={cam}
                follow={follow}
                activeCorner={corner}
                onCorner={pickCorner}
                onTick={onTick}
                visible={visible}
              />
            )}
          </Suspense>
        )}
        <div className="circuit-title">
          <h1>Circuit de la Sarthe</h1>
          <p>
            {circuit.length} km, {circuit.corners} corners, two-thirds public
            road
          </p>
          <div className="seg small" role="group" aria-label="Circuit view">
            <button
              aria-pressed={geographic}
              onClick={() => {
                setGeographic(true);
                setPitFocused(false);
                setCam("overview");
              }}
            >
              <MapIcon size={14} /> Aerial map
            </button>
            <button
              aria-pressed={!geographic}
              onClick={() => {
                setGeographic(false);
                setPitFocused(false);
                setCam("overview");
              }}
            >
              <Box size={14} /> 3D track
            </button>
          </div>
        </div>

        <div className="hud" aria-live="off">
          <div className="hud-head">
            <span className="label">Follow a class</span>
            <span className="label">On track</span>
          </div>
          <ul className="hud-class">
            {classOrder.map((c) => (
              <li
                key={c}
                className={follow === c ? "on" : ""}
                style={{ "--cls": lapTargets[c].color } as React.CSSProperties}
              >
                <button
                  aria-pressed={follow === c}
                  onClick={() => chooseClass(c)}
                >
                  <i className="dot" />
                  {c}
                </button>
                <input
                  type="checkbox"
                  className="check"
                  aria-label={`Show the ${c} car`}
                  checked={visible[c]}
                  onChange={(e) =>
                    setVisible((current) => ({
                      ...current,
                      [c]: e.target.checked,
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          <LapReadout
            store={telemetry}
            follow={follow}
            length={track?.length}
          />
        </div>

        <div
          className="circuit-tools"
          role="toolbar"
          aria-label="Lap playback and view"
        >
          <button
            className="btn small"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause the lap" : "Play the lap"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play"}
          </button>
          <div className="seg small" role="group" aria-label="Playback speed">
            {[1, 4, 16].map((s) => (
              <button
                key={s}
                aria-pressed={timeScale === s}
                aria-label={s === 1 ? "Real time" : `${s} times real time`}
                onClick={() => setTimeScale(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            className="btn small"
            onClick={() => {
              setPitFocused(false);
              setCam(cam === "follow" ? "overview" : "follow");
            }}
            aria-pressed={cam === "follow"}
          >
            <Video size={16} />
            Follow the car
          </button>
          <button
            className="btn small"
            onClick={() => setMode(mode === "speed" ? "sections" : "speed")}
            aria-pressed={mode === "speed"}
          >
            <Gauge size={16} />
            Colour by speed
          </button>
          <button
            className="btn small icon"
            aria-label="Reset the view"
            title="Reset the view"
            onClick={resetView}
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {mode === "speed" && (
          <div className="speed-legend" aria-label="Speed colours">
            <span>80</span>
            <i />
            <span>340 km/h</span>
          </div>
        )}

        <p className="circuit-hint" hidden={Boolean(cornerData)}>
          {cam === "follow"
            ? `Following the ${follow} car. Turn off Follow the car to explore the map.`
            : geographic
              ? touch
                ? "Drag to pan, drag with two fingers to tilt, tap a corner."
                : "Drag to pan, right-drag to tilt, select a corner."
              : touch
                ? "Drag to orbit, pinch to zoom, tap a corner."
                : "Drag to orbit, scroll to zoom, select a corner."}
        </p>
        {cornerData && (
          <div
            className="corner-card"
            role="region"
            aria-label={`${cornerData.name} corner guide`}
          >
            <button
              className="btn ghost small icon close"
              aria-label="Close the corner guide"
              onClick={() => pickCorner(null)}
            >
              <X size={16} />
            </button>
            <span className="label">
              Turn {cornerData.number}, {cornerData.direction}-hander
            </span>
            <h2>{cornerData.name}</h2>
            {cornerData.official && cornerData.official !== cornerData.name && (
              <em>{cornerData.official}</em>
            )}
            <p>{cornerNotes[cornerData.name] ?? "A key point of the lap."}</p>
          </div>
        )}
      </section>

      {track && (
        <section className="circuit-elevation">
          <LiveElevationProfile
            store={telemetry}
            track={track}
            focusFraction={focusFraction}
            activeCorner={corner}
            onCorner={pickCorner}
            onFraction={(fraction) => {
              setPitFocused(false);
              setFocusFraction(fraction);
              setPlaying(false);
              setCam("overview");
              setCorner(null);
            }}
          />
        </section>
      )}

      <section className="circuit-guide">
        <div className="guide-map">
          <h2>Six parts of one lap</h2>
          <p className="guide-intro">
            From the first braking zone to the final chicane. Select a numbered
            corner to see where it sits in the lap. The dashed gold line is the
            pit lane; choose Pit lane on the aerial map to look at it closely.
          </p>
          {track && (
            <LiveTrackMap
              store={telemetry}
              track={track}
              activeCorner={corner ?? undefined}
              onCorner={pickCorner}
              follow={follow}
            />
          )}
          <p className="muted">
            Corner positions: OpenStreetMap via track-atlas. The cars follow an
            illustrative driving line kept within about three metres of the
            mapped centreline. Their speed comes from a lap model of grip,
            downforce, power, drag and braking for each class, trimmed to a
            typical race lap (
            {classOrder.map((c) => `${c} ${fmt(lapTargets[c].lap)}`).join(", ")}
            ). It is not telemetry. The aerial atlas uses IGN orthophotography,
            sourced terrain and mapped building footprints.{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap contributors <ArrowUpRight size={12} />
            </a>
          </p>
        </div>
        <div className="guide-sections">
          {sections.map((s, i) => (
            <article
              key={s.id}
              className={sectionId === s.id ? "on" : ""}
              style={{ "--sec": s.color } as React.CSSProperties}
            >
              <span className="sec-no">{i + 1}</span>
              <div>
                <h3>{s.name}</h3>
                <p>{s.text}</p>
              </div>
            </article>
          ))}
          <h3 className="corners-title">Corners</h3>
          <div className="corner-chips">
            {cornerList.map((c) => (
              <button
                key={c.number}
                aria-pressed={corner === c.name}
                onClick={() => pickCorner(c.name)}
              >
                <span>{c.number}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
