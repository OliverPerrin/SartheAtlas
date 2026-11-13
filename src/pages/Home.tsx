import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Rotate3d } from "lucide-react";
import { carById, cars, classInfo, classOrder } from "../data/cars.ts";
import type { Car } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { linkProps } from "../router.ts";
import { exteriorReferences } from "../data/references.ts";
import CarPreview from "../components/CarPreview.tsx";
import StudyImage from "../components/StudyImage.tsx";
import { useScrollProgress } from "../motion.ts";
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

/** Every car design on one rail. It scrolls sideways; the arrows page it. */
function Garage() {
  const rail = useRef<HTMLDivElement>(null);
  const page = (direction: 1 | -1) =>
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  return (
    <section className="block garage" aria-labelledby="garage-title">
      <header className="block-head">
        <h2 id="garage-title">All {cars.length} car designs</h2>
        <p className="block-lead">
          Pick one to open it in the explorer. The pictures are Sarthe Atlas
          colour studies, not official artwork.
        </p>
        <div className="garage-nav">
          <a className="text-link" {...linkProps("field", { view: "cars" })}>
            Compare them all
          </a>
          <button
            className="btn icon small"
            aria-label="Previous cars"
            onClick={() => page(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="btn icon small"
            aria-label="Next cars"
            onClick={() => page(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div className="garage-rail" ref={rail} tabIndex={0} role="list" aria-label="Car designs">
        {cars.map((car) => (
          <a
            key={car.id}
            role="listitem"
            className="garage-card"
            style={{ "--cls": classInfo[car.category].color } as React.CSSProperties}
            {...linkProps("car", { car: car.id })}
          >
            <StudyImage
              car={car.id}
              alt={`${car.make} ${car.name} colour study, three-quarter view`}
            />
            <span className="cls-tag">{car.category}</span>
            <h3>
              {car.make} {car.name}
            </h3>
            <p>
              {car.engine.label}
              {car.hybrid ? ", hybrid" : ""}
            </p>
          </a>
        ))}
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
      {photo.caption}, {photo.place.replace(" · ", ", ")}. Photo by{" "}
      <a href={photo.source} target="_blank" rel="noreferrer">
        {photo.author}
      </a>
      ,{" "}
      <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
    </p>
  );
}

type ChapterData = {
  photo: Photo;
  phase: Phase;
  /** Local time at the start of the chapter, in hours since midnight. */
  clock: number;
  title: [string, string];
  text: string;
  tone: string;
};

const chapters: ChapterData[] = [
  {
    photo: photos.fordChicane,
    phase: "day",
    clock: 16,
    title: ["Hot tyres,", "full tanks."],
    text: "The race starts in daylight. Stints run long, brakes run hot, and the Ford Chicane waits at the end of every lap.",
    tone: "#16110a",
  },
  {
    photo: photos.bmwSpeed,
    phase: "dusk",
    clock: 20.25,
    title: ["The light", "starts to go."],
    text: "Shadows stretch across the Sarthe. Drivers chase the last of the sun before the long night.",
    tone: "#170b06",
  },
  {
    photo: photos.underLights,
    phase: "night",
    clock: 22.25,
    title: ["Headlights", "and nerve."],
    text: "Hours of darkness, traffic in three classes, and closing speeds that reward trust in the lights ahead.",
    tone: "#050817",
  },
  {
    photo: photos.pitLaneNight,
    phase: "night",
    clock: 24.5,
    title: ["The pit lane", "stays awake."],
    text: "Fuel, tyres and a new driver in well under a minute, again and again until morning.",
    tone: "#070a14",
  },
  {
    photo: photos.brakesNight,
    phase: "night",
    clock: 27,
    title: ["Brake discs", "glow orange."],
    text: "From over 330 km/h to a hundred for each chicane. After dark you can see the carbon brakes working.",
    tone: "#0a0606",
  },
  {
    photo: photos.dawnWheel,
    phase: "dawn",
    clock: 29.5,
    title: ["First light,", "ten hours left."],
    text: "The sky pales over the grandstands. Tired crews and cold tyres make dawn the hour for mistakes.",
    tone: "#0d0f18",
  },
  {
    photo: photos.finish,
    phase: "day",
    clock: 38,
    title: ["The clock", "runs out."],
    text: "Twenty-four hours later the chequered flag falls. Everything in this atlas is about getting there.",
    tone: "#0b0b0d",
  },
];
const RACE_START = 16;
const RACE_END = 40;

function Chapter({ chapter }: { chapter: ChapterData }) {
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
          <h3>
            {chapter.title[0]}
            <br />
            {chapter.title[1]}
          </h3>
          <p>{chapter.text}</p>
        </div>
        <Credit photo={chapter.photo} className="chapter-credit" />
      </div>
    </article>
  );
}

/**
 * The photographs share one sky. As the page scrolls, a race clock runs
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
      // The clock lingers on each photograph's hour, then runs on to the next.
      const clock = from + (to - from) * progress ** 2;
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
        hour.current.textContent = String(
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
      <header className="block-head chapters-head">
        <h2>Twenty-four hours in seven photographs</h2>
        <p className="block-lead">
          The race starts at four in the afternoon and ends at four the next
          day. Scroll to run the clock.
        </p>
      </header>
      <div className={`chapters-body light-${light}`} ref={body}>
        <div className="chapters-sky" aria-hidden="true">
          <Atmosphere phase={light} />
          <div className="race-rail" ref={rail}>
            <strong ref={time}>16:00</strong>
            <span className="race-rail-phase">
              <Icon size={15} /> {phaseInfo[light].label}, hour{" "}
              <b ref={hour}>0</b> of 24
            </span>
            <div className="race-rail-track">
              {phases.map((p) => (
                <i key={p} className={`seg-${p}`} />
              ))}
              <em />
            </div>
          </div>
        </div>
        {chapters.map((chapter) => (
          <Chapter key={chapter.photo.id} chapter={chapter} />
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
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
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
        <div className="hero-copy">
          <h1 id="hero-title">The 24 Hours of Le Mans, taken apart.</h1>
          <p>
            Open up all {cars.length} car designs in 3D, find any of the{" "}
            {entries.length} entries, and follow a lap of the 13.6 km circuit
            from the air.
          </p>
          <div className="hero-cta">
            <a
              className="btn primary"
              {...linkProps("car", { car: car.id, entry: entry.number })}
            >
              Explore the cars
            </a>
            <a className="btn secondary" href="#drone">
              Watch a lap
            </a>
          </div>
        </div>
        <div className="hero-light">
          <p className="hero-clock" aria-live="polite">
            <strong>{phaseInfo[phase].clock}</strong>
            <span>
              {phaseInfo[phase].label}. {phaseInfo[phase].line}.
            </span>
          </p>
          <Credit photo={heroPhoto} className="hero-credit" />
        </div>
      </section>

      {/* ------------------------------------------------ Classes */}
      <section className="block classes" aria-labelledby="classes-title">
        <header className="block-head">
          <h2 id="classes-title">Three classes share one track</h2>
          <p className="block-lead">
            Prototypes lap the GT cars all day and all night. Each class
            carries its own colour on the number panel, and this site uses the
            same three colours throughout.
          </p>
        </header>
        <div className="class-panels">
          {classOrder.map((category) => {
            const info = classInfo[category];
            const count = entries.filter(
              (e) => carById(e.carId)?.category === category,
            ).length;
            const photo = classPhoto[category];
            return (
              <a
                key={category}
                className="class-panel"
                style={{ "--cls": info.color } as React.CSSProperties}
                {...linkProps("field", { class: category })}
              >
                <div className="class-panel-media">
                  <PhotoImg photo={photo} sizes="(max-width: 900px) 100vw, 34vw" />
                </div>
                <div className="class-panel-body">
                  <div className="class-panel-top">
                    <h3>{category}</h3>
                    <span>{count} entries</span>
                  </div>
                  <p className="class-panel-tagline">{info.tagline}</p>
                  <p>{info.text}</p>
                  <dl>
                    {info.facts.map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="text-link">See the {category} entries</span>
                  <small className="class-photo-credit">
                    Photo: {photo.caption}, by {photo.author}, {photo.license}
                  </small>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------ All the cars */}
      <Garage />

      {/* ------------------------------------------------ Studio */}
      <section className="block studio" aria-labelledby="studio-title">
        <header className="block-head">
          <h2 id="studio-title">Turn a car around</h2>
          <p className="block-lead">
            Eight cars from the entry list as detailed 3D exteriors. Start the
            viewer, then drag to see it from any side.
          </p>
        </header>
        <div className="studio-stage">
          <div
            className={`hero-stage${live ? " viewing" : ""}`}
            role="group"
            aria-label={`${car.make} ${car.name} exterior`}
          >
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
                    <div className="hero-model-loading">Loading the 3D model…</div>
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
                  onClick={() => setActiveModel(reference.id)}
                >
                  <Rotate3d size={18} />
                  Start 3D viewer
                </button>
              )}
            </div>
          </div>
          <div className="studio-caption">
            <div className="studio-car">
              <span
                className="plate"
                style={{ "--cls": classInfo[car.category].color } as React.CSSProperties}
              >
                {entry.number}
              </span>
              <div>
                <strong>
                  {car.make} {car.name}
                </strong>
                <span>
                  {car.category}, {car.platform}
                </span>
              </div>
            </div>
            <dl className="readouts">
              <div>
                <dt>Powertrain</dt>
                <dd>{powertrain(car)}</dd>
              </div>
              <div>
                <dt>3D model by</dt>
                <dd>
                  <a
                    href={
                      reference.sourceUrl ??
                      `https://sketchfab.com/models/${reference.id}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {reference.author}
                  </a>
                </dd>
              </div>
            </dl>
            <a className="btn secondary" {...linkProps("car", { car: car.id })}>
              Open in the explorer
            </a>
          </div>
          <div className="studio-rail" role="group" aria-label="Choose a car">
            {featured.map((number, index) => {
              const item = entries.find((e) => e.number === number)!;
              const itemCar = carById(item.carId)!;
              return (
                <button
                  key={number}
                  className="studio-pick"
                  aria-pressed={index === i}
                  aria-label={`Number ${number}, ${itemCar.make} ${itemCar.name}`}
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
                    <span className="plate small">{number}</span>
                    {itemCar.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Engineering */}
      <section className="block engineering" aria-labelledby="eng-title">
        <header className="block-head">
          <h2 id="eng-title">Then take it apart</h2>
          <p className="block-lead">
            Every car design has an engineering study you can open up: remove
            the bodywork, separate the assemblies and read what each part does.
          </p>
        </header>
        <div className="eng-grid">
          <a
            className="eng-feature"
            {...linkProps("car", { car: "ferrari", entry: "50", x: "1" })}
          >
            <CarPreview car={carById("ferrari")!} sizes="(max-width: 900px) 100vw, 820px" />
            <div className="eng-feature-copy">
              <h3>Inside the Ferrari 499P</h3>
              <p>
                A 3.0 L twin-turbo V6, a front-axle hybrid and a carbon tub,
                opened up layer by layer.
              </p>
              <span className="btn primary">Open the study</span>
            </div>
          </a>
          <ul className="eng-list">
            {(
              [
                [
                  "Exploded view",
                  "Pull the car apart into its 14 assemblies, from the splitter to the gearbox.",
                  { car: "ferrari", entry: "50", x: "1" },
                ],
                [
                  "Garage",
                  "Take assemblies off one at a time and put them back.",
                  { car: "ferrari", view: "garage" },
                ],
                [
                  "Build sequence",
                  "Watch the car go together in order, from the tub outwards.",
                  { car: "ferrari", view: "build" },
                ],
                [
                  "Wind tunnel",
                  "See how air moves around the finished car.",
                  { car: "ferrari", view: "tunnel" },
                ],
              ] as const
            ).map(([title, text, params]) => (
              <li key={title}>
                <a {...linkProps("car", params)}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <a {...linkProps("about")}>
                <strong>Sources and accuracy</strong>
                <span>
                  What is measured, what is modelled, and the 28 sources behind
                  the engineering notes.
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Day into night */}
      <Chapters />

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
          <h2 id="drone-title">A lap from the air</h2>
          <a className="btn secondary" {...linkProps("circuit")}>
            Open the circuit map
          </a>
        </div>
      </section>
    </main>
  );
}
