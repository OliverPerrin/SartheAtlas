# Asset register

Reviewed 2026-09-27. The site is not yet an exact-2026 replica collection.

## Current implementation

- Original procedural 3D prototype / GT educational assemblies. No claim of exact manufacturer bodywork, part dimensions, homologation or complete bills of materials.
- Eleven creator-hosted Sketchfab exterior references, linked and attributed in `src/data.ts`. These are embeds only. The Ferrari reference is Project 212’s freely viewable public preview; its paid source files have not been acquired. An earlier Ferrari community upload was rejected after visual inspection showed broken duplicate cars. No mesh extraction, game ripping or local redistribution.
- Reference years / variant caveats accompany every embed. Earlier GT3 bodywork cannot establish a 2026 LMGT3 Evo or its race livery.
- Original team-inspired colour studies. No exact sponsor decals are claimed.
- Circuit source geometry: OpenStreetMap via tobi/track-atlas, ODbL. See TRACK-ATTRIBUTION.md. Elevation and lap speed are not measured.

## Cross-series search

Daytona GTP / IMSA cars are promising for Cadillac and BMW exterior references. Spa and Nürburgring GT3 models can provide useful starting shapes, but year, Evo package, LMGT3 changes and race-specific liveries require validation. Do not use a Porsche GT3 RS / Rennsport in place of a GT3 R, an Aston road Valkyrie in place of the LMH, a Corvette C8.R GTE in place of a Z06 GT3.R, or a Toyota GR010 in place of the revised 2026 TR010 without explicit labeling.

## Acquisition candidates, not acquired or licensed

- Ferrari 296 GT3 Evo 2026 by SQUIR: https://www.renderhub.com/squir/ferrari-296-gt3-evo-2026
- Oreca 07 LMP2 2025 by NLLdesign: https://www.cgtrader.com/3d-models/car/racing-car/oreca-07-lmp2-2025
- Oreca 07 LMP2 by Todor Malakchiev: https://www.cgtrader.com/3d-models/car/racing-car/oreca-07-lmp2
- Earlier Oreca WEC / IMSA models by OpticalDreamSoft: https://www.opticaldreamsoft.com/wec-2018-oreca07

Marketplace labels are not proof of correct geometry or permission to serve downloadable GLB files. Some licenses explicitly restrict AI usage; do not acquire or use those without checking compatibility. A web viewer exposes assets to clients, so a rendered-image-only license is insufficient. Exact internal assemblies may require direct manufacturer or artist cooperation.

## Acceptance gate for exact assets

1. Confirm seller / creator authorization and client-side web distribution rights.
2. Record make, chassis, model year, homologation / Evo version and source.
3. Compare bodywork against official 2026 launch and Le Mans race photographs.
4. Verify each entry's race number, team, sponsor layout and race-specific changes.
5. Map named meshes to the system taxonomy with real exploded offsets, hidden layers and picking IDs.
6. Verify known internal components independently; unknown internals remain labeled unavailable.
7. Check mobile memory, texture budget, compressed GLB loading and attribution before promotion.
