# Sarthe Atlas

An independent Le Mans car and circuit explorer. Built with React, TypeScript, Three.js and React Three Fiber, with a midnight-navy, electric-blue, red and white identity inspired by modern Le Mans / WEC.

## Run

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run lint
npm run build
npm run preview
```

The production output is `dist/`. It is a static site suitable for Vercel, Netlify or any static host. Navigation uses query parameters, so deep links need no server rewrites. No API keys or backend are required. Google Fonts and optional Sketchfab viewers use third-party requests; local engineering and circuit views do not depend on Sketchfab.

## Included

- 18 car-family records across Hypercar, LMP2 and LMGT3, using the official 5 May 2026 provisional entry-list V2 snapshot.
- Original interactive prototype and GT engineering studies: component selection, animated exploded view, removable / transparent bodywork, turntable and camera presets.
- 12 educational system topics; the hybrid system is excluded for non-hybrid cars.
- Team-inspired colour studies and Ferrari number / palette options.
- 11 attributed creator-hosted exterior references, with explicit year and variant caveats.
- Geographic Circuit de la Sarthe viewer, selectable corners, day / night mode and illustrative lap animation.
- Responsive layout, accessible HTML alternatives for component and corner selection, WebGL fallback, source notes and asset provenance.
- Data-integrity tests and GitHub Actions build / lint / test checks.

## Accuracy and unfinished scope

**This is a working educational prototype, not a complete set of exact 2026 replicas.**

The built-in cars share procedural class geometry. The internal layouts are conceptual, not manufacturer CAD or complete parts inventories. Car-specific factual entries must not be confused with car-specific mesh accuracy. Sponsor liveries are not reproduced. Sketchfab references can depict earlier bodywork, different series or unverified variants; their availability depends on the original host.

Exact 2026 geometry, race-entry liveries and verified internal assemblies remain outstanding. The current asset constraint is free assets only; no paid models have been purchased. See [the asset register](docs/ASSET-REGISTER.md) for candidate sources and the validation gate. The circuit is a flat geographic outline, not a surveyed elevation model; the lap animation is not real telemetry.

## Sources and licensing

- [FIA WEC 2026 provisional entry list V2](https://www.fiawec.com/umbrella_media/2026-fia-wec-24-hours-of-le-mans-provisional-entry-list-v2-69faef62f3d33722462224.pdf)
- [Ferrari 499P](https://www.ferrari.com/en-US/magazine/articles/ferrari-499p-the-comeback)
- [Toyota TR010 Hybrid](https://toyota-racing.com/toyota-racing-wec/)
- [Oreca 07 media kit](https://www.oreca.com/wp-content/uploads/2017/04/ORECA07_MediaKit_EN.pdf)
- [ACO circuit guide](https://www.24h-lemans.com/fr/actualites/virage-apres-virage-on-vous-decrypte-le-circuit-des-24-heures-du-mans-60667)
- [track-atlas](https://github.com/tobi/track-atlas) and © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.

Original code is MIT. Track data is separately licensed ODbL: [attribution](docs/TRACK-ATTRIBUTION.md). Creator-hosted models retain their own rights and are embedded, not redistributed. Brand and vehicle names identify the subjects; this project is not affiliated with the ACO, FIA WEC, manufacturers or teams.
