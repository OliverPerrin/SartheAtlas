import { useEffect, useState } from "react";
import { ArrowUp, Menu, Search, X } from "lucide-react";
import { linkProps } from "../router.ts";
import type { Page } from "../router.ts";
import { reducedMotion, useLeMansTime } from "../motion.ts";
import PhaseSwitch from "./PhaseSwitch.tsx";

const nav: [Page, string][] = [
  ["field", "The field"],
  ["car", "Car explorer"],
  ["circuit", "The circuit"],
  ["about", "Sources"],
];

export function Brand() {
  return (
    <a className="brand" aria-label="Sarthe Atlas home" {...linkProps("home")}>
      <svg className="brandmark" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" />
        <path d="M9 26 L20 12 L31 26" />
        <path d="M14 26 L20 18 L26 26" />
      </svg>
      <strong>Sarthe Atlas</strong>
    </a>
  );
}

export function Header({
  page,
  onSearch,
}: {
  page: Page;
  onSearch: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      setScrolled(y > 24);
      setHidden(y > 320 && y > last + 4 ? true : y < last - 4 ? false : (h) => h);
      last = y;
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  // A route change always closes the menu and shows the bar.
  const [shownPage, setShownPage] = useState(page);
  if (shownPage !== page) {
    setShownPage(page);
    setMenu(false);
    setHidden(false);
  }
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menu);
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <>
      <header
        className={`header${scrolled || menu ? " scrolled" : ""}${hidden && !menu ? " tucked" : ""}`}
      >
        <Brand />
        <nav aria-label="Main" className="nav">
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
        <div className="header-tools">
          {page !== "car" && <PhaseSwitch compact className="header-phase" />}
          <button
            className="btn ghost icon"
            onClick={onSearch}
            aria-label="Search the atlas"
            title="Search (press /)"
          >
            <Search size={18} />
          </button>
          <button
            className="btn ghost icon menu-btn"
            aria-expanded={menu}
            aria-controls="site-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((open) => !open)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <div
        id="site-menu"
        className={`site-menu${menu ? " open" : ""}`}
        inert={!menu}
        aria-hidden={!menu}
      >
        <nav aria-label="Site menu">
          {[["home", "Home"] as [Page, string], ...nav].map(([id, label]) => (
            <a
              key={id}
              {...linkProps(id)}
              aria-current={page === id ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        {page !== "car" && (
          <div className="site-menu-light">
            <span className="label">Time of day</span>
            <PhaseSwitch />
          </div>
        )}
      </div>
    </>
  );
}

export function Footer() {
  const time = useLeMansTime(false);
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-about">
          <Brand />
          <p>
            An independent, open-source guide to the cars and circuit of the 24
            Hours of Le Mans. Not affiliated with the ACO, FIA WEC,
            manufacturers or teams.
          </p>
        </div>
        <nav aria-label="Explore">
          <h2>Explore</h2>
          <a {...linkProps("field")}>The field</a>
          <a {...linkProps("car")}>Car explorer</a>
          <a {...linkProps("circuit")}>The circuit</a>
          <a {...linkProps("car", { car: "ferrari", view: "garage" })}>
            Teardown studio
          </a>
        </nav>
        <nav aria-label="Project">
          <h2>Project</h2>
          <a {...linkProps("about")}>Sources and accuracy</a>
          <a href="https://github.com/OliverPerrin/SartheAtlas">
            Source on GitHub
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/blob/main/CONTRIBUTING.md">
            Contribute
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/issues/new/choose">
            Report an issue
          </a>
        </nav>
      </div>
      <div className="footer-legal">
        <span>© {new Date().getFullYear()} Sarthe Atlas, MIT licence</span>
        <span>
          Track © OpenStreetMap contributors. Geography © IGN. Exterior models
          © their creators.
        </span>
        <span className="footer-clock">
          Local time in Le Mans <b>{time ?? "--:--"}</b>
        </span>
        <button
          className="btn ghost small"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" })
          }
        >
          <ArrowUp size={15} /> Back to top
        </button>
      </div>
    </footer>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn ghost icon small" onClick={onClick} aria-label="Close search">
      <X size={16} />
    </button>
  );
}
