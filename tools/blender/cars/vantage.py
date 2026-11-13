"""Aston Martin Vantage AMR GT3 Evo.

What makes it a Vantage: a grille that takes the whole nose, round lamps set
back on the wings above its corners, a long vented bonnet with the cabin
well behind the middle of the car, a strake vent behind each front wheel,
and two thin tail-light blades that curl up toward the ducktail's corners.
"""
from carlib import oval, rrect, stroke

L = 4.55
FA = 0.8645
RA = FA + 2.7
SPEC = {
    "id": "vantage",
    "file": "vantage",
    "L": L,
    "W": 2.04,
    "H": 1.2,
    "wheelbase": 2.7,
    "front_axle": FA,
    "preview_paint": (0.02, 0.25, 0.18),
    "cabin": {"cowl": 1.6, "header": 2.33, "pillar": 2.84, "pillar_w": 0.02, "back": 2.98, "side_end": 3.4, "glass_end": 3.7, "deck": 3.8},
    "curves": {
        "top": [(0, 0.52), (0.05, 0.58), (0.25, 0.66), (0.6, 0.735), (FA, 0.77), (1.3, 0.8), (1.6, 0.835), (2.33, 1.165), (2.6, 1.2), (2.9, 1.185), (3.3, 1.08), (3.75, 0.95), (4.2, 0.925), (4.45, 0.93), (L, 0.9)],
        "edge_y": [(0, 0.5), (0.1, 0.59), (0.3, 0.66), (0.6, 0.725), (FA, 0.76), (1.3, 0.795), (1.6, 0.835), (2.2, 0.86), (2.84, 0.89), (3.2, 0.915), (3.4, 0.93), (3.8, 0.925), (4.2, 0.915), (4.45, 0.92), (L, 0.88)],
        "edge_z": [(0, 0.3), (0.1, 0.42), (0.3, 0.52), (FA, 0.6), (1.3, 0.66), (1.6, 0.72), (2.0, 0.73), (2.84, 0.73), (3.2, 0.7), (3.4, 0.66), (3.8, 0.62), (4.3, 0.6), (L, 0.4)],
        "crest_y": [(0, 0.5), (0.06, 0.62), (0.15, 0.7), (0.3, 0.75), (0.6, 0.79), (FA, 0.8), (1.3, 0.82), (1.7, 0.84), (2.84, 0.87), (3.2, 0.9), (RA, 0.93), (4.0, 0.93), (4.4, 0.92), (L, 0.87)],
        "crest_z": [(0, 0.38), (0.06, 0.56), (0.15, 0.68), (0.3, 0.74), (FA, 0.8), (1.5, 0.8), (2.0, 0.81), (2.84, 0.83), (3.2, 0.86), (RA, 0.88), (4.1, 0.84), (4.4, 0.76), (L, 0.5)],
        "half": [(0, 0.5), (0.03, 0.64), (0.1, 0.8), (0.22, 0.91), (0.45, 0.98), (FA, 1.02), (1.4, 0.96), (2.0, 0.93), (2.8, 0.94), (3.2, 0.99), (RA, 1.02), (4.0, 1.01), (4.25, 0.96), (4.42, 0.86), (4.52, 0.72), (L, 0.56)],
        "belly_y": [(0, 0.38), (0.3, 0.44), (FA, 0.5), (2.6, 0.5), (RA, 0.56), (L, 0.6)],
        "sill_y": [(0, 0.22), (0.08, 0.17), (0.3, 0.13), (0.5, 0.12), (4.0, 0.12), (4.25, 0.22), (L, 0.38)],
        "tuck": [(0, 0.02), (1.5, 0.06), (2.9, 0.06), (L, 0.02)],
        "rail_y": [(1.6, 0.85), (2.33, 1.13), (2.6, 1.165), (2.9, 1.15), (3.15, 1.07), (3.4, 0.955), (3.6, 0.945), (3.8, 0.93)],
        "rail_z": [(1.6, 0.7), (2.33, 0.56), (2.6, 0.55), (2.98, 0.53), (3.4, 0.52), (3.8, 0.5)],
        "rail_w": [(1.6, 0.04), (2.33, 0.05), (3.8, 0.05)],
    },
    "creases": [("edge", 1.6, 3.4, 0.5), ("rail_lo", 1.65, 3.4, 0.45), ("rail_hi", 1.65, 3.7, 0.45), ("crest", 4.0, L, 0.5)],
    "stations": [2.6, 3.2],
}


def details(car):
    car.arch_lips()
    car.wheel_wells()
    # The grille is the face.
    car.pocket("grille", "mesh", (0.0, 0.35, 0), (1, 0, 0), [[(-0.5, -0.14), (0.5, -0.14), (0.63, -0.05), (0.56, 0.11), (-0.56, 0.11), (-0.63, -0.05)]], sink=0.12, mirror=False, slats=(5, "trim", 0.012, "v"))
    lamp = (0.34, 0.76, 0.75)
    look = (0.85, -0.52, 0.0)
    car.decal("lamp_lens", "lens", lamp, look, [oval(0, 0, 0.15, 0.1, 24, 0.3)])
    car.decal("lamp_led", "lamp_front", lamp, look, [oval(-0.03, 0, 0.06, 0.055, 16)], offset=0.005)
    car.decal("lamp_drl", "lamp_front", lamp, look, stroke([(-0.13, -0.05), (0.0, -0.085), (0.13, -0.03)], 0.014), offset=0.005)
    # Long bonnet: a central outlet and louvres over the wheels.
    car.pocket("bonnet_vent", "dark", (1.0, 0.9, 0), (0, -1, 0), [rrect(-0.22, -0.3, 0.26, 0.3, 0.06)], sink=0.05, mirror=False, slats=(5, "trim", 0.03, "u"))
    car.pocket("wing_louvres", "dark", (FA, 0.9, 0.87), (0, -1, 0), [rrect(-0.19 + i * 0.1, -0.07, -0.13 + i * 0.1, 0.07, 0.012) for i in range(4)], sink=0.03)
    # The strake vent behind the front wheel.
    car.pocket("side_vent", "dark", (1.43, 0.5, 1.0), (0, 0, -1), [[(-0.12, -0.2), (0.08, -0.25), (0.15, 0.14), (-0.05, 0.2)]], sink=0.07, slats=(1, "paint", 0.035, "v"))
    car.decal("door", "dark", (2.25, 0.5, 1.0), (0, 0, -1), stroke([(-0.6, 0.33), (-0.62, 0.0), (-0.54, -0.34), (0.55, -0.34), (0.6, 0.0), (0.58, 0.37)], 0.008), offset=0.002)
    # Tail: two light blades curling up, an open mesh panel, the diffuser.
    car.decal("tail_blade", "lamp_rear", (L, 0.89, 0), (-1, 0, 0), [[(0.18, -0.02), (0.58, -0.005), (0.58, 0.035), (0.18, 0.014)], [(0.58, -0.005), (0.82, 0.05), (0.82, 0.095), (0.58, 0.035)]], depth=0.5)
    car.pocket("tail_mesh", "mesh", (L, 0.66, 0), (-1, 0, 0), [rrect(-0.68, -0.12, 0.68, 0.12, 0.04)], sink=0.06, mirror=False, depth=0.5)
    car.pocket("diffuser", "trim", (L, 0.42, 0), (-1, 0, 0), [[(-0.7, -0.08), (0.7, -0.08), (0.62, 0.08), (-0.62, 0.08)]], sink=0.07, mirror=False, depth=0.5)
    for z in (-0.3, 0.3):
        car.tube("exhaust", "chrome", [car.bl(L - 0.1, 0.44, z), car.bl(L + 0.02, 0.44, z)], radius=0.05, segments=16)
    for side in (1, -1):
        car.blob("mirror", "paint", (1.8, 0.95, 1.0 * side), (0.17, 0.1, 0.2))
        car.tube("mirror_stalk", "trim", [car.bl(1.83, 0.87, 0.8 * side), car.bl(1.81, 0.92, 0.95 * side)], radius=0.014)


def preview(car):
    car.preview_wheels()
    car.preview_floor()
    car.preview_wing(4.3, 1.25)
