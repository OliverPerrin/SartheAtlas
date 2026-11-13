import { useCallback, useEffect, useRef, useState } from "react";
import "./Intro.css";

type Stage = "count" | "reveal" | "zoom" | "out";

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * The opening title sequence: a race clock runs to 24 hours while class-colour
 * light trails cross the screen, then the hero photograph appears inside a
 * giant "24" and the camera flies through the numerals into the page.
 */
export default function Intro({
  src,
  onLift,
  onDone,
}: {
  src: string;
  onLift: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("count");
  const [hours, setHours] = useState(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  const started = useRef(0);

  const finish = useCallback(
    (delay = 0) => {
      if (finished.current) return;
      finished.current = true;
      timers.current.forEach(clearTimeout);
      timers.current.push(
        window.setTimeout(() => {
          setStage("out");
          onLift();
          timers.current.push(window.setTimeout(onDone, 750));
        }, delay),
      );
    },
    [onLift, onDone],
  );

  useEffect(() => {
    let live = true;
    let frame = 0;
    // Survives React's development double-invocation, so the clock never restarts.
    if (!started.current) started.current = performance.now();
    const start = started.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1500);
      setHours(Math.floor(24 * (1 - Math.pow(1 - t, 2.4))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const image = new Image();
    image.src = src;
    const assets = Promise.all([
      image.decode().catch(() => undefined),
      document.fonts?.load("900 expanded 200px Saira").catch(() => undefined),
    ]);
    // Never hold the page hostage: continue after 2.2 s whatever has loaded.
    const elapsed = performance.now() - start;
    Promise.all([
      wait(Math.max(0, 1500 - elapsed)),
      Promise.race([assets, wait(2200)]),
    ]).then(() => {
      if (!live || finished.current) return;
      setStage("reveal");
      timers.current.push(
        window.setTimeout(() => live && setStage("zoom"), 850),
        window.setTimeout(() => live && finish(), 850 + 1150),
      );
    });
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Tab") return;
      finish();
    };
    addEventListener("keydown", skip);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      removeEventListener("keydown", skip);
    };
  }, [src, finish]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div
      className={`intro-seq intro-${stage}`}
      onClick={() => finish()}
      role="presentation"
    >
      <div className="intro-streaks" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="intro-top" aria-hidden="true">
        <span>Sarthe Atlas</span>
        <span>Circuit de la Sarthe, 13.626 km</span>
      </div>
      <div className="intro-clock" aria-hidden="true">
        <span>Race clock</span>
        <strong>
          {String(hours).padStart(2, "0")}
          <i>:00:00</i>
        </strong>
        <div className="intro-flag">
          <b />
          <b />
          <b />
        </div>
      </div>
      <svg
        className="intro-mask"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <mask id="intro-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
            <rect className="intro-bg" width="1600" height="900" />
            <text className="intro-24" x="800" y="452" textAnchor="middle" dominantBaseline="central">
              24
            </text>
          </mask>
        </defs>
        <image
          href={src}
          width="1600"
          height="900"
          preserveAspectRatio="xMidYMid slice"
          mask="url(#intro-cut)"
        />
        <image
          className="intro-full"
          href={src}
          width="1600"
          height="900"
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>
      <button
        className="intro-skip"
        onClick={(event) => {
          event.stopPropagation();
          finish();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
