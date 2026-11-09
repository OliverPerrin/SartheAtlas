import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { carById } from "./data/cars.ts";
import { useRoute } from "./router.ts";
import type { Page } from "./router.ts";
import Home from "./pages/Home.tsx";
import { Cursor, Footer, Header } from "./components/Chrome.tsx";
import Intro from "./components/Intro.tsx";
import { phasePhotos, photoSrc } from "./data/photos.ts";
import { phaseInLeMans } from "./data/racePhase.ts";
import { reducedMotion, startPointerEffects, startReveals } from "./motion.ts";
import "./App.css";
import "./Chrome.css";

const Explorer = lazy(() => import("./pages/Explorer.tsx"));
const Circuit = lazy(() => import("./pages/Circuit.tsx"));
const Field = lazy(() => import("./pages/Field.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const CommandPalette = lazy(() => import("./components/CommandPalette.tsx"));

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

// Decided once per page load: the countdown plays on the first home visit of a session.
const firstVisit = (() => {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(location.search).has("intro")) return !reducedMotion();
  try {
    if (sessionStorage.getItem("sa-intro")) return false;
    sessionStorage.setItem("sa-intro", "1");
  } catch {
    return false;
  }
  return !reducedMotion();
})();

export default function App() {
  const { page, params } = useRoute();
  const [palette, setPalette] = useState(false);
  const [intro, setIntro] = useState(() => page === "home" && firstVisit);
  const [loader, setLoader] = useState(intro);
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.title = `${titleFor(page, params)} · Sarthe Atlas`;
  }, [page, params]);
  // The page underneath stays put until the title sequence lifts.
  useEffect(() => {
    document.documentElement.classList.toggle("intro-lock", intro);
    return () => document.documentElement.classList.remove("intro-lock");
  }, [intro]);
  useEffect(() => {
    if (!shell.current) return;
    const stopReveals = startReveals(shell.current);
    const stopPointer = startPointerEffects();
    return () => {
      stopReveals();
      stopPointer();
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof Element &&
        event.target.closest("input, textarea, select, [contenteditable]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setPalette(true);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  const endIntro = useCallback(() => setIntro(false), []);
  const hideLoader = useCallback(() => setLoader(false), []);
  const immersive = page === "car" || page === "circuit";
  return (
    <div
      ref={shell}
      className={`app page-${page}${immersive ? " immersive" : ""}${intro ? " intro" : ""}`}
    >
      <a className="skip" href="#main">
        Skip to content
      </a>
      {loader && (
        <Intro
          src={photoSrc(
            phasePhotos[phaseInLeMans()],
            innerWidth > 1100 ? 2200 : 1100,
          )}
          onLift={endIntro}
          onDone={hideLoader}
        />
      )}
      <Header page={page} onSearch={() => setPalette(true)} />
      <div id="main" tabIndex={-1}>
        <Suspense
          fallback={
            <div className="page-loading">
              <span className="loading-bar" aria-hidden="true" />
              Loading the explorer…
            </div>
          }
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
      {!immersive && <Footer />}
      {!immersive && <Cursor />}
      {!immersive && <div className="grain" aria-hidden="true" />}
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setPalette(false)} />
        </Suspense>
      )}
    </div>
  );
}
