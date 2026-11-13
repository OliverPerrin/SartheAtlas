import { useEffect, useRef, useState } from "react";

/** True when the visitor asked the operating system for less motion. */
export const reducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Progress (0..1) of an element travelling through the viewport. */
export function useScrollProgress<T extends HTMLElement>(
  mode: "through" | "pinned" | "exit" = "through",
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      const vh = innerHeight;
      const p =
        mode === "pinned"
          ? -box.top / Math.max(1, box.height - vh)
          : mode === "exit"
            ? -box.top / Math.max(1, box.height)
            : (vh - box.top) / (vh + box.height * 0.6);
      element.style.setProperty(
        "--p",
        Math.min(1, Math.max(0, p)).toFixed(4),
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
  }, [mode]);
  return ref;
}

/** Le Mans local time, ticking once a second. */
export function useLeMansTime(seconds = true) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: seconds ? "2-digit" : undefined,
      timeZone: "Europe/Paris",
    });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const timer = setInterval(tick, seconds ? 1000 : 15000);
    return () => clearInterval(timer);
  }, [seconds]);
  return time;
}
