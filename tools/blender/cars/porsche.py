"""Porsche 911 GT3 R (992).

What makes it a 911: oval lamps on front wings that stand above a low
bonnet, one arc of roof from the windscreen header to the tail, a teardrop
side window, hips wider than the cabin, a light bar across the whole tail.
"""

L = 4.62
SPEC = {
    "id": "porsche",
    "file": "porsche",
    "L": L,
    "W": 2.05,
    "H": 1.27,
    "wheelbase": 2.507,
    "front_axle": 1.053,
    "preview_paint": (0.83, 0.78, 0.1),
    "cabin": {"cowl": 1.57, "header": 2.2, "pillar": 2.77, "pillar_w": 0.02, "back": 3.08, "side_end": 3.36, "glass_end": 3.66, "deck": 4.2},
    "curves": {
        "top": [(0, 0.53), (0.06, 0.595), (0.2, 0.655), (0.5, 0.715), (1.05, 0.79), (1.4, 0.855), (1.57, 0.9), (2.2, 1.215), (2.5, 1.27), (2.8, 1.262), (3.1, 1.215), (3.4, 1.13), (3.7, 1.025), (4.0, 0.935), (4.25, 0.885), (4.48, 0.865), (4.58, 0.84), (L, 0.8)],
        "edge_z": [(0, 0.2), (0.1, 0.34), (0.3, 0.42), (0.6, 0.47), (1.05, 0.52), (1.4, 0.64), (1.57, 0.73), (1.9, 0.745), (2.75, 0.75), (3.1, 0.72), (3.41, 0.66), (4.2, 0.6), (4.45, 0.58), (L, 0.3)],
        "edge_y": [(0, 0.5), (0.1, 0.6), (0.3, 0.66), (0.6, 0.71), (1.05, 0.775), (1.4, 0.85), (1.57, 0.895), (2.1, 0.91), (2.75, 0.93), (3.1, 0.95), (3.38, 0.968), (3.9, 0.93), (4.2, 0.875), (4.45, 0.855), (L, 0.795)],
        "crest_z": [(0, 0.3), (0.06, 0.5), (0.15, 0.61), (0.3, 0.67), (1.05, 0.76), (1.5, 0.8), (1.9, 0.82), (2.75, 0.84), (3.15, 0.86), (3.56, 0.88), (4.1, 0.82), (4.42, 0.72), (L, 0.36)],
        "crest_y": [(0, 0.5), (0.06, 0.64), (0.15, 0.735), (0.3, 0.79), (0.6, 0.83), (1.05, 0.85), (1.4, 0.875), (1.7, 0.89), (2.75, 0.905), (3.15, 0.93), (3.56, 0.945), (4.0, 0.91), (4.42, 0.86), (L, 0.79)],
        "half": [(0, 0.42), (0.03, 0.56), (0.1, 0.72), (0.22, 0.86), (0.45, 0.95), (0.75, 0.99), (1.05, 1.0), (1.5, 0.955), (2.0, 0.92), (2.75, 0.925), (3.2, 0.98), (3.56, 1.025), (4.0, 1.01), (4.25, 0.96), (4.42, 0.87), (4.53, 0.75), (4.6, 0.6), (L, 0.44)],
        "belly_y": [(0, 0.4), (0.3, 0.46), (1.05, 0.52), (2.6, 0.52), (3.56, 0.56), (L, 0.58)],
        "sill_y": [(0, 0.24), (0.08, 0.18), (0.3, 0.14), (0.5, 0.12), (4.05, 0.12), (4.3, 0.22), (L, 0.36)],
        "tuck": [(0, 0.02), (1.5, 0.06), (2.9, 0.06), (L, 0.02)],
        "rail_y": [(1.57, 0.915), (2.2, 1.185), (2.5, 1.235), (2.8, 1.222), (3.05, 1.175), (3.25, 1.08), (3.38, 0.995), (3.7, 0.985), (4.0, 0.92), (4.2, 0.88)],
        "rail_z": [(1.57, 0.7), (2.2, 0.57), (2.5, 0.555), (3.05, 0.54), (3.38, 0.53), (3.9, 0.5), (4.2, 0.5)],
        "rail_w": [(1.57, 0.04), (2.25, 0.05), (4.2, 0.05)],
    },
    "creases": [("edge", 1.57, 3.36, 0.5), ("rail_lo", 1.62, 3.36, 0.45), ("rail_hi", 1.62, 3.66, 0.45)],
    "stations": [2.5, 2.8, 3.22],
}


from carlib import oval, rrect, stroke  # noqa: E402


def details(car):
    car.arch_lips()
    car.wheel_wells()
    # Face: oval lamps on the wings, a wide low intake, corner intakes.
    lamp = (0.2, 0.7, 0.655)
    look = (0.95, -0.3, 0.0)
    car.decal("lamp_lens", "lens", lamp, look, [oval(0, 0, 0.12, 0.125, 28)])
    car.decal("lamp_ring", "chrome", lamp, look, [oval(0, 0, 0.132, 0.137, 28)], offset=0.002)
    car.decal("lamp_led", "lamp_front", lamp, look, [oval(u, v, 0.022, 0.03, 10) for u in (-0.05, 0.05) for v in (-0.05, 0.05)], offset=0.005)
    car.pocket("intake", "mesh", (0.02, 0.36, 0), (1, 0, 0), [rrect(-0.5, -0.07, 0.5, 0.09, 0.03)], sink=0.1, mirror=False, slats=(3, "trim", 0.012, "v"))
    car.pocket("intake_side", "mesh", (0.2, 0.4, 0.72), (0.8, 0, -0.6), [[(-0.13, -0.09), (0.15, -0.07), (0.15, 0.08), (-0.11, 0.05)]], sink=0.08)
    # Bonnet: two outlets ahead of the screen; louvres over the front wheels.
    car.pocket("bonnet_vent", "dark", (1.08, 0.9, 0.26), (0, -1, 0), [rrect(-0.1, -0.11, 0.1, 0.11, 0.03)], sink=0.05)
    car.pocket("wing_louvres", "dark", (1.05, 0.9, 0.86), (0, -1, 0), [rrect(-0.19 + i * 0.1, -0.07, -0.13 + i * 0.1, 0.07, 0.012) for i in range(4)], sink=0.03)
    # Doors and sills.
    car.decal("door", "dark", (2.22, 0.5, 1.0), (0, 0, -1), stroke([(-0.6, 0.38), (-0.62, 0.0), (-0.55, -0.34), (0.5, -0.34), (0.56, 0.0), (0.52, 0.4)], 0.008), offset=0.002)
    # Tail: a light bar from corner to corner, the lid grille, the diffuser.
    car.decal("light_bar", "lamp_rear", (L, 0.8, 0), (-1, 0, 0), [rrect(-0.95, -0.02, 0.95, 0.02, 0.0)], mirror=False, depth=0.5)
    car.decal("light_bar_side", "lamp_rear", (4.45, 0.8, 0.9), (-0.5, 0, -0.85), [rrect(-0.2, -0.02, 0.22, 0.02, 0.0)], depth=0.4)
    car.pocket("lid_grille", "mesh", (3.97, 1.0, 0), (0, -1, 0), [rrect(-0.24, -0.4, 0.2, 0.4, 0.05)], sink=0.04, mirror=False, slats=(11, "trim", 0.024, "v"))
    car.pocket("diffuser", "trim", (L, 0.42, 0), (-1, 0, 0), [[(-0.72, -0.1), (0.72, -0.1), (0.62, 0.12), (-0.62, 0.12)]], sink=0.07, mirror=False, depth=0.5)
    for z in (-0.09, 0.09):
        car.tube("exhaust", "chrome", [car.bl(L - 0.1, 0.42, z), car.bl(L + 0.03, 0.42, z)], radius=0.05, segments=16)
    # Mirrors on the doors.
    for side in (1, -1):
        car.blob("mirror", "paint", (1.76, 1.0, 1.0 * side), (0.17, 0.1, 0.2))
        car.tube("mirror_stalk", "trim", [car.bl(1.79, 0.93, 0.83 * side), car.bl(1.77, 0.97, 0.95 * side)], radius=0.014)


def preview(car):
    car.preview_wheels()
    car.preview_floor()
    car.preview_wing(4.4, 1.3)
