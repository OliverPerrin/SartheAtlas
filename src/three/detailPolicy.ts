import type { SystemId } from "../data/systems.ts";

export type DetailIntent = {
  xray: boolean;
  bodyRemoved?: boolean;
  wheelsRemoved?: boolean;
  sectioned?: boolean;
  inspection?: boolean;
  /** Garage layout or build sequence: every assembly is on show. */
  teardown?: boolean;
  selected: SystemId | null;
};

const inside: ReadonlySet<SystemId> = new Set([
  "chassis",
  "cockpit",
  "fuel",
  "engine",
  "gearbox",
  "hybrid",
  "cooling",
]);

// An opaque assembled shell cannot show most of the educational machinery.
// Geometry is created on reveal intent, rather than merely hidden after upload.
export function studyDetailPolicy(view: DetailIntent, exploded: number) {
  const revealed = Boolean(
    view.xray ||
    view.bodyRemoved ||
    view.sectioned ||
    view.inspection ||
    view.teardown ||
    exploded > 0.001,
  );
  const internals =
    revealed || Boolean(view.selected && inside.has(view.selected));
  const wheelEnds =
    revealed ||
    Boolean(view.wheelsRemoved) ||
    view.selected === "brakes" ||
    view.selected === "suspension";
  return { internals, wheelEnds };
}
