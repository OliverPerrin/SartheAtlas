import type { Shape } from "./shapes.ts";

export type SkinPoint = [number, number];

// One definition drives the shell apertures and the conformal glazing meshes.
// These are illustrative openings on the procedural study, not surveyed glass.
export function glazingPanels(shape: Shape): SkinPoint[][] {
  const { from, to, roof } = shape.cockpit;
  if (shape.body.kind === "gt" && shape.glass) {
    // On the GT skin the roof rail is v = 0.85: the windscreen and rear glass
    // lie inboard of it, the side glass below it. Between the windscreen base
    // and its top the side band opens from nothing, which gives the side
    // glass its raked leading edge without any help from these outlines.
    const { header, back, deck, pillar } = shape.glass;
    const fall = deck - back;
    return [
      [
        [from + 0.014, 0.875],
        [header - 0.012, 0.868],
        [header - 0.012, 1],
        [from + 0.014, 1],
      ],
      [
        [from + 0.03, 0.748],
        [pillar - 0.007, 0.74],
        [pillar - 0.007, 0.84],
        [header - 0.02, 0.84],
        [from + 0.05, 0.834],
      ],
      [
        [pillar + 0.007, 0.74],
        [to, 0.745],
        [back + fall * 0.3, 0.835],
        [pillar + 0.007, 0.84],
      ],
      [
        [back + 0.014, 0.872],
        [deck - 0.016, 0.885],
        [deck - 0.016, 1],
        [back + 0.014, 1],
      ],
    ];
  }
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
