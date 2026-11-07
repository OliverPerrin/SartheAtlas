import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Command, Search, X } from "lucide-react";
import { linkProps } from "../router.ts";
import type { Page } from "../router.ts";
import { finePointer, reducedMotion, useLeMansTime } from "../motion.ts";

const nav: [Page, string][] = [
  ["field", "The field"],
  ["car", "Car explorer"],
  ["circuit", "The circuit"],
  ["about", "Sources"],
];

const GLYPHS = "ABCDEFGHJKLMNOPRSTUVXYZ0123456789/#+";

/** Text that briefly decodes from random glyphs when hovered. */
export function Scramble({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef(0);
  const run = () => {
    const element = ref.current;
    if (!element || reducedMotion()) return;
    clearInterval(timer.current);
    let frame = 0;
    const total = text.length + 6;
    timer.current = window.setInterval(() => {
      frame++;
      element.textContent = [...text]
        .map((char, index) =>
          char === " " || index < frame - 5
            ? char
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        )
        .join("");
      if (frame >= total) {
        clearInterval(timer.current);
        element.textContent = text;
      }
    }, 28);
  };
  useEffect(() => () => clearInterval(timer.current), []);
  return (
    <span className="scramble" aria-hidden="true" ref={ref} onPointerEnter={run}>
      {text}
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" aria-label="Sarthe Atlas home" {...linkProps("home")}>
      <span className="brandmark" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18.5" />
          <path d="M9 26 L20 12 L31 26" />
          <path d="M14 26 L20 18 L26 26" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-text">
          <strong>Sarthe Atlas</strong>
          <small>Le Mans · 2026</small>
        </span>
      )}
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
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const time = useLeMansTime(false);

  const place = (link: HTMLElement | null) => {
    if (!link || !navRef.current) return setIndicator(null);
    const nav = navRef.current.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    setIndicator({ x: box.left - nav.left, w: box.width });
  };
  const placeActive = () =>
    place(
      navRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
        null,
    );
  useLayoutEffect(() => {
    placeActive();
    const fonts = document.fonts;
    fonts?.ready.then(placeActive);
    addEventListener("resize", placeActive);
    return () => removeEventListener("resize", placeActive);
  }, [page]);

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
        className={`header${scrolled ? " scrolled" : ""}${hidden && !menu ? " tucked" : ""}`}
      >
        <Brand />
        <nav
          aria-label="Main"
          className="nav-pill"
          ref={navRef}
          onPointerLeave={placeActive}
        >
          <span
            className="nav-indicator"
            aria-hidden="true"
            style={
              indicator
                ? { transform: `translateX(${indicator.x}px)`, width: indicator.w }
                : { opacity: 0 }
            }
          />
          {nav.map(([id, label]) => (
            <a
              key={id}
              {...linkProps(id)}
              aria-current={page === id ? "page" : undefined}
              aria-label={label}
              onPointerEnter={(event) => place(event.currentTarget)}
              onFocus={(event) => place(event.currentTarget)}
              onBlur={placeActive}
            >
              <Scramble text={label} />
            </a>
          ))}
        </nav>
        <div className="header-tools">
          <span className="header-clock" aria-label="Local time in Le Mans">
            <i className="live-dot" aria-hidden="true" />
            LE MANS <b>{time ?? "--:--"}</b>
          </span>
          <button className="cmdk" onClick={onSearch} aria-label="Search the atlas">
            <Search size={14} />
            <span>Search</span>
            <kbd>
              <Command size={10} />K
            </kbd>
          </button>
          <button
            className="menu-btn"
            aria-expanded={menu}
            aria-controls="site-menu"
            onClick={() => setMenu((open) => !open)}
          >
            <span>{menu ? "Close" : "Menu"}</span>
            <i aria-hidden="true" />
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
          {[["home", "Home"] as [Page, string], ...nav].map(([id, label], index) => (
            <a
              key={id}
              {...linkProps(id)}
              aria-current={page === id ? "page" : undefined}
              style={{ "--i": index } as React.CSSProperties}
            >
              <small>0{index + 1}</small>
              {label}
            </a>
          ))}
        </nav>
        <div className="site-menu-foot">
          <span>47°56′ N / 0°14′ E</span>
          <button
            className="btn ghost small"
            onClick={() => {
              setMenu(false);
              onSearch();
            }}
          >
            <Search size={14} /> Search the atlas
          </button>
        </div>
      </div>
    </>
  );
}

/** A trailing ring that follows fine pointers and labels what it is over. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ring.current;
    if (!element || !finePointer() || reducedMotion()) return;
    let x = innerWidth / 2,
      y = innerHeight / 2,
      tx = x,
      ty = y,
      frame = 0;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame =
        Math.abs(tx - x) + Math.abs(ty - y) > 0.1
          ? requestAnimationFrame(loop)
          : 0;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      tx = event.clientX;
      ty = event.clientY;
      element.classList.add("on");
      const target = event.target as Element | null;
      const tagged = target?.closest<HTMLElement>("[data-cursor]");
      const interactive = target?.closest(
        "a, button, select, label, [role=button], input",
      );
      const text = tagged?.dataset.cursor ?? "";
      if (label.current && label.current.textContent !== text)
        label.current.textContent = text;
      element.classList.toggle("label", Boolean(text));
      element.classList.toggle("hover", Boolean(interactive) && !text);
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const out = () => element.classList.remove("on");
    const down = () => element.classList.add("down");
    const up = () => element.classList.remove("down");
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", out);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", out);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
    };
  }, []);
  return (
    <div className="cursor" ref={ring} aria-hidden="true">
      <span ref={label} />
    </div>
  );
}

export function Footer() {
  const time = useLeMansTime();
  return (
    <footer className="footer">
      <div className="footer-cta" data-reveal>
        <span className="eyebrow">Lights out</span>
        <h2>
          Take the next lap <em>with us.</em>
        </h2>
        <a
          className="footer-round"
          data-magnetic
          data-cursor="Go"
          {...linkProps("car", { car: "ferrari", entry: "50" })}
        >
          <span>Start exploring</span>
          <ArrowUpRight size={22} />
        </a>
      </div>
      <div className="footer-grid">
        <div className="footer-about">
          <p>
            An independent, open-source guide to the cars and circuit of the 24
            Hours of Le Mans. Not affiliated with the ACO, FIA WEC,
            manufacturers or teams.
          </p>
          <p className="footer-clock">
            <i className="live-dot" aria-hidden="true" /> Le Mans{" "}
            <b>{time ?? "--:--:--"}</b> · 47°56′ N / 0°14′ E
          </p>
        </div>
        <nav aria-label="Explore">
          <span>Explore</span>
          <a {...linkProps("field")}>The field</a>
          <a {...linkProps("car")}>Car explorer</a>
          <a {...linkProps("circuit")}>The circuit</a>
          <a {...linkProps("car", { car: "ferrari", view: "garage" })}>
            Teardown studio
          </a>
        </nav>
        <nav aria-label="Project">
          <span>Project</span>
          <a {...linkProps("about")}>Sources & accuracy</a>
          <a href="https://github.com/OliverPerrin/SartheAtlas">
            Source on GitHub <ArrowUpRight size={13} />
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/blob/main/CONTRIBUTING.md">
            Contribute <ArrowUpRight size={13} />
          </a>
          <a href="https://github.com/OliverPerrin/SartheAtlas/issues/new/choose">
            Report an issue <ArrowUpRight size={13} />
          </a>
        </nav>
        <button
          className="to-top"
          data-magnetic
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" })
          }
        >
          <ArrowUp size={18} />
          <span>Back to the grid</span>
        </button>
      </div>
      <div className="footer-word" aria-hidden="true">
        <span>SARTHE</span>
        <span>ATLAS</span>
      </div>
      <div className="footer-legal">
        <span>© {new Date().getFullYear()} Sarthe Atlas · MIT</span>
        <span>
          Track © OpenStreetMap contributors · Geography © IGN · Exterior models
          © their creators
        </span>
      </div>
    </footer>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="cmdp-close" onClick={onClick} aria-label="Close search">
      <X size={16} />
    </button>
  );
}
