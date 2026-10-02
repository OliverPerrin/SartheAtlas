# Performance

Verified locally on 1 October 2026. These measurements use the production build and the native T3 browser; they are not physical-phone FPS or production-network benchmarks.

## Startup

The homepage displays the creator's poster first. **Start 3D viewer** loads only the selected exterior. Changing the featured car unloads the previous iframe and returns to a poster. The full car explorer still opens its selected detailed exterior automatically when visible.

Three.js, MapLibre, exterior tuning, the engineering scene, catalog and sources routes are outside the initial JavaScript graph. SVG silhouettes use a renderer-independent body profile. Fonts load without blocking first paint. The homepage circuit guide loads its outline and pit route only as it approaches the viewport; it does not request elevation or building context.

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial static JavaScript, decoded | 757,366 B | 315,129 B |
| Initial static JavaScript, Node gzip | 221,874 B | 97,856 B |
| Automatic homepage exterior iframes | 1 | 0 |
| Automatic homepage circuit-data requests | Outline, context, pit route | 0 |
| First contentful paint, one local navigation | 548 ms | 208 ms |

The final static graph is approximately 58% smaller decoded and 56% smaller compressed. Byte totals include the entry and its recursively reachable static imports, excluding dynamic imports, CSS, images and fonts. Gzip uses the same Node defaults for both builds. The old build was frozen under `/tmp/sarthe-performance-before/dist` and served on port 4174; the revised build was served on 4173. Different local origins avoid sharing application assets, but third-party font/image caches may be shared. The paint timings are individual samples from the poster-first pass before responsive thumbnails were added, not a distribution or guarantee.

`npm run build` now writes Vite's manifest and runs `scripts/check-startup.mjs`. It rejects heavy viewer chunks in the startup graph and enforces a 120 KiB gzip JavaScript budget. `tests/startup.test.mjs` verifies graph traversal and the initial poster-only homepage.

## Poster images

All 18 references now retain verified 256/720/1024/1920-pixel thumbnail variants from the original host. Cards use responsive sizes, and the mobile hero uses a compact picture source. The large desktop hero retains its original image. Different thumbnail families, aspect crops and missing reviewed posters are rejected by the refresh script; existing attribution and metadata fields are preserved.

At DPR 2, the native desktop hero selected 1920 pixels, a 330-pixel card selected 720, and a 375-pixel mobile hero selected 1024. A speculative original-image request during picture mounting was also removed: fresh mobile navigation recorded only the compact Ferrari image, while resizing to desktop restored the original. For the Ferrari poster, HTTP lengths matched the source metadata:

| Image | Bytes | Reduction from original |
| --- | ---: | ---: |
| Original 1920-pixel poster | 240,886 | — |
| Mobile 1024-pixel poster | 74,160 | 69% |
| Card 720-pixel poster | 43,468 | 82% |

These are image-file sizes for this reference, not total-page transfer figures. Other references differ. Tests verify that all responsive variants retain the reviewed poster family and aspect ratio.

## Exterior viewers

- Bootstrap is serialized, cancellable and delayed until the viewer is visible. Captured frames are stopped and blanked on unload; camera-fit timers are cancelled.
- Standard textures stream first, with expensive ambient-occlusion/reflection passes disabled initially. **High detail** restores HD textures and the authored/model-specific effects. Mesh geometry, original texture bindings and material corrections are retained.
- Offscreen or hidden viewers pause rendering and turntable work. Rapid activation, car changes and unloading were exercised with no late startup or texture calls after cancellation.
- The model host controls asset availability, compression and mesh delivery. Cross-origin timing restrictions prevent reliable total download-byte measurements from the parent page. Native background-preview frame scheduling also prevents a defensible device FPS claim.

## Engineering study

Opaque, assembled cars retain visible cockpit/brake silhouettes. Detailed cockpit and mechanical modules are imported and constructed when internal selection, transparency, removal, explosion or inspection makes them visible. Sectional mechanisms remain separately gated by the housing control. Wheel spokes are instanced and their geometry/brand textures shared.

On the same assembled Ferrari study, scene inspection measured meshes **760 → 169**, renderer geometry resources **772 → 123**, texture resources **23 → 13**, and reported renderer calls **1,116 → 173**. Reported triangles fell from 546,268 to 212,242. Renderer call counts include the measured rendering passes; they are not a guaranteed per-frame budget for every view. Revealing detailed parts increases these counts intentionally. Full cutaway fidelity remains available.

Rendering uses demand frames while idle and suspends outside the viewport/hidden tabs. Contact-shadow targets are reused through pose and underside-camera changes; asynchronous detail reveals explicitly refresh cached shadows. Day/night lighting reuses its environment cube target. Repeat reveal/reset checks cover resource retention and camera/control response.

Two underside/overview cycles and two day/night cycles held exactly 123 geometry resources / 13 textures. Two Powertrain reveal/reset cycles each measured 169 meshes / 123 geometries / 13 textures assembled, 658 / 611 / 14 with the mechanisms revealed, then 169 / 123 / 13 after Reset. The mechanism meshes were present on reveal and absent after reset. No ongoing buffer growth was observed within these bounded checks.

## Circuit

- The shared outline/context loader removes duplicate context fetching. Map readiness still includes sourced terrain and all 122 route segments.
- The 14,092,562-byte building GeoJSON is requested by the map worker only after **Buildings** is enabled, once per map instance. Driving-study buildings load only when that study opens.
- Lap telemetry has a separate store. The page subscribes to section changes; visible HUD readouts subscribe independently. Pause and visibility suspension stop animation work.
- The map canvas caps device pixel ratio at 1.5. In a DPR-2 native preview its raster measured 1,898 × 1,110 instead of 2,530 × 1,480, about 44% fewer pixels. Imagery and terrain sources/resolution are unchanged.
- A spatial corridor index preserves the same 2,898 nearby driving-study buildings while reducing local selection time from 13.3 to 6.7 ms in the measured sample. Source footprints and ground elevations are preserved.
- Native checks verified one core-context fetch, one building-layer fetch across off/on toggles, valid terrain queries, pit inspection, mobile width bounds, zero paused HUD mutations and zero paused driving-study draws. Corner interaction resumed rendering.

## Reproduce

```sh
npm test
npm run lint
npm run build
npm run preview
```

Inspect a fresh homepage in browser Network/Performance panels before starting 3D. Scroll to the circuit guide, then activate an exterior, change cars and navigate away. In the engineering study compare assembled/revealed/reset resource counts. On the atlas enable Buildings, toggle it off/on, pause the lap and inspect the pit route. Use a real phone and throttled network for device-specific profiling; local preview measurements do not establish all-device performance.

The subsequent 2 October pass replaces driving-study JSON parsing/extrusion with Rust-prepared indexed meshes and caches repeated car projection calculations. See [updated measurements and reproduction steps](RUST-PERFORMANCE.md).
