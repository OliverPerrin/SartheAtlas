import type { Shape } from "./shapes.ts";

export type SkinPoint = [number, number];

// One definition drives the shell apertures and the conformal glazing meshes.
// These are illustrative openings on the procedural study, not surveyed glass.
export function glazingPanels(shape: Shape): SkinPoint[][] {
  const { from, to, roof } = shape.cockpit;
  return shape.body.kind === "gt"
    ? [
        [
          [from, 0.73],
          [roof - 0.035, 0.97],
          [roof - 0.035, 1],
          [from - 0.01, 1],
        ],
        [
          [from + 0.035, 0.735],
          [to - 0.03, 0.735],
          [to - 0.07, 0.84],
          [roof - 0.02, 0.845],
        ],
        [
          [to + 0.005, 0.86],
          [to + 0.115, 0.87],
          [to + 0.115, 1],
          [to + 0.005, 1],
        ],
      ]
    : [
        [
          [from, 0.745],
          [roof - 0.055, 0.9],
          [roof - 0.055, 1],
          [from - 0.005, 1],
        ],
        [
          [from + 0.055, 0.74],
          [to, 0.745],
          [to - 0.025, 0.86],
          [roof - 0.065, 0.865],
        ],
      ];
}
