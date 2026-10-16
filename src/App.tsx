import { lazy, Suspense, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { carById } from "./data/cars.ts";
import { linkProps, useRoute } from "./router.ts";
import type { Page } from "./router.ts";
import Home from "./pages/Home.tsx";
import "./App.css";

const Explorer = lazy(() => import("./pages/Explorer.tsx"));
const Circuit = lazy(() => import("./pages/Circuit.tsx"));
const Field = lazy(() => import("./pages/Field.tsx"));
const About = lazy(() => import("./pages/About.tsx"));

const nav: [Page, string][] = [
  ["field", "The field"],
  ["car", "Car explorer"],
  ["circuit", "The circuit"],
  ["about", "Sources"],
];

function titleFor(page: Page, params: URLSearchParams) {
  const car = carById(params.get("car"));
  switch (page) {
    case "car":
      return car ? `${car.make} ${car.name}` : "Car explorer";
    case "field":
      return "The 2026 field";
    case "circuit":
      return "Circuit de la Sarthe";
    case "about":
      return "Sources & accuracy";
    default:
      return "The Le Mans explorer";
  }
}

export default function App() {
  const { page, params } = useRoute();
  useEffect(() => {
    document.title = `${titleFor(page, params)} · Sarthe Atlas`;
  }, [page, params]);
  const immersive = page === "car" || page === "circuit";
  return (
    <div className={`app page-${page}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <a
          className="brand"
          aria-label="Sarthe Atlas home"
          {...linkProps("home")}
        >
          <span className="brandmark" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18.5" />
              <path d="M9 26 L20 12 L31 26" />
              <path d="M14 26 L20 18 L26 26" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>SARTHE ATLAS</strong>
            <small>24 HOURS OF LE MANS · 2026</small>
          </span>
        </a>
        <nav aria-label="Main">
          {nav.map(([id, label]) => (
            <a
              key={id}
              {...linkProps(id)}
              aria-current={page === id ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-flag" aria-hidden="true">
          <i className="c-hyper" />
          <i className="c-lmp2" />
          <i className="c-gt3" />
        </div>
      </header>
      <div id="main" tabIndex={-1}>
        <Suspense
          fallback={<div className="page-loading">Loading the explorer…</div>}
        >
          {page === "home" && <Home />}
          {page === "field" && <Field params={params} />}
          {page === "car" && (
            <Explorer
              key={carById(params.get("car"))?.id ?? "ferrari"}
              params={params}
            />
          )}
          {page === "circuit" && <Circuit />}
          {page === "about" && <About />}
        </Suspense>
      </div>
      {!immersive && (
        <footer className="footer">
          <div>
            <strong>SARTHE ATLAS</strong>
            <p>
              An independent, open-source guide to the cars and circuit of the 24 Hours of Le
              Mans. Not affiliated with the ACO, FIA WEC, manufacturers or
              teams.
            </p>
          </div>
          <div className="footer-links">
            <a {...linkProps("field")}>The field</a>
            <a {...linkProps("car")}>Car explorer</a>
            <a {...linkProps("circuit")}>The circuit</a>
            <a {...linkProps("about")}>
              Sources & accuracy <ArrowUpRight size={13} />
            </a>
            <a href="https://github.com/OliverPerrin/SartheAtlas">
              Source on GitHub <ArrowUpRight size={13} />
            </a>
            <a href="https://github.com/OliverPerrin/SartheAtlas/blob/main/CONTRIBUTING.md">
              Contribute <ArrowUpRight size={13} />
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
