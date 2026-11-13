"""BMW M4 GT3 Evo.

What makes it an M4: two tall kidney grilles that fill the nose, slim lamps
either side of them, a long three-box coupé with a Hofmeister kink in the
rear side window, a domed and vented bonnet, a tall square tail with
L-shaped lamps.
"""
from carlib import rrect, stroke

L = 4.9
FA = 0.931
RA = FA + 2.92
SPEC = {
    "id": "m4",
    "file": "m4",
    "L": L,
    "W": 2.05,
    "H": 1.36,
    "wheelbase": 2.92,
    "front_axle": FA,
    "preview_paint": (0.85, 0.85, 0.86),
    "cabin": {"cowl": 1.5, "header": 2.3, "pillar": 3.0, "pillar_w": 0.025, "back": 3.25, "side_end": 3.72, "glass_end": 4.0, "deck": 4.05},
    "curves": {
        "top": [(0, 0.6), (0.05, 0.68), (0.3, 0.78), (FA, 0.875), (1.3, 0.92), (1.5, 0.95), (2.3, 1.31), (2.75, 1.36), (3.25, 1.34), (3.6, 1.26), (4.05, 1.12), (4.5, 1.105), (4.84, 1.1), (L, 1.08)],
        "edge_y": [(0, 0.58), (0.1, 0.68), (0.3, 0.76), (FA, 0.855), (1.5, 0.94), (2.2, 0.96), (3.0, 0.985), (3.5, 1.0), (3.72, 1.01), (4.05, 1.08), (4.5, 1.08), (L, 1.04)],
        "edge_z": [(0, 0.4), (0.1, 0.52), (0.3, 0.6), (FA, 0.68), (1.5, 0.76), (2.0, 0.77), (3.0, 0.77), (3.72, 0.74), (4.05, 0.7), (4.6, 0.68), (L, 0.5)],
        "crest_y": [(0, 0.56), (0.06, 0.68), (0.15, 0.76), (0.3, 0.81), (FA, 0.875), (1.5, 0.92), (3.0, 0.955), (3.5, 0.99), (RA, 1.02), (4.4, 1.04), (L, 1.0)],
        "crest_z": [(0, 0.45), (0.06, 0.62), (0.15, 0.74), (0.3, 0.8), (FA, 0.86), (1.5, 0.85), (3.0, 0.86), (RA, 0.9), (4.5, 0.86), (L, 0.6)],
        "half": [(0, 0.6), (0.03, 0.74), (0.1, 0.88), (0.22, 0.96), (0.45, 1.0), (FA, 1.025), (1.5, 0.975), (2.2, 0.955), (3.0, 0.96), (3.5, 1.0), (RA, 1.025), (4.4, 1.01), (4.68, 0.98), (4.82, 0.92), (4.88, 0.82), (L, 0.7)],
        "belly_y": [(0, 0.42), (0.3, 0.48), (FA, 0.54), (2.8, 0.54), (RA, 0.6), (L, 0.64)],
        "sill_y": [(0, 0.22), (0.08, 0.17), (0.3, 0.13), (0.5, 0.12), (4.3, 0.12), (4.6, 0.24), (L, 0.4)],
        "tuck": [(0, 0.02), (1.5, 0.05), (3.2, 0.05), (L, 0.02)],
        "rail_y": [(1.5, 0.96), (2.3, 1.27), (2.75, 1.32), (3.25, 1.3), (3.6, 1.22), (3.72, 1.19), (4.05, 1.1)],
        "rail_z": [(1.5, 0.74), (2.3, 0.6), (2.75, 0.59), (3.25, 0.58), (3.72, 0.57), (4.05, 0.6)],
        "rail_w": [(1.5, 0.04), (2.3, 0.05), (4.05, 0.05)],
    },
    "creases": [("edge", 1.5, 3.72, 0.55), ("rail_lo", 1.55, 3.72, 0.5), ("rail_hi", 1.55, 4.0, 0.5), ("crest", 0.3, 1.4, 0.35), ("crest", 3.4, L, 0.5), ("edge", 4.05, L, 0.5)],
    "stations": [2.75, 3.5],
}


def details(car):
    car.arch_lips()
    car.wheel_wells()
    # Two tall kidneys make the face.
    kidney = [(0.035, -0.19), (0.3, -0.19), (0.37, -0.06), (0.35, 0.19), (0.035, 0.19)]
    car.pocket("kidney", "mesh", (0.0, 0.5, 0), (1, 0, 0), [kidney], sink=0.1, slats=(7, "trim", 0.012, "v"))
    car.decal("kidney_frame", "trim", (0.0, 0.5, 0), (1, 0, 0), stroke(kidney + kidney[:1], 0.022), offset=0.004)
    car.pocket("intake_side", "mesh", (0.15, 0.36, 0.72), (0.85, 0, -0.5), [[(-0.16, -0.1), (0.16, -0.08), (0.16, 0.09), (-0.14, 0.06)]], sink=0.08)
    lamp = (0.2, 0.78, 0.76)
    look = (0.9, -0.42, 0.0)
    car.decal("lamp_lens", "lens", lamp, look, [[(-0.15, -0.035), (0.13, -0.05), (0.17, 0.035), (-0.1, 0.055)]])
    car.decal("lamp_led", "lamp_front", lamp, look, [rrect(u - 0.045, -0.022, u + 0.045, 0.028, 0.014) for u in (-0.06, 0.06)], offset=0.005)
    car.pocket("bonnet_vent", "dark", (1.02, 1.0, 0), (0, -1, 0), [rrect(-0.22, -0.3, 0.26, 0.3, 0.06)], sink=0.05, mirror=False, slats=(5, "trim", 0.03, "u"))
    car.pocket("wing_louvres", "dark", (FA, 1.0, 0.9), (0, -1, 0), [rrect(-0.19 + i * 0.1, -0.07, -0.13 + i * 0.1, 0.07, 0.012) for i in range(4)], sink=0.03)
    car.pocket("side_vent", "dark", (1.45, 0.56, 1.0), (0, 0, -1), [[(-0.08, -0.16), (0.06, -0.16), (0.1, 0.12), (-0.04, 0.12)]], sink=0.06)
    car.decal("door", "dark", (2.3, 0.56, 1.0), (0, 0, -1), stroke([(-0.72, 0.38), (-0.74, 0.0), (-0.66, -0.38), (0.66, -0.38), (0.72, 0.0), (0.7, 0.4)], 0.008), offset=0.002)
    # Tail: L-shaped lamps, bumper outlets, diffuser.
    car.decal("tail_lamp", "lamp_rear", (L, 1.0, 0), (-1, 0, 0), [rrect(0.38, -0.03, 0.9, 0.03, 0.0), rrect(0.78, -0.13, 0.9, -0.03, 0.0)], depth=0.5)
    car.pocket("tail_outlet", "mesh", (L, 0.62, 0.52), (-1, 0, 0), [rrect(-0.24, -0.1, 0.24, 0.1, 0.03)], sink=0.06, depth=0.5)
    car.pocket("diffuser", "trim", (L, 0.44, 0), (-1, 0, 0), [[(-0.72, -0.08), (0.72, -0.08), (0.64, 0.08), (-0.64, 0.08)]], sink=0.07, mirror=False, depth=0.5)
    for side in (1, -1):
        car.blob("mirror", "paint", (1.72, 1.07, 1.0 * side), (0.18, 0.11, 0.2))
        car.tube("mirror_stalk", "trim", [car.bl(1.75, 0.98, 0.84 * side), car.bl(1.73, 1.04, 0.95 * side)], radius=0.014)


def preview(car):
    car.preview_wheels()
    car.preview_floor()
    car.preview_wing(4.72, 1.42)
