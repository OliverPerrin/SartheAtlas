import { useSyncExternalStore } from "react";

/** The four lights a 24-hour race runs through. */
export type Phase = "day" | "dusk" | "night" | "dawn";

export const phases: Phase[] = ["day", "dusk", "night", "dawn"];

export const phaseInfo: Record<
  Phase,
  { label: string; clock: string; hour: number; line: string }
> = {
  day: { label: "Day", clock: "16:00", hour: 0, line: "Lights out, full sun" },
  dusk: { label: "Dusk", clock: "21:40", hour: 6, line: "Golden hour on the Sarthe" },
  night: { label: "Night", clock: "02:30", hour: 11, line: "Headlights and nerve" },
  dawn: { label: "Dawn", clock: "06:10", hour: 14, line: "First light, eight hours left" },
};

/** Cars run their lamps all race; these are the phases where they light the road. */
export const isDark = (phase: Phase) => phase === "night" || phase === "dusk";

/** The phase for a local time in Le Mans during race week (mid-June light). */
export function phaseInLeMans(date = new Date()): Phase {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Paris",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const t = hour + minute / 60;
  if (t >= 7.5 && t < 20.25) return "day";
  if (t >= 20.25 && t < 22.25) return "dusk";
  if (t >= 5.5 && t < 7.5) return "dawn";
  return "night";
}

let phase: Phase = typeof window === "undefined" ? "day" : phaseInLeMans();
const listeners = new Set<() => void>();

export function setPhase(next: Phase) {
  if (next === phase) return;
  phase = next;
  document.documentElement.dataset.phase = next;
  listeners.forEach((listener) => listener());
}

export const currentPhase = () => phase;

if (typeof document !== "undefined")
  document.documentElement.dataset.phase = phase;

export function usePhase() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => phase,
    () => "day" as Phase,
  );
}
