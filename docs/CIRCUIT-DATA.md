# Circuit geography, sources and accuracy

Sarthe Atlas combines several distinct geographic sources. Source pixels, ground-model grid spacing, outline sampling and building-height accuracy are different quantities. The site must not describe them as one uniform level of precision.

## Layer register

| Displayed feature | Source | Interpretation |
|---|---|---|
| Circuit outline and named corners | OpenStreetMap through track-atlas, stored in `public/data/sarthe.geojson` | Geographic reference outline; not an ACO survey of the racing line. |
| Track ground-elevation samples | IGN Géoplateforme altitude service, resource `ign_rge_alti_wld` | Heights of the ground model, stored with source accuracy metadata and the NGF-IGN69 datum. |
| Orthophotographic basemap | IGN Géoplateforme HR BD ORTHO, 20 cm imagery layer | Orthorectified aerial photography. The mosaic is not live satellite imagery, and retrieval time is not acquisition time. |
| Three-dimensional terrain | Local RGE ALTI Terrain-RGB tiles; separate coarser driving-study grid | Independent terrain coverage and resolution; must not inherit the elevation profile's native-grid or accuracy claims. |
| Buildings | Geographic footprints and height metadata identified in `public/data/circuit-context.json` | A footprint extrusion is a simplified volume, not a measured textured building model. Unknown or estimated heights must be distinguishable. |

The geographic snapshot is `public/data/circuit-context.json`. Its final measured counts, source metadata and acquisition timestamps are authoritative for the local build; external raster tiles can update independently.

## Verified local snapshot

The snapshot fetched on 30 September 2026 contains 801 equally spaced profile samples (about 17.02 m apart) and 1,201 outline-indexed samples including closure. Every sample returned a height. The profile spans **44.93–82.61 m NGF-IGN69** (37.68 m range); the denser indexed samples span 44.89–82.65 m. These small differences reflect sampling locations, not conflicting vertical datums.

The light core file references three separate GeoJSON files through `layers`: `circuit-buildings.geojson`, `circuit-roads.geojson` and `circuit-landuse.geojson`. Counts are 15,950 building footprints, 6,006 road features and 2,661 vegetation areas. There are 15,677 source-reported building heights and 273 unknown heights. Heights are not invented for unknown records; the current map shows their footprints without a height extrusion. Query coverage is approximately 45 km² around the circuit, not just the narrow road ribbon.

The local terrain manifest lists 171 PNG Terrain-RGB tiles at zooms 9–15, totaling 5,378,004 bytes. They were generated from IGN's `ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES` float32 source and reprojected into EPSG:3857 XYZ. Output zooms 12–15 use WGS84G source zoom 14; overview output zooms 9–11 use the corresponding official source pyramid zooms 9–11. The manifest records source zoom and spacing per output level. Detailed source zoom-14 sampling here is approximately 3.20 m east-west and 4.77 m north-south; the overview sources are coarser. Terrain-RGB encoding uses 0.1 m numerical increments; its maximum rounding error is 0.05 m. Neither number is terrain measurement accuracy.

The Three.js fallback uses a separate 112 × 165 ground grid resampled at roughly 50 m intervals. It must not be described as having the raster tile's effective resolution. Coarse output tiles include coverage beyond the circuit, so their overall height range is not the lap’s elevation range. Thirteen independent altitude API/raster comparisons found a maximum difference of 0.126 m; this checks conversion and interpolation consistency only, not absolute accuracy against surveyed ground.

IGN data attribution is **© IGN — RGE ALTI, BD TOPO; Licence Ouverte / Open Licence 2.0**. The [Open Licence 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/) applies to the sourced IGN data; the circuit outline separately retains OpenStreetMap contributor credit and ODbL. Acquisition method and source accuracy fields are retained on building records, with unknown precision kept unknown.

## Elevation and vertical datum

IGN describes [RGE ALTI](https://cartes.gouv.fr/aide/fr/partenaires/ign/observations-regulieres-territoire/relief/rge-alti/) as a terrain model assembled from heterogeneous measurements, mainly LiDAR data acquired since 2010. IGN states that updates stopped in 2024 pending a replacement based on new LiDAR HD acquisition. A 2026 retrieval must therefore not be labelled a 2026 terrain survey.

The [official altitude API documentation](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/) identifies the resource used for each request and explains that different altitude products yield different results. The resource metadata is available at [the RGE ALTI resource endpoint](https://data.geopf.fr/altimetrie/resources/ign_rge_alti_wld). The local context retains each returned accuracy description; numerical service precision is not a guarantee of centimetre-level physical accuracy.

Mainland terrain heights use normal altitude in NGF-IGN69, EPSG:5720. The Three.js scene uses a separate local zero equal to the minimum valid track sample. `pointAt.elevation` remains the absolute source altitude; `pointAt.y` is the elevation relative to that local zero. These meanings must not be interchanged.

Ground height can differ from a road or bridge deck. The Dunlop bridge and other elevated structures cannot be surveyed from a terrain model alone. A road profile built from these samples must remain labelled as ground-model elevation.

Missing heights remain `null`; they are not sea-level zero, a flat terrain measurement or a licence to interpolate through an unknown segment. Interpolation is permitted between valid adjacent samples. Neither the profile nor the terrain grid extrapolates beyond its supported area.

## Profile display

`src/components/ElevationProfile.tsx` prefers the context's equally spaced elevation samples, with the track-aligned samples as a fallback. It shows source-derived extrema and range, distance around the lap, pointer inspection, keyboard inspection and named-corner selection. Gaps in source coverage produce gaps in the line.

The profile's horizontal distance and vertical altitude axes are scaled independently for readability. Its slope on the screen is not a literal slope angle. The source interval is reported separately from a native terrain-grid resolution. Displayed metre values are rounded; they are not accuracy claims.

## Imagery

IGN's [BD ORTHO content specification](https://geoservices.ign.fr/sites/default/files/2023-09/DC_BDORTHO_2-0.pdf) describes orthorectified aerial mosaics and nominal pixel resolution, generally 20 cm for mainland departments, with regional exceptions. This product-wide specification must not be used as an assertion about a particular tile's acquisition year, delivered zoom resolution or absolute positional error.

Rendered roof edges, tree canopies and shadows are photographic observations from the imagery date. They can disagree with a building footprint dataset updated at another date. Attribution must remain visible, and the map must provide a usable fallback when a remote image or DEM source cannot be loaded.

## Terrain integration

[MapLibre's official terrain example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/) uses a raster DEM source and an explicit exaggeration factor. The default physical map view should use a factor of 1. Any optional exaggerated view must identify its factor.

The [fill-extrusion style specification](https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion-height) defines building extrusion height and base in metres. Ground altitude in NGF-IGN69 is not a building height. Adding absolute terrain altitude a second time can make buildings float.

If Mapterhorn is selected as an external DEM, its [published coverage](https://mapterhorn.com/) lists 5 m coverage across France, with finer partial coverage. The exact area/source can be checked through [Mapterhorn attribution](https://mapterhorn.com/attribution). This must not be presented as universally matching the IGN point-profile source or its precision.

## Buildings and height provenance

Footprints must retain their source feature identifiers and actual geographic rings, including holes or multipart geometry where available. Source-reported heights remain separate from estimated display heights.

For an OSM fallback, [`height`](https://wiki.openstreetmap.org/wiki/Key:height) is a structure's maximum height above its terrain base. [`building:levels`](https://wiki.openstreetmap.org/wiki/Key:building:levels) counts levels; multiplying it by a typical storey height is an estimate. A renderer fallback for missing height is also an estimate, and must never be labelled as a measured building height. The local snapshot uses IGN BD TOPO, retaining its `hauteur`, ground/roof altitude, acquisition and precision fields. The [BD TOPO content specification](https://geoservices.ign.fr/sites/default/files/2025-12/DC_BDTOPO_3-5.pdf) distinguishes surveyed or derived heights from roof/ground altitudes; these fields must not be treated as interchangeable.

Trees and decorative buildings from the earlier animation are not geographic evidence. Sourced map volumes replace invented placements; any remaining decorative scene element must be labelled as such.

## Verification

Geography checks cover reversible coordinate projection, geographic lap closure, finite and variable sourced elevation, absolute-versus-relative datum handling, explicit missing samples, bounded grid interpolation and sourced building polygons. Dataset count or snapshot timestamps alone do not establish visual map correctness; desktop/mobile rendering, terrain alignment and interactive profile selection require browser verification as well.

Attribution for each displayed layer follows its provider and dataset licence. The source register and local context metadata must be refreshed together when sources change. No paid geographic source has been acquired for this work.

Browser QA on the integrated profile verified readable desktop (1280 px) and narrow phone (320 px) layouts without horizontal page overflow, keyboard selection of the closed-lap endpoint (13.62 km, 54 m), and named-corner selection. Eleven geography tests passed against the final split snapshot, including all 15,950 building records and all 171 PNG tile checksums.


## Separate bridge surface evidence

`public/data/circuit-bridge-evidence.json` records two IGN BD TOPO bridge footprints and ten independent RGE ALTI MNS float-pixel samples near the Tertre Rouge and Porsche-curve crossings. At the four sample positions inside the published bridge polygons, surface heights are 64.909 m, 64.564 m, 64.499 m and 52.672 m, while the unchanged ground model reports 62.78 m, 59.40 m, 63.21 m and 47.81 m. These reported surface-model values support raised surfaces above the terrain dips. They remain separate evidence, not a surveyed pavement or banking model. Dedicated bridge deck elevations remain `null` because the bridge attributes do not supply them. LiDAR HD point alternatives returned unavailable data or errors and were not substituted.

The encoded range across all 171 PNG tiles is 29.2–182.7 m, including coarse overview tile overhang outside the detailed coverage. The detailed zoom-15 coverage source range is 38.33–88.309 m; neither is the lap profile range. Metadata labels these scopes explicitly. Source building conditions comprise 15,947 in service, two ruins and one under construction; all records retain their condition rather than being silently presented as completed buildings.

To reproduce the data pipeline, run `node scripts/fetch-circuit-context.mjs` and then `node scripts/inspect-circuit-bridges.mjs`. Use `--refresh` on the first command to bypass its temporary source-tile cache. `node scripts/verify-circuit-context.mjs` verifies coordinate identity, source-height provenance, all tile SHA-256/PNG checksums and the separate surface-evidence linkage without acquiring new data.
