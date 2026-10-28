import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  Box,
  Disc3,
  Eye,
  Layers,
  Moon,
  Palette,
  Pause,
  Play,
  Crosshair,
  RotateCcw,
  Ruler,
  ScanEye,
  Sun,
  Search,
  Maximize,
  Minimize,
  X,
  MousePointer2,
  PackageOpen,
} from "lucide-react";
import { carById, cars, classInfo, classOrder } from "../data/cars.ts";
import type { Car, ClassName } from "../data/cars.ts";
import { classPanel, entriesFor, surname } from "../data/entries.ts";
import type { Entry } from "../data/entries.ts";
import { exteriorReferences } from "../data/references.ts";
import {
  platformLabel,
  ruleFor,
  ruleInfo,
  specsFor,
  systems,
  systemsFor,
} from "../data/systems.ts";
import type { Group, Rule, SystemId } from "../data/systems.ts";
import { presets, isInspectionPreset } from "../three/cameraPresets.ts";
import { LAYER_STAGES, stageAt } from "../three/layerPlan.ts";
import {
  createBuildClock,
  isStudioMode,
  liveryApplied,
} from "../three/teardown.ts";
import type { StudioMode } from "../three/teardown.ts";
import { TeardownBar } from "../components/TeardownBar.tsx";
import {
  engineeringDetailsFor,
  carEngineeringSummary,
} from "../data/engineeringDetails.ts";
import EngineeringDetailPanel from "../components/EngineeringDetailPanel.tsx";
import type { Preset } from "../three/cameraPresets.ts";
import type { PaintMode } from "../three/livery.ts";
import { linkProps, navigate } from "../router.ts";
import Silhouette from "../components/Silhouette.tsx";
import { useFonts } from "../components/useFonts.ts";
import { useCoarsePointer } from "../components/useCoarsePointer.ts";
import ExteriorViewer from "../ExteriorViewer.tsx";
import ExteriorFilm from "../components/ExteriorFilm.tsx";
import { exteriorTuning, materialRecipeFor } from "../data/exteriorTuning.ts";
import "../Explorer.css";

const CarScene = lazy(() =>
  import("../three/CarScene.tsx").then((module) => ({
    default: module.CarScene,
  })),
);

const internal: SystemId[] = [
  "chassis",
  "engine",
  "hybrid",
  "gearbox",
  "cooling",
  "cockpit",
  "fuel",
  "suspension",
  "brakes",
];
const groups: Group[] = [
  "Aerodynamics",
  "Structure",
  "Powertrain",
  "Chassis",
  "Driver & systems",
];

type Tab = "part" | "car" | "entry";

function Toggle({
  on,
  onClick,
  label,
  icon,
  kbd,
  disabled = false,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  kbd?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`tool ${on ? "on" : ""}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      title={kbd ? `${label} (${kbd})` : label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function Explorer({ params }: { params: URLSearchParams }) {
  const car: Car = carById(params.get("car")) ?? cars[0];
  const list = entriesFor(car.id);
  const entry: Entry =
    list.find((e) => e.number === params.get("entry")) ?? list[0];
  const fonts = useFonts();
  const touch = useCoarsePointer();
  const ref = exteriorReferences[car.id];
  const startExploded = Math.min(1, Math.max(0, Number(params.get("x")) || 0));
  const startStudio: StudioMode = isStudioMode(params.get("view"))
    ? (params.get("view") as StudioMode)
    : "cutaway";
  const defaultExterior =
    Boolean(ref) &&
    params.get("view") !== "study" &&
    startStudio === "cutaway" &&
    startExploded <= 0;
  const [studio, setStudio] = useState<StudioMode>(startStudio);
  const [clock] = useState(() => {
    const created = createBuildClock(startStudio === "build" ? 0 : 1);
    if (startStudio === "build") created.play();
    return created;
  });
  const livery = useSyncExternalStore(clock.subscribe, () =>
    liveryApplied(clock.get()),
  );
  const [selected, setSelected] = useState<SystemId | null>(null);
  const [hovered, setHovered] = useState<SystemId | null>(null);
  const [exploded, setExploded] = useState(startExploded);
  const [xray, setXray] = useState(false);
  const [bodyRemoved, setBodyRemoved] = useState(false);
  const [wheelsRemoved, setWheelsRemoved] = useState(false);
  const [sectioned, setSectioned] = useState(false);
  const [rules, setRules] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dims, setDims] = useState(false);
  const [spin, setSpin] = useState(false);
  const [night, setNight] = useState(false);
  const [preset, setPreset] = useState<Preset>("three");
  const [nonce, setNonce] = useState(0);
  const [paint, setPaint] = useState<PaintMode>("livery");
  const [tab, setTab] = useState<Tab>(defaultExterior ? "car" : "part");
  const [exterior, setExterior] = useState(defaultExterior);
  const [showArtistFilm, setShowArtistFilm] = useState(false);
  const showingFilm = exterior && Boolean(ref?.film) && showArtistFilm;
  const [query, setQuery] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const visibleCars = cars.filter(
    (c) =>
      c.category === car.category &&
      `${c.make} ${c.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stageRef.current?.requestFullscreen();
  };

  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  const go = (c: Car, e?: Entry) => {
    if (c.category !== car.category) setQuery("");
    if (e) setExterior(false);
    navigate(
      "car",
      { car: c.id, entry: e?.number, view: e ? "study" : undefined },
      true,
    );
  };

  const switchViewer = (detailed: boolean) => {
    setExterior(detailed);
    if (detailed) setShowArtistFilm(false);
    setTab(detailed ? "car" : "part");
    navigate(
      "car",
      {
        car: car.id,
        entry: params.get("entry") ?? undefined,
        view: detailed ? undefined : "study",
      },
      true,
    );
  };

  const urlView = params.get("view");
  useEffect(() => {
    if (studio === "cutaway" && isStudioMode(urlView) && urlView !== "cutaway")
      navigate(
        "car",
        { car: car.id, entry: params.get("entry") ?? undefined, view: "study" },
        true,
      );
  }, [studio, urlView, car.id, params]);

  const enterStudio = (mode: StudioMode) => {
    setStudio(mode);
    setExterior(false);
    setSpin(false);
    setExploded(0);
    setXray(false);
    setBodyRemoved(false);
    setWheelsRemoved(false);
    setSectioned(false);
    setFocus(false);
    setDims(false);
    setSelected(null);
    setPreset("three");
    setNonce((n) => n + 1);
    if (mode === "build") {
      clock.set(0);
      clock.play();
    } else clock.pause();
    navigate(
      "car",
      {
        car: car.id,
        entry: params.get("entry") ?? undefined,
        view: mode === "cutaway" ? "study" : mode,
      },
      true,
    );
  };

  const select = (id: SystemId) => {
    setSelected(id);
    setTab("part");
    setExterior(false);
    if (internal.includes(id) && exploded < 0.3) setXray(true);
    if (id === "body") {
      setXray(false);
      setBodyRemoved(false);
    }
    if (id === "wheels") setWheelsRemoved(false);
  };
  const chooseView = useCallback((view: Preset) => {
    setStudio("cutaway");
    setExterior(false);
    setPreset(view);
    setNonce((n) => n + 1);
    setSpin(false);
    stageRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    if (isInspectionPreset(view)) {
      // Keep the layer the visitor is already on: the inspection cameras read
      // the same stage weights as the parts, so switching view mid-teardown
      // must not silently re-assemble the car.
      setBodyRemoved(true);
      setSectioned(false);
      setWheelsRemoved(view === "running" || view === "powertrain");
      setXray(false);
      setRules(false);
      setFocus(false);
      setSelected(
        view === "cockpit" || view === "pedals"
          ? "cockpit"
          : view === "powertrain"
            ? "engine"
            : "suspension",
      );
      setTab("part");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input, select, textarea, [contenteditable=true]") ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey)
      )
        return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      const index = k === "0" ? 9 : Number(k) - 1;
      if (/^[0-9]$/.test(k) && index >= 0 && index < presets.length) {
        chooseView(presets[index].id);
      } else if (["x", "r", "d", "t", "e"].includes(k)) {
        setExterior(false);
        if (k === "x") setXray((v) => !v);
        else if (k === "r") setRules((v) => !v);
        else if (k === "d") setDims((v) => !v);
        else if (k === "t") setSpin((v) => !v);
        else
          setExploded((v) => {
            const next = LAYER_STAGES.find((s) => s.at > v + 0.001);
            return next ? next.at : 0;
          });
      } else if (k === "escape") {
        setSelected(null);
        setFocus(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooseView]);

  const sys = selected ? systems.find((s) => s.id === selected)! : null;
  const available = systemsFor(car);
  const rulesUsed = [
    ...new Set(available.map((s) => ruleFor(car, s.id))),
  ] as Rule[];
  const hoverName = hovered
    ? systems.find((s) => s.id === hovered)?.name
    : null;
  const cls = classInfo[car.category];
  const stage = stageAt(exploded);

  return (
    <main
      className={`explorer ${exterior ? "exterior-mode" : "study-mode"}`}
      style={{ "--cls": cls.color } as React.CSSProperties}
    >
      <aside className="ex-left" aria-label="Choose a car and a system">
        <div className="seg full" role="group" aria-label="Class">
          {classOrder.map((c: ClassName) => (
            <button
              key={c}
              aria-pressed={car.category === c}
              className={car.category === c ? "on" : ""}
              style={{ "--cls": classInfo[c].color } as React.CSSProperties}
              onClick={() => go(cars.find((x) => x.category === c)!)}
            >
              <i className="dot" />
              {c}
            </button>
          ))}
        </div>
        <div className="ex-section-heading">
          <span className="kicker">The garage</span>
          <span>
            {cars.filter((c) => c.category === car.category).length} cars
          </span>
        </div>
        <label className="garage-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Find a car"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cars in this class"
          />
        </label>
        <div className="car-list">
          {visibleCars.map((c) => {
            const e = entriesFor(c.id)[0];
            return (
              <button
                key={c.id}
                className={c.id === car.id ? "on" : ""}
                onClick={() => go(c)}
                aria-current={c.id === car.id}
              >
                <span
                  className="chip"
                  style={{
                    background: `linear-gradient(135deg, ${e.livery.base} 55%, ${e.livery.accent} 55%)`,
                  }}
                />
                <span>
                  <small>{c.make}</small>
                  {c.name}
                </span>
              </button>
            );
          })}
          {!visibleCars.length && (
            <p className="garage-empty">No cars match “{query}”.</p>
          )}
        </div>
        <div className="parts-head">
          <span>Systems</span>
          <span>{available.length}</span>
        </div>
        <div className="parts">
          {groups.map((g) => {
            const items = available.filter((s) => s.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="part-group">
                <span className="group-label">{g}</span>
                {items.map((s) => {
                  const r = ruleFor(car, s.id);
                  return (
                    <button
                      key={s.id}
                      className={`part-btn ${selected === s.id ? "on" : ""} ${hovered === s.id ? "hover" : ""}`}
                      onClick={() => select(s.id)}
                      onMouseEnter={() => setHovered(s.id)}
                      onMouseLeave={() => setHovered(null)}
                      aria-pressed={selected === s.id}
                    >
                      <i
                        className="rule-dot"
                        style={{
                          background: rules ? ruleInfo[r].color : undefined,
                        }}
                      />
                      {s.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      <section
        ref={stageRef}
        className={`ex-stage ${fullscreen ? "is-fullscreen" : ""}`}
        aria-label={`3D model of the ${car.make} ${car.name}`}
      >
        <div className="stage-top">
          <div className="stage-title">
            <span
              className="plate"
              style={{ background: classPanel[car.category] }}
            >
              {exterior
                ? car.category === "LMGT3"
                  ? "GT"
                  : car.category === "LMP2"
                    ? "P2"
                    : "H"
                : entry.number}
            </span>
            <div>
              <span className="viewer-eyebrow">
                {exterior
                  ? showingFilm
                    ? "Artist studio film · 2026 race model"
                    : "Detailed exterior · original model livery"
                  : "Interactive engineering study"}
              </span>
              <h1>
                {car.make} <strong>{car.name}</strong>
              </h1>
              <span>
                {exterior && ref
                  ? showingFilm
                    ? "Original render by OpticalDreamSoft"
                    : ref.assetLabel
                  : `${entry.team} · ${platformLabel(car)}`}
              </span>
            </div>
          </div>
          <div className="viewer-navigation">
            {ref && (
              <div
                className="model-mode-switch"
                role="group"
                aria-label="Model presentation"
              >
                <button
                  className={exterior ? "on" : ""}
                  aria-pressed={exterior}
                  onClick={() => switchViewer(true)}
                >
                  <Eye size={14} /> Detailed exterior
                </button>
                <button
                  className={!exterior ? "on" : ""}
                  aria-pressed={!exterior}
                  onClick={() => switchViewer(false)}
                >
                  <Box size={14} /> Engineering cutaway
                </button>
              </div>
            )}
            {exterior && ref.film && (
              <button
                className="geometry-choice"
                aria-pressed={showArtistFilm}
                onClick={() => setShowArtistFilm(!showArtistFilm)}
              >
                {showArtistFilm ? "Interactive exterior" : "Artist studio film"}{" "}
                <ArrowUpRight size={12} />
              </button>
            )}
            {!exterior && (
              <div
                className="studio-modes"
                role="group"
                aria-label="Teardown studio"
              >
                {(
                  [
                    ["cutaway", "Cutaway"],
                    ["garage", "Garage"],
                    ["build", "Build"],
                    ["tunnel", "Wind tunnel"],
                  ] as [StudioMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    className={studio === mode ? "on" : ""}
                    aria-pressed={studio === mode}
                    onClick={() => enterStudio(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!exterior && studio === "cutaway" && (
              <div className="views" role="toolbar" aria-label="Camera views">
                {[
                  presets[0],
                  ...presets.filter((p) => isInspectionPreset(p.id)),
                  ...presets.slice(1, 6),
                ].map((p) => (
                  <button
                    key={p.id}
                    className={preset === p.id ? "on" : ""}
                    onClick={() => chooseView(p.id)}
                    title={`${p.label} view (${p.id === "running" ? 0 : presets.findIndex((view) => view.id === p.id) + 1})`}
                    aria-label={`${p.label} camera view`}
                    aria-pressed={preset === p.id}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="stage-canvas">
          {exterior && ref ? (
            <div className="embed-wrap">
              {showingFilm && ref.film ? (
                <ExteriorFilm film={ref.film} />
              ) : (
                <ExteriorViewer
                  key={ref.id}
                  id={ref.id}
                  title={`${car.make} ${car.name} detailed exterior model`}
                  poster={ref.poster}
                  materialOverrides={materialRecipeFor(ref.id)}
                  {...exteriorTuning[ref.id]}
                  onFallback={() => switchViewer(false)}
                />
              )}
              <div className="embed-credit">
                Model hosted by{" "}
                <a
                  href={
                    (showingFilm ? ref.film?.sourceUrl : undefined) ??
                    ref.sourceUrl ??
                    `https://sketchfab.com/3d-models/${ref.id}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {showingFilm ? ref.film?.author : ref.author}
                </a>{" "}
                · {showingFilm ? ref.film?.note : ref.note}
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="study-loading">
                  Preparing the engineering view…
                </div>
              }
            >
              <CarScene
                car={car}
                entry={entry}
                paint={
                  studio === "garage" || (studio === "build" && !livery)
                    ? "clay"
                    : paint
                }
                studio={studio}
                clock={clock}
                selected={selected}
                hovered={hovered}
                onSelect={select}
                onHover={setHovered}
                exploded={exploded}
                xray={xray}
                bodyRemoved={bodyRemoved}
                wheelsRemoved={wheelsRemoved}
                sectioned={sectioned}
                rules={rules}
                focus={focus}
                dims={dims}
                spin={spin}
                onInteraction={() => setSpin(false)}
                preset={preset}
                presetNonce={nonce}
                night={night}
                fontsReady={fonts}
              />
            </Suspense>
          )}
          {hoverName && !exterior && (
            <div className="hover-chip">{hoverName}</div>
          )}
          {rules && !exterior && (
            <div className="legend" aria-label="Rule colour legend">
              {rulesUsed.map((r) => (
                <span key={r} title={ruleInfo[r].text}>
                  <i style={{ background: ruleInfo[r].color }} />
                  {ruleInfo[r].label}
                </span>
              ))}
            </div>
          )}
          {!exterior && (
            <div className="viewer-hint">
              <MousePointer2 size={13} />
              <span>
                {touch
                  ? "Drag to orbit · pinch to zoom · tap to inspect"
                  : "Drag to orbit · scroll to zoom · click to inspect"}
              </span>
            </div>
          )}
          {!exterior && studio === "cutaway" && (
            <div className="tools" role="toolbar" aria-label="View options">
              <Toggle
                on={rules}
                onClick={() => setRules(!rules)}
                label="Rule colours"
                icon={<Palette size={16} />}
                kbd="R"
              />
              <Toggle
                on={bodyRemoved}
                onClick={() => setBodyRemoved(!bodyRemoved)}
                label="Remove bodywork"
                icon={<Layers size={16} />}
              />
              <Toggle
                on={wheelsRemoved}
                onClick={() => setWheelsRemoved(!wheelsRemoved)}
                label="Remove wheels"
                icon={<Disc3 size={16} />}
              />
              <Toggle
                on={sectioned}
                onClick={() => setSectioned(!sectioned)}
                label="Open housings"
                icon={<PackageOpen size={16} />}
              />
              <Toggle
                on={xray}
                onClick={() => setXray(!xray)}
                label="X-ray"
                icon={<ScanEye size={16} />}
                kbd="X"
              />
              <Toggle
                on={focus}
                onClick={() => setFocus(!focus)}
                label="Isolate part"
                icon={<Crosshair size={16} />}
                disabled={!selected}
              />
              <Toggle
                on={dims}
                onClick={() => setDims(!dims)}
                label="Dimensions"
                icon={<Ruler size={16} />}
                kbd="D"
              />
              <Toggle
                on={spin}
                onClick={() => setSpin(!spin)}
                label="Turntable"
                icon={spin ? <Pause size={16} /> : <Play size={16} />}
                kbd="T"
              />
              <Toggle
                on={night}
                onClick={() => setNight(!night)}
                label={night ? "Night" : "Day"}
                icon={night ? <Moon size={16} /> : <Sun size={16} />}
              />
              <button
                className="tool"
                onClick={() => {
                  setExterior(false);
                  setSpin(false);
                  setNight(false);
                  setPaint("livery");
                  setHovered(null);
                  setExploded(0);
                  setXray(false);
                  setBodyRemoved(false);
                  setWheelsRemoved(false);
                  setSectioned(false);
                  setRules(false);
                  setFocus(false);
                  setDims(false);
                  setSelected(null);
                  setPreset("three");
                  setNonce((n) => n + 1);
                }}
                title="Reset"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </div>
          )}
          {document.fullscreenEnabled && (
            <button
              className="viewer-fullscreen"
              onClick={() => {
                void toggleFullscreen().catch(() => {});
              }}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          )}
        </div>
        {!exterior && studio !== "cutaway" && (
          <div className="stage-bottom">
            <TeardownBar
              mode={studio}
              car={car}
              clock={clock}
              onBuild={() => enterStudio("build")}
            />
          </div>
        )}
        {!exterior && studio === "cutaway" && (
          <div className="stage-bottom">
            <div className="layer-control">
              <label className="explode">
                <Layers size={16} />
                <span>Lift layers</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={exploded}
                  onChange={(e) => {
                    setExploded(Number(e.target.value));
                    setExterior(false);
                  }}
                  aria-label="Lift layers"
                  aria-valuetext={`Stage ${stage.stage} of ${LAYER_STAGES.length - 1}: ${stage.label}. ${stage.detail}`}
                />
                <output>{stage.short}</output>
              </label>
              <div
                className="layer-steps"
                role="group"
                aria-label="Lift stages"
              >
                {LAYER_STAGES.map((s) => (
                  <button
                    key={s.stage}
                    className={Math.abs(exploded - s.at) < 0.005 ? "on" : ""}
                    aria-pressed={Math.abs(exploded - s.at) < 0.005}
                    title={s.detail}
                    onClick={() => {
                      setExploded(s.at);
                      setExterior(false);
                    }}
                  >
                    {s.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="seg small" role="group" aria-label="Finish">
              {(
                [
                  ["livery", "Livery"],
                  ["carbon", "Carbon"],
                  ["clay", "Clay"],
                ] as [PaintMode, string][]
              ).map(([m, l]) => (
                <button
                  key={m}
                  aria-pressed={paint === m}
                  className={paint === m ? "on" : ""}
                  onClick={() => {
                    setPaint(m);
                    setExterior(false);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="ex-right" aria-label="Details">
        <div className="seg full" role="group" aria-label="Information panel">
          {(
            [
              ["part", "System"],
              ["car", "Car"],
              ["entry", `#${entry.number}`],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={tab === t ? "on" : ""}
              onClick={() => setTab(t)}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === "part" &&
          (sys ? (
            <div className="detail">
              <span className="kicker">{sys.group}</span>
              <div className="selected-system-heading">
                <h2>{sys.name}</h2>
                <button
                  onClick={() => {
                    setSelected(null);
                    setFocus(false);
                  }}
                  aria-label="Deselect system"
                  title="Deselect system"
                >
                  <X size={17} />
                </button>
              </div>
              <span
                className="rule-badge"
                style={
                  {
                    "--rule": ruleInfo[ruleFor(car, sys.id)].color,
                  } as React.CSSProperties
                }
              >
                <i />
                {ruleInfo[ruleFor(car, sys.id)].label}
              </span>
              {engineeringDetailsFor(car, sys.id) && (
                <EngineeringDetailPanel
                  detail={engineeringDetailsFor(car, sys.id)!}
                  systemId={sys.id}
                  sectioned={sectioned}
                />
              )}
              {specsFor(car, sys.id).length > 0 && (
                <dl className="specs">
                  {specsFor(car, sys.id).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="rule-text">{ruleInfo[ruleFor(car, sys.id)].text}</p>
            </div>
          ) : (
            <div className="detail intro">
              <span className="kicker">{car.category}</span>
              <h2>Look closer.</h2>
              <p>
                Orbit the car to see its shape. Select a component to uncover
                the engineering underneath, or lift the assembly layer by layer
                with the layer control.
              </p>
              <button
                className="inspection-start"
                onClick={() => select("body")}
              >
                <MousePointer2 size={16} /> Inspect the bodywork
              </button>
              <div className="engineering-starts">
                <button onClick={() => chooseView("cockpit")}>
                  Cockpit & controls
                </button>
                <button onClick={() => chooseView("powertrain")}>
                  Powertrain assemblies
                </button>
                <button onClick={() => chooseView("running")}>
                  Wheel-end assembly
                </button>
              </div>
              <p className="viewer-provenance">
                Procedural study with approximate geometry. Use the exterior
                reference where available to compare the real silhouette;
                creator models may show earlier bodywork.
              </p>
              <ul className="shortcuts">
                <li>
                  <kbd>1</kbd>–<kbd>9</kbd> / <kbd>0</kbd> camera views
                </li>
                <li>
                  <kbd>E</kbd> lift stages · <kbd>X</kbd> X-ray
                </li>
                <li>
                  <kbd>R</kbd> rule colours · <kbd>D</kbd> dimensions
                </li>
                <li>
                  <kbd>T</kbd> turntable · <kbd>Esc</kbd> deselect
                </li>
              </ul>
            </div>
          ))}
        {tab === "car" && (
          <div className="detail">
            <span className="kicker">
              {car.category} · since {car.debut}
            </span>
            <h2>
              {car.make} {car.name}
            </h2>
            {exterior && ref && (
              <div className="exterior-specimen-note">
                <span>About the visible model</span>
                <p>{showingFilm ? ref.film?.note : ref.note}</p>
                <small>
                  The technical specifications below describe the selected car
                  family. The exterior keeps its own finish and livery.
                </small>
              </div>
            )}
            <p>{car.summary}</p>
            {!exterior && (
              <div className="engineering-car-summary">
                <h3>Engineering architecture</h3>
                <p>{carEngineeringSummary(car).architecture}</p>
                <p>{carEngineeringSummary(car).suspension}</p>
                <small>{carEngineeringSummary(car).caveat}</small>
              </div>
            )}
            <dl className="specs">
              {(
                [
                  ["Ruleset", platformLabel(car)],
                  ["Engine", car.engine.label],
                  ["Hybrid", car.hybrid ? car.hybrid.label : "None"],
                  ["Gearbox", car.gearbox],
                  ["Chassis", car.chassis],
                  ["Drive", car.drive],
                  ["Tyres", car.tyres],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="note">
              <span>How to spot it</span>
              <ul>
                {car.identify.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <a
              className="text-link"
              href={car.source}
              target="_blank"
              rel="noreferrer"
            >
              Source <ArrowUpRight size={13} />
            </a>
          </div>
        )}
        {tab === "entry" && (
          <div className="detail">
            <span className="kicker">
              {entry.nation} · {car.category}
              {entry.proAm ? " Pro-Am" : ""}
            </span>
            <h2>{entry.team}</h2>
            <div className="crew">
              {entry.drivers.map((d, i) => (
                <div key={d}>
                  <span>{i + 1}</span>
                  {d}
                </div>
              ))}
            </div>
            <div className="palette">
              {[
                entry.livery.base,
                entry.livery.second,
                entry.livery.accent,
              ].map((c, i) => (
                <div key={i}>
                  <i style={{ background: c }} />
                  <code>{c}</code>
                </div>
              ))}
            </div>
            <p className="muted">
              Crew from the provisional entry list V2 (5 May 2026). The colour
              scheme is a study based on this entry, not official artwork.
            </p>
          </div>
        )}
      </aside>

      <section
        className="entries-strip"
        aria-label={`${car.make} ${car.name} entries`}
      >
        <div className="strip-head">
          <span className="kicker">Race entries</span>
          <strong>
            {list.length} {list.length === 1 ? "entry" : "entries"} for the{" "}
            {car.make} {car.name}
          </strong>
          <a
            className="text-link"
            {...linkProps("field", { class: car.category })}
          >
            Whole {car.category} field <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="strip">
          {list.map((e) => (
            <button
              key={e.number}
              className={`strip-card ${e.number === entry.number ? "on" : ""}`}
              onClick={() => go(car, e)}
              aria-pressed={e.number === entry.number}
            >
              <Silhouette car={car} entry={e} />
              <span
                className="plate small"
                style={{ background: classPanel[car.category] }}
              >
                {e.number}
              </span>
              <span className="strip-team">{e.team}</span>
              <span className="strip-crew">
                {e.drivers.map(surname).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
