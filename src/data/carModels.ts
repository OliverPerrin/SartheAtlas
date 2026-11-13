/**
 * Cars whose exterior is a modelled mesh in public/models, authored by the
 * Blender scripts in tools/blender. Every other car draws the procedural
 * study body. The procedural `Body` stays the dimensional skeleton for both:
 * wheels, internals and callouts are placed from it.
 */
export const modelledCars: readonly string[] = [
  "porsche",
  "vantage",
  "m4",
  "corvette",
  "296",
  "mclaren",
  "mercedes",
  "ford",
  "lexus",
];

export const hasModel = (id: string) => modelledCars.includes(id);

/** `light` is the reduced mesh used for cars seen from the air. */
export const modelUrl = (id: string, light = false) =>
  `${import.meta.env?.BASE_URL ?? "/"}models/${id}${light ? ".lod" : ""}.glb`;
