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
import {
  ArrowUpRight,
  Eye,
  Map as MapIcon,
  Moon,
  Pause,
  Play,
  Sun,
  Video,
  RotateCcw,
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

function LapReadout({ store, follow }: { store: LapStore; follow: ClassName }) {
  const tick = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const section = tick
    ? sections.find((s) => tick.fraction >= s.from && tick.fraction < s.to)
    : null;
  return (
    <>
      <div className="hud-speed">
        <strong>{tick ? Math.round(tick.speed) : "—"}</strong>
        <span>
          km/h<small>Modelled speed</small>
        </span>
      </div>
      <div className="hud-bar">
        <i
          style={{
            width: `${(tick?.fraction ?? 0) * 100}%`,
            background: lapTargets[follow].color,
          }}
        />
      </div>
      <div className="hud-row">
        <span>
          Lap <strong>{tick ? fmt(tick.elapsed) : "0:00.0"}</strong>
        </span>
        <span>
          Model lap <strong>{tick ? fmt(tick.lap) : "—"}</strong>
        </span>
      </div>
      <div className="hud-section" style={{ color: section?.color }}>
        {section?.name ?? "—"}
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
  const [night, setNight] = useState(false);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [timeScale, setTimeScale] = useState(4);
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
      <section className="circuit-stage">
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
          <span className="kicker">
            {circuit.location} · {geographic ? "Geographic atlas" : "Lap study"}
          </span>
          <h1>
            Circuit de la <em>Sarthe</em>
          </h1>
          <div className="circuit-stats">
            <span>
              <strong>{circuit.length}</strong> km
            </span>
            <span>
              <strong>{circuit.corners}</strong> corners
            </span>
            <span>
              <strong>≈⅔</strong> public roads
            </span>
          </div>
        </div>

        <div
          className="circuit-presentation"
          role="group"
          aria-label="Circuit presentation"
        >
          <button
            aria-pressed={geographic}
            className={geographic ? "on" : ""}
            onClick={() => {
              setGeographic(true);
              setPitFocused(false);
              setCam("overview");
            }}
          >
            <MapIcon size={13} /> Aerial atlas
          </button>
          <button
            aria-pressed={!geographic}
            className={!geographic ? "on" : ""}
            onClick={() => {
              setGeographic(false);
              setPitFocused(false);
              setCam("overview");
            }}
          >
            <Video size={13} /> Driving study
          </button>
        </div>

        <div className="hud" aria-live="off">
          <span className="hud-caption">Lap simulation · follow a class</span>
          <div className="hud-class" role="group" aria-label="Follow class">
            {classOrder.map((c) => (
              <div
                key={c}
                className="hud-class-control"
                style={{ "--cls": lapTargets[c].color } as React.CSSProperties}
              >
                <button
                  aria-pressed={follow === c}
                  className={follow === c ? "on" : ""}
                  onClick={() => chooseClass(c)}
                >
                  <i className="dot" />
                  {c}
                </button>
                <label title={`Show or hide ${c} car`}>
                  <input
                    type="checkbox"
                    aria-label={`Show ${c} car`}
                    checked={visible[c]}
                    onChange={(e) =>
                      setVisible((current) => ({
                        ...current,
                        [c]: e.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <LapReadout store={telemetry} follow={follow} />
        </div>

        <div
          className="circuit-tools"
          role="toolbar"
          aria-label="Circuit view options"
        >
          <button
            className={`tool ${playing ? "on" : ""}`}
            onClick={() => setPlaying(!playing)}
            aria-pressed={playing}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            <span>{playing ? "Pause" : "Play"}</span>
          </button>
          <div className="seg small" role="group" aria-label="Speed">
            {[1, 4, 16].map((s) => (
              <button
                key={s}
                aria-pressed={timeScale === s}
                className={timeScale === s ? "on" : ""}
                onClick={() => setTimeScale(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            className={`tool ${cam === "follow" ? "on" : ""}`}
            onClick={() => {
              setPitFocused(false);
              setCam(cam === "follow" ? "overview" : "follow");
            }}
            aria-pressed={cam === "follow"}
          >
            {cam === "follow" ? <MapIcon size={16} /> : <Video size={16} />}
            <span>{cam === "follow" ? "Overview" : "Chase cam"}</span>
          </button>
          <button
            className={`tool ${mode === "speed" ? "on" : ""}`}
            onClick={() => setMode(mode === "speed" ? "sections" : "speed")}
            aria-pressed={mode === "speed"}
          >
            <Eye size={16} />
            <span>{mode === "speed" ? "Speed map" : "Sections"}</span>
          </button>
          <button
            className="tool"
            aria-label="Reset to circuit overview"
            title="Reset camera"
            onClick={resetView}
          >
            <RotateCcw size={16} />
            <span>Reset view</span>
          </button>
          <button
            className={`tool ${night ? "on" : ""}`}
            onClick={() => setNight(!night)}
            aria-pressed={night}
            aria-label={
              geographic
                ? night
                  ? "Brighten aerial imagery"
                  : "Dim aerial imagery"
                : night
                  ? "Switch to day lighting"
                  : "Switch to night lighting"
            }
          >
            {night ? <Moon size={16} /> : <Sun size={16} />}
            <span>
              {geographic
                ? night
                  ? "Dimmed"
                  : "Day image"
                : night
                  ? "Night"
                  : "Day"}
            </span>
          </button>
        </div>

        {mode === "speed" && (
          <div className="speed-legend" aria-label="Speed colours">
            <span>80 km/h</span>
            <i />
            <span>330 km/h</span>
          </div>
        )}

        <p className="circuit-hint" hidden={Boolean(cornerData)}>
          {cam === "follow"
            ? `Following ${follow} · switch to Overview to explore`
            : geographic
              ? touch
                ? "Drag to pan · two-finger drag to tilt · tap a corner"
                : "Drag to pan · right-drag to tilt · select a corner"
              : touch
                ? "Drag to orbit · pinch to zoom · tap a corner"
                : "Drag to orbit · scroll to zoom · select a corner"}
        </p>
        {cornerData && (
          <div
            className="corner-card"
            role="region"
            aria-label={`${cornerData.name} corner guide`}
          >
            <button
              className="close"
              aria-label="Close corner"
              onClick={() => pickCorner(null)}
            >
              ×
            </button>
            <span className="kicker">
              Turn {cornerData.number} · {cornerData.direction}-hander
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
          <span className="kicker">Lap guide</span>
          <h2>Six parts of one lap</h2>
          <p className="guide-intro">
            From the first braking zone to the final chicane. Select a numbered
            corner to explore its place in the lap. The dashed gold route shows
            the pit entry, lane and exit; use Pit lane in the atlas to inspect
            it.
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
            Corner positions: OpenStreetMap via track-atlas. The car animation
            is a braking and acceleration model calibrated to typical lap times
            for each class (
            {classOrder.map((c) => `${c} ${fmt(lapTargets[c].lap)}`).join(", ")}
            ), not telemetry. The aerial atlas uses IGN orthophotography,
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
              <span className="sec-no">{String(i + 1).padStart(2, "0")}</span>
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
                className={corner === c.name ? "on" : ""}
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
