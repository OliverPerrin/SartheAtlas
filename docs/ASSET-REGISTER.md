# Asset register

Reviewed 2026-09-30. The site is not yet an exact-2026 replica collection.

## Current implementation

- Original procedural 3D prototype / GT educational assemblies. No claim of exact manufacturer bodywork, part dimensions, homologation or complete bills of materials.
- Eighteen creator-hosted Sketchfab exterior references, linked and attributed in `src/data/references.ts`, with a public metadata snapshot in `src/data/modelMetadata.ts`. These are embeds only. The Ferrari reference is Project 212’s freely viewable public preview; its paid source files have not been acquired. An earlier Ferrari community upload was rejected after visual inspection showed broken duplicate cars. No mesh extraction, game ripping or local redistribution.
- Reference years / variant caveats accompany every embed. Earlier GT3 bodywork cannot establish a 2026 LMGT3 Evo or its race livery.
- Original team-inspired colour studies. No exact sponsor decals are claimed.
- Circuit source geometry: OpenStreetMap via tobi/track-atlas, ODbL. See TRACK-ATTRIBUTION.md. Elevation and lap speed are not measured.

## Default detailed view

The homepage, catalog previews and initial car explorer use detailed creator-hosted exteriors. The local procedural chassis remains a separate engineering cutaway. A reference retains its own finish, race number and livery, rather than pretending to reproduce the selected 2026 entry.

Model-bound repairs use only documented public Viewer API controls: physical material factors, exposure/filter adjustments, stable camera framing and visibility/orientation fixes. The M4 source contains mirrored and detached assemblies; the viewer hides a verified list of those nodes and corrects the imported up axis. No source mesh or texture archive is extracted.

Corvette’s initial flat/untextured candidate and a second candidate with shared red front/rear light material were rejected in favour of Patricars’ clean GT3 reference. Ford’s untextured candidate was replaced with a restored textured host reference. The actual SDK scene identities and visual checks are documented in [GT research](assets-gt-research.md).

The strongest freely viewable textured Aston reference is the related customer Valkyrie LM, explicitly labelled as a variant. OpticalDreamSoft’s exact 2026 LMH is represented by an optional official studio film; its paid source asset has not been acquired. See [Hypercar research](assets-hypercar-research.md).

Public embedding and a platform license label do not independently verify upstream ownership. Some community uploads have unresolved provenance, so they remain hosted references rather than cleared source assets for redistribution. Factory accuracy and exact 2026 race liveries are not certified.

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

## Circuit geography

The default circuit view uses public IGN orthorectified aerial photography with
locally generated RGE ALTI terrain tiles and BD TOPO building footprints. The
driving study uses the same geographic alignment and a coarser ground grid.
Invented villages, scattered trees, pit buildings and bridge geometry have been
removed. Buildings with unknown heights remain flat footprints. Source licences,
precision, tile manifest and ground-versus-road limits are documented in
[CIRCUIT-DATA.md](CIRCUIT-DATA.md) and [the driving study](circuit-driving-study.md).
