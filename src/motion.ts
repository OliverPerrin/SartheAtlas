import { useEffect, useRef, useState } from "react";

/** True when the visitor asked the operating system for less motion. */
export const reducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fine pointers get the cursor follower, magnetic buttons and spotlights. */
export const finePointer = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Reveal any `[data-reveal]` element the first time it scrolls into view.
 * A MutationObserver picks up content that lazy routes add later.
 */
export function startReveals(root: HTMLElement) {
  const html = document.documentElement;
  if (reducedMotion() || typeof IntersectionObserver === "undefined") {
    html.classList.remove("motion");
    return () => {};
  }
  html.classList.add("motion");
  const io = new IntersectionObserver(
    (records) => {
      for (const record of records)
        if (record.isIntersecting) {
          record.target.classList.add("in");
          io.unobserve(record.target);
        }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  const scan = (node: ParentNode) =>
    node
      .querySelectorAll<HTMLElement>("[data-reveal]:not(.in)")
      .forEach((element) => io.observe(element));
  scan(root);
  const mo = new MutationObserver((records) => {
    for (const record of records)
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("[data-reveal]:not(.in)")) io.observe(node);
        scan(node);
      });
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => {
    io.disconnect();
    mo.disconnect();
  };
}

/**
 * Pointer-driven flourishes, delegated from the document so pages only add
 * data attributes: `data-spotlight` cards track the pointer with a glow and
 * `data-magnetic` controls lean toward it.
 */
export function startPointerEffects() {
  if (!finePointer() || reducedMotion()) return () => {};
  let magnet: HTMLElement | null = null;
  const move = (event: PointerEvent) => {
    const target = event.target as Element | null;
    const card = target?.closest<HTMLElement>("[data-spotlight]");
    if (card) {
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - box.left}px`);
      card.style.setProperty("--my", `${event.clientY - box.top}px`);
    }
    const next = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
    if (magnet && magnet !== next) magnet.style.translate = "";
    magnet = next;
    if (magnet) {
      const box = magnet.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      magnet.style.translate = `${dx * 0.22}px ${dy * 0.3}px`;
    }
  };
  const leave = () => {
    if (magnet) magnet.style.translate = "";
    magnet = null;
  };
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", leave);
  return () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerleave", leave);
  };
}

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

/** Counts up to a number the first time it is visible. */
export function useCountUp(target: number, decimals = 0) {
  const ref = useRef<HTMLElement>(null);
  // Server render and reduced motion show the real figure; animated counters start at 0.
  const [value, setValue] = useState(() =>
    typeof window === "undefined" ||
    reducedMotion() ||
    typeof IntersectionObserver === "undefined"
      ? target
      : 0,
  );
  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion() || typeof IntersectionObserver === "undefined")
      return;
    let frame = 0;
    let started = false;
    const io = new IntersectionObserver(([record]) => {
      if (!record.isIntersecting || started) return;
      started = true;
      io.disconnect();
      const start = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        setValue(target * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(element);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);
  return [ref, value.toFixed(decimals)] as const;
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
