# Sarthe Atlas

An independent, open-source Le Mans car and circuit explorer. Built with React, TypeScript, Three.js and React Three Fiber, with a midnight-navy, electric-blue, red and white identity inspired by modern Le Mans / WEC.

[Live site](https://sartheatlas.vercel.app) · [Contribute](CONTRIBUTING.md) · [Report a bug](https://github.com/OliverPerrin/SartheAtlas/issues/new/choose) · [License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## Run locally

Requires Node.js 24 or newer.

```sh
git clone https://github.com/OliverPerrin/SartheAtlas.git
cd SartheAtlas
npm ci
npm run dev
```

```sh
npm test
npm run lint
npm run build
npm run preview
```

The production output is `dist/`. It is a static site suitable for Vercel, Netlify or any static host. Navigation uses query parameters, so deep links need no server rewrites. No API keys or backend are required. Google Fonts, the detailed Sketchfab exterior viewers and IGN aerial/cartographic tiles use third-party requests. Elevation tiles, building data, the lap outline and the engineering cutaway are served locally.

## Contributing

Source corrections, accessibility improvements, rendering fixes and documentation are welcome. Start with [the contribution guide](CONTRIBUTING.md) for setup, project structure, checks and evidence requirements. Please discuss large changes in an issue first.

The catalogue is a dated provisional snapshot, not a live entry list. Keep source dates and uncertainty visible when contributing corrections. Original code contributions use the MIT license; third-party assets and geographic data retain their own terms.

## Included

- 18 car-family records across Hypercar, LMP2 and LMGT3, using the official 5 May 2026 provisional entry-list V2 snapshot.
- Detailed exterior view by default; separate original prototype and GT engineering studies: component selection, animated exploded view, removable / transparent bodywork, turntable and camera presets.
- 14 engineering assemblies with component-level roles, interfaces and evidence from 28 primary sources. The hybrid system is excluded for non-hybrid cars.
- Detailed cockpit, pedal box, powertrain and running-gear close views; removable bodywork and wheels expose the mechanical assemblies.
- Open housings reveals sectioned engine and transmission studies that expose pistons, rods, crank/cam hardware, shaft bearings, gear pairs and selectors. Internal dimensions, ratios, valve layout and timing remain illustrative.
- Team-inspired colour studies and Ferrari number / palette options.
- 18 attributed creator-hosted detailed exterior references, with explicit year and variant caveats.
- Georeferenced Circuit de la Sarthe atlas with IGN aerial photography, real ground relief, mapped buildings, selectable corners and an interactive elevation profile. The sourced pit route includes entry and exit, with overhead inspection and close-up controls. The separate driving study retains illustrative class lap animation.
- Responsive layout, accessible HTML alternatives for component and corner selection, WebGL fallback, source notes and asset provenance.
- Data-integrity tests and GitHub Actions build / lint / test checks.

## Accuracy and unfinished scope

**The built-in cars are educational engineering studies, not exact 2026 replicas.**

The built-in cars use car-specific silhouette parameters with shared procedural construction. Reflective glazing, headlamp housings, body seams, louvres, wheels and brakes add surface detail, but do not establish replica accuracy. The internal layouts are conceptual, not manufacturer CAD or complete parts inventories. Car-specific factual entries must not be confused with car-specific mesh accuracy. The local colour studies do not reproduce sponsor liveries. Hosted exteriors retain the source model’s own decals and race number. Sketchfab references can depict earlier bodywork, different series or unverified variants; their availability depends on the original host.

The engineering layer has car-specific architecture notes, individual component roles, assembly interfaces and 28 primary-source records. [Engineering sources](docs/ENGINEERING-SOURCES.md) distinguish documented architecture from representative meshes. The cutaway models detailed control stations, hydraulic/electrical service hardware, engine/transmission mechanisms and wheel-end assemblies; it preserves known Alpine, Toyota, Aston, Porsche and LMDh exceptions. Static instrument graphics are labelled as studies, and no proprietary telemetry or setup values are inferred.

Exact 2026 car geometry, race-entry liveries and verified internal assemblies remain outstanding. The current asset constraint is free assets only; no paid models have been purchased. See [the asset register](docs/ASSET-REGISTER.md) for candidate sources and the validation gate.

The circuit now uses IGN orthorectified aerial imagery, RGE ALTI ground elevation and 15,950 BD TOPO building footprints. Terrain uses true vertical scale by default; the optional 3× view is labelled. The profile spans approximately 45–83 m NGF-IGN69. Ground is not surveyed pavement or bridge-deck height, and footprint extrusions are not textured architectural reconstructions. Unknown building heights stay flat. The aerial mosaic's capture date is unverified; it is not live satellite imagery. The lap animation remains illustrative. See [circuit data and precision](docs/CIRCUIT-DATA.md).

## Experience and rendering

- Editorial homepage with creator posters and an explicit Start 3D viewer control; only the selected model loads.
- Stable exterior camera framing, fullscreen, fit/reset/zoom controls and optional turntable. Local engineering views also offer day/night modes.
- Detailed exterior geometry and physical lighting with verified model-bound corrections. Standard textures load first; High detail enables HD textures and richer lighting effects. The local cutaway remains a car-specific procedural illustration.
- Shareable catalog search, class filters, entry/model views and sorting.
- Accessible system controls, mobile layouts and clear separation of engineering tools from creator-hosted exterior viewers.
- Lazy-loaded routes, viewers and hidden engineering assemblies; idle scenes use demand frames and rendering pauses outside the viewport and in hidden tabs. Production builds enforce a 120 KiB gzip startup-JavaScript budget.

The performance pass reduced initial JavaScript from 757 kB to 315 kB decoded (222 kB to 98 kB gzip). Models and circuit data no longer start downloading on the initial homepage. Responsive posters reduce phone/card image downloads while retaining the original desktop hero. See [performance measurements and verification limits](docs/PERFORMANCE.md).

The driving study now loads a 785 kB Rust-prepared building mesh instead of parsing 14 MB of building GeoJSON and extruding it in the browser. Build-local car projection caching also reduces glazing construction costs while preserving exact geometry. See [the Rust preparation pipeline and benchmarks](docs/RUST-PERFORMANCE.md). Normal `npm` development/build commands require no Rust toolchain; regenerating the prepared assets uses `npm run mesh:build` after installing Rust.

`npm test` covers catalogue/entry integrity, complete exterior metadata, reference provenance, model-bound material recipes, hybrid-system visibility and finite indexed study geometry across all 18 car families, plus coordinate round-trips, measured elevation, missing-data handling, building sources and terrain manifest checks.

To refresh the public exterior metadata snapshot without downloading any mesh files:

```sh
node scripts/refresh-exterior-metadata.mjs
```

Public model thumbnails are displayed from their original host. Exterior models retain their own race numbers and liveries; choosing an entry opens an explicitly separate colour study. The Aston interactive reference is the related Valkyrie LM customer variant, with an optional artist-hosted film of a 2026 LMH.

The pit lane is a separate OpenStreetMap snapshot, refreshed with `node scripts/fetch-circuit-pitlane.mjs`. Its six connected ways retain all original vertices and real main-track junctions. The approximately 1.20 km figure includes the full entry and exit approaches. See [pit-lane provenance](docs/PITLANE-DATA.md).

To reproduce the local public IGN geography snapshot and terrain tiles:

```sh
node scripts/fetch-circuit-context.mjs
```

This fetches the public sources recorded in the context and manifest. It requires network access and can take time; cached source responses are reused. After refreshing sources, regenerate the prepared driving-study geometry with `npm run mesh:build`. The full building layer is loaded by the map worker when Buildings is enabled; the driving study loads its prepared mesh only when opened. The MapLibre worker is bundled explicitly for both development and production.

## Sources and licensing

- [FIA WEC 2026 provisional entry list V2](https://www.fiawec.com/umbrella_media/2026-fia-wec-24-hours-of-le-mans-provisional-entry-list-v2-69faef62f3d33722462224.pdf)
- [Ferrari 499P](https://www.ferrari.com/en-US/magazine/articles/ferrari-499p-the-comeback)
- [Toyota TR010 Hybrid](https://toyota-racing.com/toyota-racing-wec/)
- [Oreca 07 media kit](https://www.oreca.com/wp-content/uploads/2017/04/ORECA07_MediaKit_EN.pdf)
- [ACO circuit guide](https://www.24h-lemans.com/fr/actualites/virage-apres-virage-on-vous-decrypte-le-circuit-des-24-heures-du-mans-60667)
- [track-atlas](https://github.com/tobi/track-atlas) and © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
- © [IGN Géoplateforme](https://geoservices.ign.fr): BD ORTHO, RGE ALTI, BD TOPO and Plan IGN, [Open Licence 2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md).

Original code is MIT. The OSM track outline and IGN geography retain their separate data licences: [attribution](docs/TRACK-ATTRIBUTION.md). Creator-hosted models retain their own rights and are embedded, not redistributed. Brand and vehicle names identify the subjects; this project is not affiliated with the ACO, FIA WEC, manufacturers or teams.
