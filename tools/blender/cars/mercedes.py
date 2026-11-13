"""Mercedes-AMG GT3 Evo.

What makes it an AMG GT: a bonnet that takes up nearly half the car, a wide
grille of vertical bars, the cabin set far back over the rear axle, a short
rounded tail with slim horizontal lamps, and exhausts in the sills.
"""
from carlib import oval, rrect, stroke  # noqa: F401

L = 4.75
FA = 0.95
RA = FA + 2.63
SPEC = {
    "id": "mercedes",
    "file": "mercedes",
    "L": L,
    "W": 2.04,
    "H": 1.22,
    "wheelbase": 2.63,
    "front_axle": FA,
    "preview_paint": (0.07, 0.07, 0.08),
    "cabin": {"cowl": 1.76, "header": 2.45, "pillar": 2.9, "pillar_w": 0.02, "back": 3.0, "side_end": 3.35, "glass_end": 3.65, "deck": 3.75},
    "curves": {
        "top": [(0, 0.56), (0.05, 0.62), (0.3, 0.7), (FA, 0.775), (1.5, 0.8), (1.76, 0.825), (2.45, 1.17), (2.65, 1.22), (2.95, 1.2), (3.35, 1.07), (3.75, 0.94), (4.3, 0.9), (L, 0.84)],
        "edge_y": [(0, 0.54), (0.1, 0.62), (0.3, 0.69), (FA, 0.765), (1.5, 0.795), (1.76, 0.82), (2.3, 0.86), (2.9, 0.9), (3.35, 0.93), (3.75, 0.92), (4.3, 0.89), (L, 0.83)],
        "edge_z": [(0, 0.35), (0.1, 0.46), (0.3, 0.55), (FA, 0.62), (1.5, 0.68), (1.76, 0.72), (2.2, 0.73), (2.9, 0.73), (3.35, 0.68), (3.75, 0.62), (4.4, 0.6), (L, 0.4)],
        "crest_y": [(0, 0.52), (0.06, 0.63), (0.15, 0.71), (0.3, 0.76), (FA, 0.8), (1.5, 0.82), (2.9, 0.88), (3.3, 0.91), (RA, 0.93), (4.2, 0.9), (L, 0.83)],
        "crest_z": [(0, 0.4), (0.06, 0.58), (0.15, 0.7), (0.3, 0.76), (FA, 0.82), (1.6, 0.8), (2.9, 0.83), (3.3, 0.87), (RA, 0.89), (4.3, 0.82), (L, 0.5)],
        "half": [(0, 0.5), (0.03, 0.66), (0.1, 0.82), (0.22, 0.92), (0.45, 0.98), (FA, 1.02), (1.5, 0.96), (2.2, 0.93), (2.9, 0.95), (3.3, 1.0), (RA, 1.02), (4.1, 1.0), (4.4, 0.94), (4.6, 0.84), (4.7, 0.7), (L, 0.55)],
        "belly_y": [(0, 0.4), (0.3, 0.46), (FA, 0.5), (2.8, 0.5), (RA, 0.56), (L, 0.6)],
        "sill_y": [(0, 0.22), (0.08, 0.17), (0.3, 0.13), (0.5, 0.12), (4.2, 0.12), (4.45, 0.22), (L, 0.38)],
        "tuck": [(0, 0.02), (1.5, 0.05), (3.0, 0.05), (L, 0.02)],
        "rail_y": [(1.76, 0.84), (2.45, 1.13), (2.65, 1.18), (3.0, 1.16), (3.2, 1.07), (3.35, 0.96), (3.55, 0.945), (3.75, 0.93)],
        "rail_z": [(1.76, 0.7), (2.45, 0.55), (2.65, 0.54), (3.0, 0.52), (3.35, 0.5), (3.75, 0.48)],
        "rail_w": [(1.76, 0.04), (2.45, 0.05), (3.75, 0.05)],
    },
    "creases": [("edge", 1.76, 3.35, 0.5), ("rail_lo", 1.8, 3.35, 0.45), ("rail_hi", 1.8, 3.65, 0.45), ("inner", 0.2, 1.6, 0.3)],
    "stations": [1.25, 2.65, 3.2],
}


def details(car):
    car.common((2.38, 0.5, 0.2, 0.86), (1.95, 0.93))
    # The grille of vertical bars, with the star in the middle of it.
    car.pocket("grille", "mesh", (0.0, 0.44, 0), (1, 0, 0), [[(-0.54, -0.11), (0.54, -0.11), (0.47, 0.14), (-0.47, 0.14)]], sink=0.1, mirror=False, slats=(13, "chrome", 0.016, "u"))
    car.tube("star", "chrome", [car.bl(0.035, 0.45, 0), car.bl(0.05, 0.45, 0)], radius=0.085, segments=24)
    car.pocket("intake_low", "mesh", (0.02, 0.26, 0), (1, 0, 0), [rrect(-0.6, -0.045, 0.6, 0.045, 0.02)], sink=0.08, mirror=False)
    lamp = (0.3, 0.75, 0.76)
    look = (0.82, -0.57, 0.0)
    car.decal("lamp_lens", "lens", lamp, look, [[(-0.17, -0.06), (0.12, -0.03), (0.2, 0.07), (-0.05, 0.085)]])
    car.decal("lamp_led", "lamp_front", lamp, look, stroke([(-0.14, -0.035), (0.1, -0.008), (0.17, 0.055)], 0.016) + [oval(-0.02, 0.03, 0.04, 0.035, 12)], offset=0.005)
    # The long bonnet carries two outlets; the wings a tall vent behind the wheel.
    car.pocket("bonnet_vent", "dark", (1.15, 0.9, 0.24), (0, -1, 0), [rrect(-0.2, -0.13, 0.22, 0.13, 0.04)], sink=0.05, slats=(4, "trim", 0.03, "u"))
    car.pocket("side_vent", "dark", (1.5, 0.52, 1.0), (0, 0, -1), [[(-0.1, -0.2), (0.07, -0.2), (0.12, 0.16), (-0.05, 0.16)]], sink=0.07, slats=(3, "trim", 0.02, "v"))
    car.decal("tail_lamp", "lamp_rear", (L, 0.82, 0), (-1, 0, 0), [[(0.24, -0.03), (0.84, -0.015), (0.86, 0.035), (0.24, 0.02)]], depth=0.5)
    car.pocket("tail_mesh", "mesh", (L, 0.62, 0), (-1, 0, 0), [rrect(-0.6, -0.08, 0.6, 0.08, 0.03)], sink=0.06, mirror=False, depth=0.5)
    for side in (1, -1):
        car.tube("side_exhaust", "chrome", [car.bl(2.95, 0.17, 0.9 * side), car.bl(2.95, 0.17, 1.0 * side)], radius=0.05, segments=14)


def preview(car):
    car.preview_all(4.5, 1.26)
