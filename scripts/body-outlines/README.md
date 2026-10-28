# Reference body outlines

`src/data/bodyOutlines.ts` holds coarse side and plan outlines of the
creator-hosted exterior references, used by `src/three/bodyFit.ts` to bend each
procedural study toward its reference. Only 41 heights and widths per car are
stored; no mesh, texture or image data is kept.

Refreshing them is a manual, network-dependent process (it is not part of the
build or CI):

1. Serve `harness.html` from this folder (any static server, for example
   `python3 -m http.server 4330`). It loads one model through the public
   Sketchfab Viewer API with a transparent background.
2. Drive a Chromium browser over the DevTools protocol with `capture.mjs`
   (`CAR`, `ID` and the model's tuning from `src/data/exteriorTuning.ts`). It
   finds the side direction, frames the car with a 12° field of view and
   records the side and plan silhouettes against magenta and green backdrops.
   Some models need an overhead camera instead of rotating the model
   (`PLANCAM`), or a manual camera target (`TARGET`).
3. Read each car's axle centres off ruled side-view crops into `axles.json`
   and its nose direction into `front.json`. Automatic axle detection was
   unreliable on dark or shadowed tyres.
4. `analyze.mjs` scales each silhouette to the catalogue wheelbase at the
   axles and samples the top height and the plan half-width (measured along
   the plan silhouette's principal axis) at 41 stations. `params.mjs` derives
   cabin landmarks (windscreen base, roof start/end, rear-window end) that
   were applied by hand to `src/three/shapes.ts`. `until.json` limits the
   height fit: GT cars up to the deck ahead of the rear wing; prototypes up to
   the windscreen base, so the designed canopy keeps its shape.
5. `emit.mjs` writes `src/data/bodyOutlines.ts`.

The scripts were written as one-off tooling and expect their working files in
`/tmp/sa-qa/sil/`; adjust the paths before re-running.
