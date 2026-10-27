# Engine teardown proof and reference boundaries

Before captures use `fd711dc917523eb9d3bdf0cd5de4092193c5681a` (the mechanical cutaway PR). After captures show the follow-on engine construction, including fixes from independent review. Images use the powertrain camera, body and wheels removed, daylight and livery finish. Open captures use exploded 0 with Open housings enabled. The Ferrari sequence also shows closed at 0 and partial lift at 0.625 with Open housings disabled. All captures are PNGs from the running application.

The same block, cylinder heads and internal mechanism remain in place as hollow cam covers, jacket sections, crankcase cover, sump, plenum and compressor cover separate. Local cover motion occupies exploded 0.5 to 0.75; Open housings opens it fully. Removed jackets also tilt to keep their open ends clear of the inspection sightline. The machined deck has actual bore apertures aligned with the mechanism's bank stagger. The compressor backplate remains behind its wheel.

Cam covers first lift clear of the valve gear, then tip 90 degrees with a 0.04 m bank-local side offset away from the front shoulder view. The folded pose reveals the near bank while keeping each cover visible; closing restores the original gasket seat. Geometry-ray checks include these covers, jackets and decks, with additional crown-surface samples against the covers across all 18 car families.

The engine-local motion is separate from the parent car's module lift. This branch retains the existing linear parent lift; the staged car layers and cockpit remain separate work. Internal dimensions, detachable study sections, materials and plumbing are illustrative. These are procedural engine-family studies, not manufacturer CAD or service instructions.

## Primary references checked on 2026-10-27

- [BMW P66/3 technical release](https://www.press.bmwgroup.com/usa/article/detail/T0402285EN_US/the-heart-of-the-bmw-m-hybrid-v8:-p66/3-eight-cylinder-hybrid-turbo-engine-drives-the-lmdh-prototype): cast aluminium block and heads, 90-degree V8, twin turbochargers and a dry-sump oil tank. Published bore, stroke and spacing were not used as mesh dimensions. The release does not establish turbo placement; the illustrated routing is not a hot-V claim.
- [Porsche 992 GT3 R technical data](https://newsroom.porsche.com/en_US/2022/motorsport/porsche-911-gt3-r-generation-992-customer-racing-car-premiere-29222.html): rear water-cooled flat-six, single throttle butterfly and dry-sump lubrication. The published engine tilt and bore/stroke were not reproduced.
- [Alpine A424 track debut](https://media.alpinecars.com/alpine-a424-track-debut-imminent/?lang=eng): single-turbocharged 3.4-litre V6. This article does not establish the bank angle or dry-sump layout; those remain the catalogue's existing entries.

The implementer's Ferrari article request was blocked by JavaScript and the ORECA PDF returned 404, so neither was treated as newly observed shape evidence. Other car families retain the architecture and source boundaries already recorded in `cars.ts` and `engineeringDetails.ts`.
