# Modelled car exteriors

The cars listed in `src/data/carModels.ts` draw a modelled exterior from
`public/models/<id>.glb` instead of the procedural study body. The meshes are
authored by the Python scripts in this folder, run headless in
[Blender](https://www.blender.org/) (free, GPL; version 5.3 was used).

```sh
npm run models:build                 # every car in tools/blender/cars
npm run models:build -- porsche      # one car
npm run models:build -- porsche --render /tmp/previews   # plus preview renders
```

Set `BLENDER` to the executable if it is not in the default location. The
build is reproducible from this repository alone: no mesh, texture or image
is read from anywhere else.

## How a car is built

- `carlib.py` builds a subdivision-surface cage from a spec. Rows run round
  the section from sill to roof centreline and have fixed meanings (`ROWS`);
  stations run along the car and are placed at the wheel arches, pillars and
  bumper ends. Faces between the belt, the roof rail and the centreline are
  split off as glass, which leaves the pillars and roof as painted shell.
- Lamps, intakes, vents, grilles and shut lines are patches cut from the
  finished shell through convex outlines (`Car.decal`), so they follow the
  surface exactly. Mirrors, arch lips, wheel-well liners and exhausts are
  separate solids.
- `cars/<id>.py` holds one car: its dimensions, its profile and plan curves in
  metres from the nose, and its details. Wheels, wing, floor and everything
  inside the car stay procedural in the app.
- `build.py` writes plain GLB files to `.build/` (a full mesh and a light one
  for cars seen from the air). `pack.mjs` quantises and meshopt-compresses
  them into `public/models`, keeping only material names.

## Contract with the app

- Frame: x forward, y up, z to the right, origin on the ground under the
  middle of the car. Length, width and axle positions match the car's
  `BodySpec` in `src/three/shapes.ts`, which stays the skeleton for wheels,
  internals and callouts.
- One mesh per material name: `shell`, `glass`, `paint` (body-colour solids),
  `trim`, `dark`, `mesh`, `chrome`, `lens`, `lamp_front`, `lamp_rear`, `amber`.
- The shell's UVs are the livery layout of `src/three/livery.ts`: `t` is 0 at
  the nose and 1 at the tail, `v` is 0.2 at the sill and 1 on the roof
  centreline, and each side of the car has its own half of the texture.

Reference photographs were looked at while writing the specs. None is stored
here and nothing was traced from them beyond overall dimensions.
