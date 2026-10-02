import type { Tick } from "../three/TrackScene.tsx";
import { sections } from "./track.ts";

// Frame publishers update only the small consumers which display live telemetry.
// The page subscribes to the section ID, which changes only at section boundaries.
export function createLapStore() {
  let tick: Tick | null = null;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => tick,
    getSection: () =>
      tick
        ? (sections.find(
            (section) =>
              tick!.fraction >= section.from && tick!.fraction < section.to,
          )?.id ?? null)
        : null,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (next: Tick | null) => {
      if (
        next === tick ||
        (next &&
          tick &&
          next.cls === tick.cls &&
          next.elapsed === tick.elapsed &&
          next.fraction === tick.fraction &&
          next.speed === tick.speed &&
          next.lap === tick.lap)
      )
        return;
      tick = next;
      listeners.forEach((listener) => listener());
    },
  };
}
export type LapStore = ReturnType<typeof createLapStore>;
