import type { Car } from "../data/cars.ts";
import type { SystemId } from "../data/systems.ts";

/**
 * The teardown studio: the existing layered cutaway, the car laid out on a
 * garage floor, a scrubbable build sequence and an illustrative wind tunnel.
 */
export type StudioMode = "cutaway" | "garage" | "build" | "tunnel";
export const STUDIO_MODES: readonly StudioMode[] = [
  "cutaway",
  "garage",
  "build",
  "tunnel",
];
export const isStudioMode = (value: string | null): value is StudioMode =>
  STUDIO_MODES.includes(value as StudioMode);
/** Modes in which assemblies move to their garage-floor positions. */
export const usesGarage = (mode: StudioMode) =>
  mode === "garage" || mode === "build";

export type BuildStep = {
  systems: SystemId[];
  label: string;
  detail: (car: Car) => string;
};

/** Build order: structure first, the parts that close it up last. */
export const BUILD_STEPS: readonly BuildStep[] = [
  {
    systems: ["chassis", "floor"],
    label: "Structure",
    detail: (car) =>
      car.category === "LMGT3"
        ? "The production-based shell, welded-in safety cage and floor come first; everything else is referenced to them."
        : "The carbon survival cell and floor come first; every other assembly is referenced to them.",
  },
  {
    systems: ["suspension", "brakes"],
    label: "Corners",
    detail: () =>
      "Wishbones, uprights, spring and damper units and the brake corners go on at all four wheels.",
  },
  {
    systems: ["engine", "gearbox"],
    label: "Powertrain",
    detail: (car) =>
      car.category === "LMGT3"
        ? `The ${car.engine.cylinders}-cylinder engine and the transmission go into the shell.`
        : `The ${car.engine.cylinders}-cylinder engine bolts to the back of the tub, and the gearbox bolts to the engine.`,
  },
  {
    systems: ["fuel", "hybrid"],
    label: "Energy",
    detail: (car) =>
      car.hybrid
        ? "The safety fuel cell, hybrid motor, battery and high-voltage wiring go in."
        : "The flexible safety fuel cell and its pumps go in. This car has no hybrid system.",
  },
  {
    systems: ["cooling"],
    label: "Cooling",
    detail: () =>
      "Radiators, coolers and their ducting go in, sized for 24 hours of near-full-throttle running.",
  },
  {
    systems: ["cockpit"],
    label: "Driver station",
    detail: () =>
      "The seat, harness, steering wheel, pedals, displays and fire system go in.",
  },
  {
    systems: ["body", "lights"],
    label: "Bodywork",
    detail: () =>
      "The painted panels and lamp units close the car up. Quick-release fasteners make them fast to swap in the pits.",
  },
  {
    systems: ["wing"],
    label: "Rear wing",
    detail: () =>
      "The rear wing goes on its mounts. At Le Mans it runs in low-drag trim for the long straights.",
  },
  {
    systems: ["wheels"],
    label: "Wheels",
    detail: () =>
      "Centre-lock wheels go on last, and the car is ready to roll out.",
  },
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const stepIndex = (system: SystemId) =>
  BUILD_STEPS.findIndex((step) => step.systems.includes(system));

/** 0 when the build has just started, 1 when the car is complete. */
export function stepWindow(index: number) {
  const n = BUILD_STEPS.length;
  return { start: index / n, end: (index + 1) / n };
}

/** Index of the step being installed at a build progress value. */
export function currentStep(progress: number) {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  return Math.min(BUILD_STEPS.length - 1, Math.floor(p * BUILD_STEPS.length));
}

/**
 * How far a system still sits from its installed position: 1 on the garage
 * floor, 0 fitted to the car.
 */
export function detachedAmount(system: SystemId, progress: number) {
  const index = stepIndex(system);
  if (index < 0) return 0;
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const { start, end } = stepWindow(index);
  // Each part travels over the first 85% of its step, then settles.
  return 1 - smooth((p - start) / ((end - start) * 0.85));
}

/** True once the painted panels are on. */
export function liveryApplied(progress: number) {
  const body = stepWindow(stepIndex("body"));
  return progress >= body.start + (body.end - body.start) * 0.85;
}

// Garage floor --------------------------------------------------------------

export type LayoutItem = {
  key: string;
  system: SystemId;
  /** Assembled bounding box in car space. */
  min: [number, number, number];
  max: [number, number, number];
};

export type LayoutZone = {
  label: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};

export type LayoutTag = {
  system: SystemId;
  count: number;
  x: number;
  z: number;
};

export type GarageLayout = {
  /** Translation from the assembled pose to the floor slot. */
  offsets: Map<string, [number, number, number]>;
  zones: LayoutZone[];
  /** One floor tag under each run of the same system. */
  tags: LayoutTag[];
  /** Floor area covered by the bay and every row. */
  bounds: { x0: number; x1: number; z0: number; z1: number };
};

/** The empty bay where the car is built, at the car's own position. */
export const BUILD_BAY = { x0: -2.8, x1: 2.8, z0: -1.3, z1: 1.3 };

/** Floor rows, front of the garage first. Lamps travel with the body. */
export const GARAGE_ROWS: readonly { label: string; systems: SystemId[] }[] = [
  { label: "Bodywork & aero", systems: ["body", "wing", "floor"] },
  {
    label: "Structure, energy & cooling",
    systems: ["chassis", "fuel", "cooling"],
  },
  {
    label: "Powertrain & driver station",
    systems: ["engine", "gearbox", "hybrid", "cockpit"],
  },
  { label: "Corners", systems: ["wheels", "brakes", "suspension"] },
];

const GAP = 0.32;
const ROW_GAP = 0.75;
const MAX_ROW = 11.5;

/**
 * Packs assemblies into labelled rows on the floor. Each item keeps its
 * orientation and rests on y = 0; rows wrap when they grow too long.
 */
export function packGarage(items: LayoutItem[]): GarageLayout {
  const offsets = new Map<string, [number, number, number]>();
  const zones: LayoutZone[] = [];
  const tags: LayoutTag[] = [];
  type Row = {
    label: string;
    items: LayoutItem[];
    width: number;
    depth: number;
  };
  const rows: Row[] = [];
  for (const row of GARAGE_ROWS) {
    const members = items
      .filter((item) => row.systems.includes(item.system))
      .sort(
        (a, b) =>
          row.systems.indexOf(a.system) - row.systems.indexOf(b.system) ||
          a.key.localeCompare(b.key),
      );
    let current: Row | null = null;
    for (const item of members) {
      const w = item.max[0] - item.min[0];
      const d = item.max[2] - item.min[2];
      if (!current || current.width + GAP + w > MAX_ROW) {
        current = {
          label: current ? "" : row.label,
          items: [],
          width: -GAP,
          depth: 0,
        };
        rows.push(current);
      }
      current.items.push(item);
      current.width += GAP + w;
      current.depth = Math.max(current.depth, d);
    }
  }
  const total =
    rows.reduce((sum, row) => sum + row.depth, 0) +
    ROW_GAP * Math.max(0, rows.length - 1);
  // Rows sit behind the bay (−Z), away from the default camera.
  let z = BUILD_BAY.z0 - ROW_GAP - total;
  const top = z;
  let widest = 0;
  for (const row of rows) {
    const zc = z + row.depth / 2;
    let x = row.width / 2;
    // Items run from +X to −X, the same way the car faces.
    let run: {
      system: SystemId;
      count: number;
      x0: number;
      x1: number;
    } | null = null;
    const closeRun = () => {
      if (run)
        tags.push({
          system: run.system,
          count: run.count,
          x: (run.x0 + run.x1) / 2,
          z: z + row.depth + 0.04,
        });
    };
    for (const item of row.items) {
      const w = item.max[0] - item.min[0];
      const cx = (item.min[0] + item.max[0]) / 2;
      const cz = (item.min[2] + item.max[2]) / 2;
      offsets.set(item.key, [x - w / 2 - cx, -item.min[1], zc - cz]);
      if (run && run.system === item.system) {
        run.count++;
        run.x1 = x - w;
      } else {
        closeRun();
        run = { system: item.system, count: 1, x0: x, x1: x - w };
      }
      x -= w + GAP;
    }
    closeRun();
    zones.push({
      label: row.label,
      x0: -row.width / 2 - 0.18,
      x1: row.width / 2 + 0.18,
      z0: z - 0.18,
      z1: z + row.depth + 0.18,
    });
    widest = Math.max(widest, row.width);
    z += row.depth + ROW_GAP;
  }
  const body = items.find((item) => item.system === "body");
  const bodyOffset = body && offsets.get(body.key);
  for (const item of items)
    if (item.system === "lights")
      offsets.set(item.key, bodyOffset ?? [0, 0, 0]);
  zones.push({ label: "Build bay", ...BUILD_BAY });
  const half = Math.max(widest / 2 + 0.18, BUILD_BAY.x1);
  return {
    offsets,
    zones,
    tags,
    bounds: { x0: -half, x1: half, z0: top - 0.18, z1: BUILD_BAY.z1 },
  };
}

// Playback clock --------------------------------------------------------------

export const BUILD_SECONDS = 13;

/** Build progress that lives outside React so playback does not re-render the page. */
export function createBuildClock(initial = 1) {
  let value = initial;
  let playing = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    get: () => value,
    isPlaying: () => playing,
    set(next: number) {
      value = clamp01(next);
      emit();
    },
    play() {
      if (value >= 1) value = 0;
      playing = true;
      emit();
    },
    pause() {
      playing = false;
      emit();
    },
    /** Advances playback; returns true while it is still running. */
    tick(seconds: number) {
      if (!playing) return false;
      value = clamp01(value + seconds / BUILD_SECONDS);
      if (value >= 1) playing = false;
      emit();
      return playing;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
export type BuildClock = ReturnType<typeof createBuildClock>;
