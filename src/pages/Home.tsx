import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Scan,
} from "lucide-react";
import { carById, cars, classInfo, classOrder } from "../data/cars.ts";
import type { Car } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { circuit } from "../data/track.ts";
import { linkProps } from "../router.ts";
import { exteriorReferences } from "../data/references.ts";
import CarPreview from "../components/CarPreview.tsx";
import StudyImage from "../components/StudyImage.tsx";
import { useCountUp, useScrollProgress } from "../motion.ts";
import {
  phasePhotos,
  photos,
  photoSrc,
  photoSrcSet,
} from "../data/photos.ts";
import type { Photo } from "../data/photos.ts";
import { phaseInfo, phases, usePhase } from "../data/racePhase.ts";
import type { Phase } from "../data/racePhase.ts";
import Atmosphere from "../components/Atmosphere.tsx";
import PhaseSwitch from "../components/PhaseSwitch.tsx";
import { phaseIcon } from "../components/phaseIcon.ts";
import "./Home.css";

const FeaturedExterior = lazy(
  () => import("../components/FeaturedExterior.tsx"),
);
const DroneView = lazy(() => import("../components/DroneView.tsx"));
const featured = ["50", "7", "12", "15", "93", "009", "22", "91"];

const pad = (n: number) => String(n).padStart(2, "0");
const powertrain = (car: Car) =>
  `${car.engine.litres.toFixed(1)} L ${car.engine.config === "F" ? "flat-" : car.engine.config}${car.engine.cylinders}${car.hybrid ? " + hybrid" : ""}`;
const plateFor = (car: Car) =>
  car.category === "LMGT3" ? "GT" : car.category === "LMP2" ? "P2" : "H";

/** Two-line headline whose lines rise out of their own masks. */
function Lines({
  as: Tag = "h2",
  lines,
  className = "",
}: {
  as?: "h1" | "h2";
  lines: React.ReactNode[];
  className?: string;
}) {
  return (
    <Tag className={`lines ${className}`} data-reveal>
      {lines.map((line, index) => (
        <span
          key={index}
          className="line"
          style={{ "--l": index } as React.CSSProperties}
        >
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

function Stat({
  value,
  decimals = 0,
  label,
  note,
  index,
}: {
  value: number;
  decimals?: number;
  label: string;
  note: string;
  index: number;
}) {
  const [ref, shown] = useCountUp(value, decimals);
  return (
    <div
      className="stat"
      data-reveal
      style={{ "--d": index } as React.CSSProperties}
    >
      <span className="stat-index">{pad(index + 1)}</span>
      <strong ref={ref as React.RefObject<HTMLElement>}>{shown}</strong>
      <span className="stat-label">{label}</span>
      <span className="stat-note">{note}</span>
    </div>
  );
}

function Marquee({
  items,
  reverse = false,
  variant,
}: {
  items: string[];
  reverse?: boolean;
  variant: "solid" | "outline";
}) {
  const run = (
    <span className="marquee-run">
      {items.map((item) => (
        <span key={item}>
          {item}
          <i aria-hidden="true">✦</i>
        </span>
      ))}
    </span>
  );
  return (
    <div
      className={`marquee ${variant}${reverse ? " reverse" : ""}`}
      aria-hidden="true"
    >
      <div className="marquee-track">
        {run}
        {run}
      </div>
    </div>
  );
}

const manifesto =
  "Sixty-two cars. Three classes. One ribbon of road, two-thirds of it public. Sarthe Atlas takes the machines apart, labels every system and lays the circuit over real aerial imagery, so you can see what twenty-four hours at the limit actually demands.";

function Manifesto() {
  const ref = useScrollProgress<HTMLParagraphElement>();
  const words = manifesto.split(" ");
  return (
    <p
      className="manifesto"
      ref={ref}
      style={{ "--n": words.length } as React.CSSProperties}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={{ "--i": index } as React.CSSProperties}
          className={/^(Sixty-two|Three|One|twenty-four)/.test(word) ? "hl" : undefined}
        >
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

function Garage() {
  const outer = useScrollProgress<HTMLElement>("pinned");
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = outer.current;
    const rail = track.current;
    if (!section || !rail || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const distance = Math.max(0, rail.scrollWidth - innerWidth);
      section.style.setProperty("--dist", `${distance}px`);
      section.style.setProperty("--pin", `${distance}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
    };
  }, [outer]);
  return (
    <section className="garage" ref={outer} aria-labelledby="garage-title">
      <div className="garage-sticky">
        <div className="garage-head">
          <span className="eyebrow">04 / The grid</span>
          <h2 id="garage-title">
            {cars.length} families. <em>One grid.</em>
          </h2>
          <div className="garage-progress" aria-hidden="true">
            <i />
          </div>
          <a className="garage-all" {...linkProps("field", { view: "cars" })}>
            All car models <ArrowRight size={15} />
          </a>
        </div>
        <div className="garage-track" ref={track}>
          {cars.map((car, index) => (
            <a
              key={car.id}
              className="garage-card"
              data-cursor="Open"
              style={{ "--cls": classInfo[car.category].color } as React.CSSProperties}
              {...linkProps("car", { car: car.id })}
            >
              <div className="garage-media">
                <StudyImage
                  car={car.id}
                  alt={`${car.make} ${car.name} engineering study, three-quarter view`}
                />
                <span className="garage-tag">Sarthe Atlas study</span>
              </div>
              <div className="garage-meta">
                <span className="garage-index">
                  {pad(index + 1)} / {pad(cars.length)}
                </span>
                <span className="cls-tag">{car.category}</span>
              </div>
              <h3>
                <small>{car.make}</small>
                {car.name}
              </h3>
              <p>
                {car.engine.label}
                {car.hybrid ? " · hybrid" : ""}
              </p>
            </a>
          ))}
          <a className="garage-card garage-end" {...linkProps("field")}>
            <span>See the whole field</span>
            <strong>{entries.length} entries</strong>
            <ArrowUpRight size={30} />
          </a>
        </div>
      </div>
    </section>
  );
}


/** A full-bleed photograph with its attribution kept beside it. */
function PhotoImg({
  photo,
  className = "",
  sizes = "100vw",
  priority = false,
}: {
  photo: Photo;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <img
      className={`photo ${className}`}
      src={photoSrc(photo, 1100)}
      srcSet={photoSrcSet(photo)}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      style={{ objectPosition: photo.focus }}
    />
  );
}

function Credit({ photo, className = "" }: { photo: Photo; className?: string }) {
  return (
    <p className={`credit ${className}`}>
      <span>
        {photo.caption} · {photo.place}
      </span>
      <span>
        Photo{" "}
        <a href={photo.source} target="_blank" rel="noreferrer">
          {photo.author}
        </a>{" "}
        ·{" "}
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
          {photo.license}
        </a>
      </span>
    </p>
  );
}

type ChapterData = {
  photo: Photo;
  label: string;
  phase: Phase;
  /** Local time at the start of the chapter, in hours since midnight. */
  clock: number;
  title: [string, string];
  text: string;
  tone: string;
};

const chapters: ChapterData[] = [
  {
    photo: photos.bmwNose,
    label: "Close up",
    phase: "day",
    clock: 16,
    title: ["Every surface", "is a decision."],
    text: "Intakes, light clusters, splitter edges. At 300 km/h nothing on a prototype is decoration.",
    tone: "#14100c",
  },
  {
    photo: photos.fordChicane,
    label: "Afternoon",
    phase: "day",
    clock: 17.5,
    title: ["Hot tyres,", "full tanks."],
    text: "The race starts in daylight. Stints run long, brakes run hot, and the Ford Chicane waits at the end of every lap.",
    tone: "#16110a",
  },
  {
    photo: photos.bmwSpeed,
    label: "Evening",
    phase: "dusk",
    clock: 20.25,
    title: ["The light", "starts to go."],
    text: "Shadows stretch across the Sarthe. Drivers chase the last of the sun before the long night.",
    tone: "#170b06",
  },
  {
    photo: photos.underLights,
    label: "Night",
    phase: "night",
    clock: 22.25,
    title: ["Headlights", "and nerve."],
    text: "Hours of darkness, traffic in three classes, and closing speeds that reward trust in the lights ahead.",
    tone: "#050817",
  },
  {
    photo: photos.finish,
    label: "Hour 24",
    phase: "day",
    clock: 29.5,
    title: ["The clock", "runs out."],
    text: "Twenty-four hours later the chequered flag falls. Everything in this atlas is about getting there.",
    tone: "#0b0b0d",
  },
];
const RACE_START = 16;
const RACE_END = 40;

function Chapter({
  chapter,
  index,
}: {
  chapter: ChapterData;
  index: number;
}) {
  const ref = useScrollProgress<HTMLElement>("pinned");
  return (
    <article
      className={`chapter chapter-${chapter.phase}`}
      ref={ref}
      style={{ "--tone": chapter.tone } as React.CSSProperties}
    >
      <div className="chapter-sticky">
        <figure className="chapter-frame">
          <PhotoImg photo={chapter.photo} />
        </figure>
        <div className="chapter-copy">
          <span className="chapter-label">
            {pad(index + 1)} — {chapter.label}
          </span>
          <h3>
            {chapter.title[0]}
            <br />
            <em>{chapter.title[1]}</em>
          </h3>
          <p>{chapter.text}</p>
        </div>
        <Credit photo={chapter.photo} className="chapter-credit" />
      </div>
    </article>
  );
}

/**
 * The five photographs share one sky. As the page scrolls, a race clock runs
 * from the start to the flag and the light over the pictures follows it:
 * afternoon sun, sunset, night with headlight trails, dawn mist, day again.
 */
function Chapters() {
  const body = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLElement>(null);
  const hour = useRef<HTMLElement>(null);
  const [light, setLight] = useState<Phase>("day");
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = element.querySelectorAll<HTMLElement>(".chapter");
      const line = innerHeight * 0.3;
      let index = 0,
        progress = 0;
      items.forEach((item, i) => {
        const box = item.getBoundingClientRect();
        if (box.top <= line) {
          index = i;
          progress = Math.min(1, Math.max(0, (line - box.top) / box.height));
        }
      });
      const from = chapters[index].clock;
      const to = chapters[index + 1]?.clock ?? RACE_END;
      const clock = from + (to - from) * progress;
      // The light follows the clock: mid-June sunset and sunrise at Le Mans.
      const wallClock = clock % 24;
      const next: Phase =
        wallClock >= 20.25 && wallClock < 22.25
          ? "dusk"
          : wallClock >= 22.25 || wallClock < 5.5
            ? "night"
            : wallClock < 7.5
              ? "dawn"
              : "day";
      setLight((current) => (current === next ? current : next));
      const wall = ((clock % 24) + 24) % 24;
      const hh = Math.floor(wall);
      const mm = Math.floor((wall - hh) * 60);
      if (time.current)
        time.current.textContent = `${pad(hh)}:${pad(mm)}`;
      if (hour.current)
        hour.current.textContent = pad(
          Math.min(24, Math.floor(clock - RACE_START)),
        );
      rail.current?.style.setProperty(
        "--t",
        ((clock - RACE_START) / (RACE_END - RACE_START)).toFixed(4),
      );
      const box = element.getBoundingClientRect();
      rail.current?.classList.toggle(
        "on",
        box.top < innerHeight * 0.4 && box.bottom > innerHeight * 0.75,
      );
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
    };
  }, []);
  const Icon = phaseIcon[light];
  return (
    <section className="chapters" aria-label="From day into night">
      <header className="chapters-head">
        <span className="eyebrow">01 / Day into night</span>
        <Lines
          className="block-title"
          lines={["Twenty-four", <em key="em">hours, up close.</em>]}
        />
      </header>
      <div className={`chapters-body light-${light}`} ref={body}>
        <div className="chapters-sky" aria-hidden="true">
          <Atmosphere phase={light} />
          <div className="race-rail" ref={rail}>
            <span className="race-rail-phase">
              <Icon size={14} /> {phaseInfo[light].label}
            </span>
            <strong ref={time}>16:00</strong>
            <span className="race-rail-hour">
              Hour <b ref={hour}>00</b> / 24
            </span>
            <div className="race-rail-track">
              {phases.map((p) => (
                <i key={p} className={`seg-${p}`} />
              ))}
              <em />
            </div>
          </div>
        </div>
        {chapters.map((chapter, index) => (
          <Chapter key={chapter.photo.id} chapter={chapter} index={index} />
        ))}
      </div>
    </section>
  );
}

const classPhoto: Record<string, Photo> = {
  Hypercar: photos.bmwSide,
  LMP2: photos.prototypes,
  LMGT3: photos.vantage,
};

export default function Home() {
  const [i, setI] = useState(0);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const entry = entries.find((e) => e.number === featured[i])!;
  const car = carById(entry.carId)!;
  const reference = exteriorReferences[car.id];
  const phase = usePhase();
  const heroRef = useScrollProgress<HTMLElement>("exit");
  const droneSlot = useRef<HTMLDivElement>(null);
  const [droneOn, setDroneOn] = useState(false);
  useEffect(() => {
    const element = droneSlot.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setDroneOn(true));
      return;
    }
    const observer = new IntersectionObserver(
      ([record]) => {
        if (record.isIntersecting) {
          setDroneOn(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const live = activeModel === reference.id;
  const heroPhoto = phasePhotos[phase];
  // Photographs load the first time their light is chosen, then stay mounted
  // so switching back is instant.
  const [seen, setSeen] = useState<Phase[]>([phase]);
  if (!seen.includes(phase)) setSeen([...seen, phase]);
  return (
    <main className={`home phase-${phase}`}>
      {/* ------------------------------------------------ Hero */}
      <section
        className="hero"
        ref={heroRef}
        aria-label="Discover the endurance explorer"
      >
        <div className="hero-media">
          {phases
            .filter((p) => seen.includes(p))
            .map((p) => (
              <div
                key={p}
                className={`hero-photo hero-photo-${p}${phase === p ? " on" : ""}`}
              >
                <PhotoImg photo={phasePhotos[p]} priority={p === seen[0]} />
              </div>
            ))}
        </div>
        <Atmosphere phase={phase} className="hero-atmosphere" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-stripes" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="hero-meta">
          <span className="eyebrow">The endurance explorer</span>
          <span className="hero-meta-mid">24 Hours of Le Mans · Season 2026</span>
          <span className="hero-meta-end">47°56′ N / 0°14′ E</span>
        </div>
        <Lines
          as="h1"
          className="hero-title"
          lines={["Built for", <em key="em">24 hours.</em>]}
        />
        <div className="hero-foot">
          <div className="hero-intro">
            <p>
              The machines. The engineering. The legendary circuit. Get closer
              to the world of Le Mans, one detail at a time.
            </p>
            <div className="hero-cta">
              <a
                className="btn primary"
                data-magnetic
                {...linkProps("car", { car: car.id, entry: entry.number })}
              >
                Explore the cars <ArrowUpRight size={16} />
              </a>
              <a className="btn glass" href="#drone" data-magnetic>
                Ride a lap <ArrowDown size={16} />
              </a>
            </div>
          </div>
          <div className="hero-side">
            <span className="hero-phase-line" aria-live="polite">
              <b>{phaseInfo[phase].clock}</b> {phaseInfo[phase].line}
            </span>
            <PhaseSwitch className="hero-switch" />
            <Credit photo={heroPhoto} className="hero-credit" />
          </div>
        </div>
        <span className="hero-scroll" aria-hidden="true">
          <i /> Scroll
        </span>
      </section>

      {/* ------------------------------------------------ Marquee */}
      <section className="marquees" aria-label="The race at a glance">
        <Marquee
          variant="solid"
          items={[
            "Hypercar",
            "LMP2",
            "LMGT3",
            `${entries.length} entries`,
            `${circuit.length.toFixed(3)} km`,
            `${circuit.corners} corners`,
            "24 hours",
            "Day into night",
          ]}
        />
        <Marquee
          variant="outline"
          reverse
          items={cars.map((model) => `${model.make} ${model.name}`)}
        />
      </section>

      {/* ------------------------------------------------ Manifesto + numbers */}
      <section className="statement">
        <span className="eyebrow">The race in numbers</span>
        <Manifesto />
        <div className="stats">
          <Stat index={0} value={entries.length} label="Race entries" note="Provisional list, 5 May 2026" />
          <Stat index={1} value={cars.length} label="Car families" note="Each one in 3D" />
          <Stat index={2} value={3} label="Racing classes" note="Hypercar · LMP2 · LMGT3" />
          <Stat index={3} value={circuit.length} decimals={3} label="Kilometres per lap" note="Circuit de la Sarthe" />
          <Stat index={4} value={circuit.corners} label="Corners" note="From the track-atlas data" />
          <Stat index={5} value={24} label="Hours of racing" note="Day, dusk, night, dawn" />
        </div>
      </section>

      {/* ------------------------------------------------ Day into night */}
      <Chapters />

      {/* ------------------------------------------------ Classes */}
      <section className="block classes" aria-labelledby="classes-title">
        <header className="block-head">
          <span className="eyebrow">02 / The machines</span>
          <Lines
            className="block-title"
            lines={["Different machines.", <em key="em">The same obsession.</em>]}
          />
          <p className="block-lead" data-reveal>
            Three classes share one ribbon of tarmac. Learn what sets them
            apart, then find your car in the {entries.length}-entry provisional
            field.
          </p>
        </header>
        <div className="class-panels" id="classes-title">
          {classOrder.map((category, index) => {
            const info = classInfo[category];
            const count = entries.filter(
              (e) => carById(e.carId)?.category === category,
            ).length;
            return (
              <a
                key={category}
                className="class-panel"
                data-reveal
                data-spotlight
                data-cursor="Explore"
                style={{ "--cls": info.color, "--d": index } as React.CSSProperties}
                {...linkProps("field", { class: category })}
              >
                <div className="class-panel-media">
                  <PhotoImg
                    photo={classPhoto[category]}
                    sizes="(max-width: 900px) 100vw, 60vw"
                  />
                  <span className="class-photo-credit">
                    {classPhoto[category].caption} · {classPhoto[category].author} ·{" "}
                    {classPhoto[category].license}
                  </span>
                </div>
                <div className="class-panel-top">
                  <span className="class-no">{pad(index + 1)}</span>
                  <span className="class-count">{count} entries</span>
                </div>
                <div className="class-panel-body">
                  <span className="cls-tag">{category}</span>
                  <h3>{info.tagline}</h3>
                  <p>{info.text}</p>
                  <dl>
                    {info.facts.map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="card-link">
                    Explore {category} <ArrowUpRight size={16} />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------ Studio */}
      <section className="studio" aria-labelledby="studio-title">
        <header className="block-head">
          <span className="eyebrow">03 / In the studio</span>
          <Lines
            className="block-title"
            lines={["Turn it over.", <em key="em">Every angle.</em>]}
          />
          <p className="block-lead" id="studio-title" data-reveal>
            Detailed creator-hosted exteriors, each with its own livery. Start the
            3D viewer and drag to orbit the car.
          </p>
        </header>
        <div className="studio-stage">
        <div
          className={`hero-stage${live ? " viewing" : ""}`}
          role="group"
          aria-label={`${car.make} ${car.name} exterior preview`}
        >
          <span className="hero-ghost" aria-hidden="true">
            {entry.number}
          </span>
          <div className="hero-frame">
            <CarPreview
              key={car.id}
              car={car}
              className="hero-poster"
              sizes="(max-width: 900px) 100vw, 1200px"
            />
            {live ? (
              <Suspense
                fallback={
                  <div className="hero-model-loading">
                    <Scan size={25} />
                    <span>Preparing the studio</span>
                  </div>
                }
              >
                <FeaturedExterior
                  key={reference.id}
                  reference={reference}
                  title={`${car.make} ${car.name} detailed exterior`}
                />
              </Suspense>
            ) : (
              <button
                className="btn primary hero-load-model"
                data-magnetic
                onClick={() => setActiveModel(reference.id)}
              >
                <span>Start 3D viewer</span>
                <Scan size={16} />
              </button>
            )}
            <i className="corner tl" aria-hidden="true" />
            <i className="corner tr" aria-hidden="true" />
            <i className="corner bl" aria-hidden="true" />
            <i className="corner br" aria-hidden="true" />
            <div className="hero-view-label">
              <span className="rec" aria-hidden="true" />
              {live ? "Detailed exterior model" : "Creator exterior preview"}
              <span>{live ? "Drag to rotate" : "Select Start 3D to explore"}</span>
            </div>
          </div>
        </div>
        <div className="hero-caption">
          <div className="hero-car-identity">
            <span
              className="plate"
              style={{ background: classInfo[car.category].color }}
            >
              {plateFor(car)}
            </span>
            <div>
              <span className="hero-car-category">
                {car.category} / {car.platform}
              </span>
              <strong>
                {car.make} {car.name}
              </strong>
              <span>Exterior reference with its own livery</span>
            </div>
          </div>
          <div className="hero-car-spec">
            <span>Powertrain</span>
            <strong>{powertrain(car)}</strong>
          </div>
          <div className="hero-car-spec">
            <span>Model hosted by</span>
            <a
              href={
                reference.sourceUrl ??
                `https://sketchfab.com/models/${reference.id}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {reference.author} <ArrowUpRight size={12} />
            </a>
          </div>
          <a className="btn glass small" {...linkProps("car", { car: car.id })}>
            Open in the explorer <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="studio-rail" role="group" aria-label="Featured cars">
          {featured.map((number, index) => {
            const item = entries.find((e) => e.number === number)!;
            const itemCar = carById(item.carId)!;
            return (
              <button
                key={number}
                className="studio-pick"
                aria-pressed={index === i}
                aria-label={`#${number} ${itemCar.make} ${itemCar.name}`}
                style={
                  { "--cls": classInfo[itemCar.category].color } as React.CSSProperties
                }
                onClick={() => {
                  setActiveModel(null);
                  setI(index);
                }}
              >
                <StudyImage entry={number} alt="" />
                <span className="studio-pick-name">
                  <b>#{number}</b> {itemCar.name}
                </span>
              </button>
            );
          })}
        </div>
        </div>
      </section>

      {/* ------------------------------------------------ Engineering bento */}
      <section className="block engineering" aria-labelledby="eng-title">
        <header className="block-head">
          <span className="eyebrow">05 / Under the skin</span>
          <Lines
            className="block-title"
            lines={["Beautiful outside.", <em key="em">Fascinating inside.</em>]}
          />
          <p className="block-lead" data-reveal id="eng-title">
            Go beyond the silhouette. Peel back the bodywork and discover how an
            endurance car is built to survive a day and a night at the limit.
          </p>
        </header>
        <div className="bento">
          <a
            className="tile tile-feature"
            data-reveal
            data-spotlight
            data-cursor="Inside"
            {...linkProps("car", { car: "ferrari", entry: "50", x: "1" })}
          >
            <CarPreview car={carById("ferrari")!} sizes="(max-width: 820px) 100vw, 820px" />
            <div className="tile-hud" aria-hidden="true">
              <span>Study · 499P</span>
              <span>Exploded view · x 1.00</span>
            </div>
            <div className="tile-copy">
              <span className="eyebrow">Featured study</span>
              <h3>Inside the Ferrari 499P</h3>
              <p>
                3.0 L twin-turbo V6, front-axle hybrid and a carbon tub, opened
                up layer by layer.
              </p>
              <span className="tile-go">
                Open the study <ArrowUpRight size={16} />
              </span>
            </div>
          </a>
          <div className="tile tile-systems" data-reveal data-spotlight style={{ "--d": 1 } as React.CSSProperties}>
            <span className="tile-label">Engineering assemblies</span>
            <strong className="tile-big">14</strong>
            <ul>
              {[
                ["Aerodynamics", 4],
                ["Powertrain", 3],
                ["Chassis", 3],
                ["Driver & systems", 3],
                ["Structure", 1],
              ].map(([group, n]) => (
                <li key={group}>
                  <span>{group}</span>
                  <i style={{ "--w": Number(n) / 4 } as React.CSSProperties} />
                  <b>{n}</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="tile tile-explode" data-reveal data-spotlight style={{ "--d": 2 } as React.CSSProperties}>
            <svg viewBox="0 0 200 120" aria-hidden="true" className="explode-art">
              <g className="layer l1">
                <path d="M20 78 C50 50 150 50 182 76 L182 84 L20 84 Z" />
              </g>
              <g className="layer l2">
                <rect x="60" y="66" width="70" height="14" rx="3" />
              </g>
              <g className="layer l3">
                <circle cx="52" cy="88" r="12" />
                <circle cx="150" cy="88" r="12" />
              </g>
              <g className="layer l4">
                <path d="M30 92 L172 92" />
              </g>
            </svg>
            <span className="tile-label">Take it apart</span>
            <p>Exploded systems and transparent or removable bodywork.</p>
          </div>
          <div className="tile tile-studio" data-reveal data-spotlight style={{ "--d": 1 } as React.CSSProperties}>
            <svg className="streams" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
              {[18, 38, 58, 78, 98, 118, 138].map((y, index) => (
                <path
                  key={y}
                  d={`M-20 ${y} C 90 ${y}, 140 ${y - 26 + index * 4}, 220 ${y - 18 + index * 3} S 360 ${y}, 420 ${y}`}
                  style={{ "--s": index } as React.CSSProperties}
                />
              ))}
            </svg>
            <span className="tile-label">Teardown studio</span>
            <h3>Garage, build sequence, wind tunnel.</h3>
            <div className="studio-links">
              {(
                [
                  ["garage", "Garage"],
                  ["build", "Build"],
                  ["tunnel", "Wind tunnel"],
                ] as const
              ).map(([view, label]) => (
                <a key={view} {...linkProps("car", { car: "ferrari", view })}>
                  {label} <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
          </div>
          <div className="tile tile-views" data-reveal data-spotlight style={{ "--d": 2 } as React.CSSProperties}>
            <span className="tile-label">Look closer</span>
            <div className="viewfinder" aria-hidden="true">
              <i />
              <span>06</span>
            </div>
            <p>Six camera views, dimensions and component notes.</p>
          </div>
          <a
            className="tile tile-sources"
            data-reveal
            data-spotlight
            style={{ "--d": 3 } as React.CSSProperties}
            {...linkProps("about")}
          >
            <span className="tile-label">Know what you’re seeing</span>
            <strong className="tile-big">28</strong>
            <p>
              Primary sources behind the engineering notes, with conceptual
              geometry clearly labelled.
            </p>
            <span className="tile-go">
              Sources & accuracy <ArrowUpRight size={14} />
            </span>
          </a>
        </div>
      </section>

      {/* ------------------------------------------------ Horizontal garage */}
      <Garage />

      {/* ------------------------------------------------ Drone lap */}
      <section className="drone-section" id="drone" aria-labelledby="drone-title">
        <div className="drone-slot" ref={droneSlot}>
          {droneOn && (
            <Suspense fallback={null}>
              <DroneView />
            </Suspense>
          )}
        </div>
        <div className="drone-head">
          <span className="eyebrow">06 / Circuit de la Sarthe</span>
          <h2 id="drone-title">
            Ride the lap.
            <br />
            <em>From the air.</em>
          </h2>
          <a className="btn primary" data-magnetic {...linkProps("circuit")}>
            Explore the circuit <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}
