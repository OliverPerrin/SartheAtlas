# Hosted exterior presentation audit

Checked 1 October 2026 in the native T3 preview, using the public Sketchfab Viewer SDK and the application on localhost. This audit changes runtime presentation only; no meshes, texture files, paid assets or credentials were acquired.

## Aston reference

The existing model `7daa766d301f4d489312b0922d4bdc0d` remains explicitly labelled as the related Valkyrie LM reference. Its actual geometry, manufacturer accuracy and exact variant identity are not newly certified by this material audit.

The supported `getMaterialList` call confirmed these finish defects:

| Material | Source metalness | Source roughness | Runtime correction |
| --- | --- | --- | --- |
| `EXT_TYRE` | 0.8700979 | 0.6201924 | metalness 0, roughness 0.88; retained pale tyre/marking atlas scaled to 0.28 |
| `CHASSIS_CARBON` | 1 | 0.2361912 | metalness 0.03, roughness 0.5 |
| `EXT_GLASS` | 0.943241 | 0.0716193, mapped | metalness 0; coating 0.3, coating roughness 0.08 |

These are calibrated presentation choices, not manufacturer material measurements. A colour-only tyre tint did not sufficiently correct the mapped atlas in the live render, so its documented albedo factor is scaled instead. The original tyre markings remain in that atlas, although their brightness is reduced with the rubber. Body paint and livery channels are unchanged.

Application SDK readback confirmed all three corrected material factors. Albedo texture IDs remained `3af6c501bf9448fba0583f4d952fb83e` (tyre), `48bf6b5c720a4260942d63948f111318` (carbon) and `470a8d64774a485fbd99b1f7fadb5d72` (glass). Glass opacity factor remains 1 with the original alpha texture/UV binding; body paint albedo factor remains 0.5470493 and texture `06fb5dcfee01459fa15fcf8e87413cf9`.

The source also enabled chromatic aberration, causing artificial colour separation around fine edges. The viewer now disables that existing filter alongside grain, sharpening, bloom and depth of field. Application `getPostProcessing` confirmed all five false. Original environment HDR and genuine texture detail are retained.

## Camera and scene preparation

The viewer waits for exact-node hide acknowledgements, material repairs and its initial fitted camera pose before marking itself ready. This prevents fitting duplicate/reflection geometry and prevents the turntable starting against an unfinished pose. The reset camera is captured after the fitted move, replacing the former delayed capture that could save a user's later orbit/zoom as the initial camera.

On the BMW M Hybrid V8 reference `9871477854b64e82bd43438eb9b940fd`, zoom followed by Reset returned to the original camera with maximum coordinate error `4.44e-16`. Repeating Fit returned maximum coordinate error `0`. Active turntable time now pauses while the page is hidden or the model is offscreen, avoiding a large resumed camera jump.

The M4 application viewer acknowledged all 99 exact-node hides and the `GLTF_SceneRootNode` up-axis correction before reaching ready. Native preview showed one upright car. Its turntable changed the observed camera position while retaining the orbital distance within 0.001 model units during interpolation.

## Validation and limits

The combined current suite passes all 30 tests; TypeScript/Vite build passes and lint reports no errors (existing mixed-export advisories remain). Material application has meaningful regression checks for source-record immutability, livery maps, alpha masks, normal maps, texture-coordinate bindings and mapped rubber factor scaling. Model-specific recipes remain guarded by exact source IDs.

Public hosted viewers may acknowledge scene readiness before their last HD texture finishes loading. Their own loading indicators, watermark and hint visibility remain subject to the host. Native preview screenshots can also be resampled by the preview transport; that is not evidence of the underlying model's texture resolution. Runtime improvements do not make the collection exact 2026 manufacturer CAD or matching race-entry liveries.

API reference: [Sketchfab Viewer API functions](https://sketchfab.com/developers/viewer/functions).
