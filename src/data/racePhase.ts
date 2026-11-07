import { useSyncExternalStore } from "react";

export type Phase = "day" | "night";

/** Day while the sun is up in Le Mans (roughly 07:00–21:30 local in race week). */
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
  return t >= 7 && t < 21.5 ? "day" : "night";
}

let phase: Phase = typeof window === "undefined" ? "day" : phaseInLeMans();
const listeners = new Set<() => void>();

export function setPhase(next: Phase) {
  if (next === phase) return;
  phase = next;
  document.documentElement.dataset.phase = next;
  listeners.forEach((listener) => listener());
}

if (typeof document !== "undefined") document.documentElement.dataset.phase = phase;

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
