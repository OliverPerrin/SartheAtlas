// One mapping for the lift control, the part offsets and the inspection
// cameras. Values are normalised 0–1 so the existing explode state and the
// `E` shortcut keep working without another scene-level control.
export type LayerId = "bodywork" | "cooling" | "cabin" | "structure";

export type LayerStage = {
  stage: 0 | 1 | 2 | 3 | 4;
  at: number;
  label: string;
  short: string;
  detail: string;
};

export const LAYER_STAGES: readonly LayerStage[] = [
  {
    stage: 0,
    at: 0,
    label: "Assembled",
    short: "Assembled",
    detail: "Complete car, exterior panels in place.",
  },
  {
    stage: 1,
    at: 0.25,
    label: "Bodywork & wheels",
    short: "Bodywork",
    detail: "Outer skin, wing and lamps lift; wheels move outboard.",
  },
  {
    stage: 2,
    at: 0.5,
    label: "Cooling",
    short: "Cooling",
    detail: "Radiator, fan and duct assemblies clear the sidepods.",
  },
  {
    stage: 3,
    at: 0.75,
    label: "Cabin & driveline",
    short: "Cabin",
    detail: "Cockpit, engine, gearbox, fuel and hybrid modules rise.",
  },
  {
    stage: 4,
    at: 1,
    label: "Structure",
    short: "Structure",
    detail: "Survival cell and floor separate to show the deepest layer.",
  },
] as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export type LayerWeights = Record<LayerId, number>;

/**
 * A bodywork lift clears first, then the cooling stack, then the cabin and
 * driveline, and finally the structure. The cooling core starts only after the
 * fan/shroud has peeled inside CoolingAssembly (e = 0.25–0.375).
 */
export function layerWeights(exploded: number): LayerWeights {
  const e = Number.isFinite(exploded) ? clamp01(exploded) : 0;
  return {
    bodywork: smoothstep(0, 0.22, e),
    cooling: smoothstep(0.375, 0.5, e),
    cabin: smoothstep(0.5, 0.7, e),
    structure: smoothstep(0.75, 0.94, e),
  };
}

/** Nearest staged stop, used by the labelled layer buttons and readout. */
export function stageAt(exploded: number): LayerStage {
  const e = Number.isFinite(exploded) ? clamp01(exploded) : 0;
  let best = LAYER_STAGES[0];
  let distance = Infinity;
  for (const stage of LAYER_STAGES) {
    const next = Math.abs(stage.at - e);
    if (next < distance) {
      best = stage;
      distance = next;
    }
  }
  return best;
}

/** True when the continuous value sits between two staged stops. */
export function isBetweenStages(exploded: number) {
  const e = Number.isFinite(exploded) ? clamp01(exploded) : 0;
  return LAYER_STAGES.every((stage) => Math.abs(stage.at - e) > 0.005);
}
