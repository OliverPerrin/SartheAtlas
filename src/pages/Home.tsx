import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Scan,
  Layers,
  MapPin,
} from "lucide-react";
import { carById, cars, classInfo, classOrder } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { circuit } from "../data/track.ts";
import { linkProps } from "../router.ts";
import { exteriorReferences } from "../data/references.ts";
import CarPreview from "../components/CarPreview.tsx";
import "./Home.css";

const FeaturedExterior = lazy(
  () => import("../components/FeaturedExterior.tsx"),
);
const HomeCircuitPreview = lazy(
  () => import("../components/HomeCircuitPreview.tsx"),
);
const featured = ["50", "7", "12", "15", "93", "009", "22", "91"];

export default function Home() {
  const [i, setI] = useState(0);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const entry = entries.find((e) => e.number === featured[i])!;
  const car = carById(entry.carId)!;
  const reference = exteriorReferences[car.id];
  const mapPreview = useRef<HTMLDivElement>(null);
  const [mapVisible, setMapVisible] = useState(false);
  useEffect(() => {
    const element = mapPreview.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setMapVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const cycle = (direction: number) => {
    setActiveModel(null);
    setI(
      (current) => (current + direction + featured.length) % featured.length,
    );
  };
  return (
    <main className="home">
      <section
        className="hero atelier-hero"
        aria-label="Discover the endurance explorer"
      >
        <div className="hero-copy">
          <span className="kicker">
            <span className="edition-mark" /> The endurance explorer / 2026
          </span>
          <h1>
            Built for
            <br />
            <em>24 hours.</em>
          </h1>
          <p>
            The machines. The engineering. The legendary circuit. Get closer to
            the world of Le Mans, one detail at a time.
          </p>
          <div className="hero-cta">
            <a
              className="btn primary"
              {...linkProps("car", { car: car.id, entry: entry.number })}
            >
              Explore the cars <ArrowUpRight size={18} />
            </a>
            <a className="hero-secondary" {...linkProps("circuit")}>
              Discover the circuit <ArrowRight size={15} />
            </a>
          </div>
          <div className="hero-chapters">
            <span>01 / Machines</span>
            <span>02 / Engineering</span>
            <span>03 / Circuit</span>
          </div>
        </div>
        <div
          className="hero-canvas"
          role="group"
          aria-label={`${car.make} ${car.name} exterior preview`}
        >
          <span className="hero-race-number" aria-hidden="true">
            {car.name.split(" ")[0]}
          </span>
          <CarPreview car={car} className="hero-poster" priority />
          {activeModel === reference.id ? (
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
              className="hero-load-model"
              onClick={() => setActiveModel(reference.id)}
            >
              <Scan size={19} />
              <span>Start 3D viewer</span>
            </button>
          )}
          <div className="hero-view-label">
            <span className="studio-dot" />{" "}
            {activeModel === reference.id
              ? "Detailed exterior model"
              : "Creator exterior preview"}{" "}
            <span>
              {activeModel === reference.id
                ? "Drag to rotate"
                : "Select Start 3D to explore"}
            </span>
          </div>
          <a className="hero-turntable" {...linkProps("car", { car: car.id })}>
            Open full viewer <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="hero-caption">
          <div className="hero-car-identity">
            <span
              className="plate"
              style={{ background: classInfo[car.category].color }}
            >
              {car.category === "LMGT3"
                ? "GT"
                : car.category === "LMP2"
                  ? "P2"
                  : "H"}
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
            <strong>
              {car.engine.litres.toFixed(1)} L{" "}
              {car.engine.config === "F" ? "flat-" : car.engine.config}
              {car.engine.cylinders}
              {car.hybrid ? " + hybrid" : ""}
            </strong>
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
          <div className="hero-selector">
            <span>
              {String(i + 1).padStart(2, "0")}{" "}
              <i>/ {String(featured.length).padStart(2, "0")}</i>
            </span>
            <button
              aria-label="Previous featured car"
              onClick={() => cycle(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Next featured car" onClick={() => cycle(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="stat-strip" aria-label="The race in numbers">
        {[
          [String(entries.length), "Race entries"],
          [String(cars.length), "Car families"],
          ["3", "Racing classes"],
          [circuit.length.toFixed(3), "Kilometres per lap"],
          ["24", "Hours of racing"],
        ].map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section home-classes">
        <div className="section-head">
          <span className="kicker">01 / The machines</span>
          <h2>
            Different machines.
            <br />
            <em>The same obsession.</em>
          </h2>
          <p>
            Three classes share one ribbon of tarmac. Learn what sets them
            apart, then find your car in the 62-entry provisional field.
          </p>
        </div>
        <div className="class-cards">
          {classOrder.map((category, index) => {
            const info = classInfo[category];
            const sample = entries.find(
              (e) =>
                e.carId ===
                (category === "Hypercar"
                  ? "ferrari"
                  : category === "LMP2"
                    ? "oreca"
                    : "296"),
            )!;
            const count = entries.filter(
              (e) => carById(e.carId)?.category === category,
            ).length;
            return (
              <a
                key={category}
                className="class-card"
                style={{ "--cls": info.color } as React.CSSProperties}
                {...linkProps("field", { class: category })}
              >
                <div className="class-card-top">
                  <span className="cls-tag">{category}</span>
                  <span className="cls-count">{count} entries</span>
                </div>
                <div className="class-profile">
                  <span aria-hidden="true">0{index + 1}</span>
                  <CarPreview
                    car={carById(sample.carId)!}
                    className="class-sil"
                  />
                </div>
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
                  Explore {category} <ArrowUpRight size={17} />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section split engineering-section">
        <div className="section-head">
          <span className="kicker">02 / Under the skin</span>
          <h2>
            Beautiful outside.
            <br />
            <em>Fascinating inside.</em>
          </h2>
          <p>
            Go beyond the silhouette. Peel back the bodywork and discover how an
            endurance car is built to survive a day and a night at the limit.
          </p>
          <div className="engineering-features">
            <div>
              <Layers size={18} />
              <span>
                <strong>Take it apart</strong>Exploded systems and transparent
                bodywork.
              </span>
            </div>
            <div>
              <Scan size={18} />
              <span>
                <strong>Look closer</strong>Six camera views, dimensions and
                component notes.
              </span>
            </div>
            <div>
              <MapPin size={18} />
              <span>
                <strong>Know what you’re seeing</strong>Car-specific facts with
                clearly labelled conceptual geometry.
              </span>
            </div>
          </div>
          <a
            className="btn primary"
            {...linkProps("car", { car: "ferrari", entry: "50", x: "1" })}
          >
            Inside the Ferrari 499P <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="grid-cars">
          {cars.slice(0, 8).map((model) => {
            return (
              <a
                key={model.id}
                className="mini-car"
                {...linkProps("car", { car: model.id })}
              >
                <CarPreview car={model} />
                <span>
                  {model.make} <strong>{model.name}</strong>
                  <ArrowUpRight size={13} />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section track-teaser">
        <div className="teaser-map" ref={mapPreview}>
          {mapVisible && (
            <Suspense fallback={null}>
              <HomeCircuitPreview />
            </Suspense>
          )}
          <span className="map-coordinate">47°56′ N / 0°14′ E</span>
        </div>
        <div className="section-head">
          <span className="kicker">03 / Circuit de la Sarthe</span>
          <h2>
            A track unlike
            <br />
            <em>any other.</em>
          </h2>
          <p>
            13.626 kilometres. Public roads, flat-out straights, and corners
            that have become part of motorsport history. Trace the route,
            explore the corners, and follow an illustrative lap into the night.
          </p>
          <a className="btn primary" {...linkProps("circuit")}>
            Explore the circuit <ArrowUpRight size={17} />
          </a>
          <a className="home-accuracy" {...linkProps("about")}>
            Built from geographic track data. View sources{" "}
            <ArrowUpRight size={12} />
          </a>
        </div>
      </section>
    </main>
  );
}
