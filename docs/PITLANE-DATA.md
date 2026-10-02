# Mapped pit lane

`public/data/circuit-pitlane.geojson` contains the car pit route for Circuit de la Sarthe, fetched from the public OpenStreetMap API on 1 October 2026. It uses 122 original geographic vertices from six connected, directed OSM ways. No line was drawn between the old approximate `sarthe.geojson` pit markers. Those markers are not the route's junction coordinates.

The GeoJSON has one `LineString` with `properties.role: "pit_lane"`, ordered from entry to exit, and two endpoint `Point` features with roles `pit_entry` and `pit_exit`. Coordinates are longitude, latitude in EPSG:4326. Source metadata records the original way versions, timestamps, tags, shared node identifiers, coordinate indices, main-track junction evidence, and SHA-256 hashes. `lengthMetres: 1201.21` is the computed horizontal length of this complete mapped route, including approach and exit; it is not the length of the regulated speed-limit zone or a surveyed official pit-lane length.

| Sequence | Original mapped feature                                              | Source version | Source update |
| -------- | -------------------------------------------------------------------- | -------------- | ------------- |
| 1        | [258179494 · Pit Entry](https://www.openstreetmap.org/way/258179494) | 10             | 2026-05-16    |
| 2        | [849478718 · Pit Entry](https://www.openstreetmap.org/way/849478718) | 1              | 2020-09-20    |
| 3        | [354149765 · Pit Lane](https://www.openstreetmap.org/way/354149765)  | 7              | 2026-08-12    |
| 4        | [777192900 · Pit Lane](https://www.openstreetmap.org/way/777192900)  | 1              | 2020-02-28    |
| 5        | [777192901 · Pit Lane](https://www.openstreetmap.org/way/777192901)  | 2              | 2020-09-20    |
| 6        | [257063576 · Pit Exit](https://www.openstreetmap.org/way/257063576)  | 4              | 2020-02-17    |

Entry is the shared OSM node [2635785126](https://www.openstreetmap.org/node/2635785126), `[0.2095768, 47.9449898]`, on [raceway 226901635](https://www.openstreetmap.org/way/226901635). Exit is the shared node [10119968](https://www.openstreetmap.org/node/10119968), `[0.2087638, 47.9554103]`, on [Courbe Dunlop 773623628](https://www.openstreetmap.org/way/773623628). Both coincide within 0.04 m with a vertex in the application's independently stored raceway outline; the tiny difference comes from coordinate precision in the older outline. No snap or interpolated connector is applied.

## Visual alignment and limits

On 1 October 2026, all six source segments were overlaid without smoothing on IGN's `HR.ORTHOIMAGERY.ORTHOPHOTOS` orthophotography, fetched from the [Géoplateforme raster WMS](https://data.geopf.fr/wms-r?SERVICE=WMS&REQUEST=GetCapabilities) for geographic bounds `[0.2065, 47.9446, 0.2105, 47.9560]`. The north-up browser inspection confirmed the dedicated entry asphalt beside the Ford chicanes, the lane along the garage frontage, and the car branch joining the Dunlop curve. The OSM motorcycle exit and Bugatti/safety-car entry branches are excluded. This is a visual consistency check, not a measured position-accuracy assessment. Imagery acquisition date was not established; a retrieval timestamp is not a survey date.

The route follows source-mapped vertices, including the long straight span along the garages. The short OSM `tunnel=yes`, `layer=-1` section is retained as source metadata; no vertical tunnel shape is inferred. Width, lane boundaries, wall offsets, garage box positions, pit assignments, banking and pavement/deck height remain unmeasured. `widthMetres`, `speedLimitKmh` and source `accuracy` are `null`. Raw OSM `maxspeed` tags are retained for provenance only; they have not been verified against current event regulations and must not be promoted to a speed-limit label. Render stroke width is a display choice, not a surveyed width.

Credit this route as **© OpenStreetMap contributors, ODbL 1.0**, with a link to [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright). IGN imagery has its separate IGN attribution and [Open Licence 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/). No paid API, credential or image asset was acquired.

## Reproduce and verify

Run `node scripts/fetch-circuit-pitlane.mjs` to refresh from the public OSM API. The query bounds include the main-track junction ways as well as the six pit ways. A saved native API JSON response can be supplied with `--source /path/to/map.json`; its bytes are hashed in provenance. The fetch script preserves original coordinates and refuses a missing node, changed direction, disconnected segment or detached main-track junction. It does not invent a replacement route when the source topology changes. Source revisions require renewed visual review.

Run `node --test tests/pitlane.test.mjs` for source-chain integrity, endpoint/main-outline connectivity, length and unknown-field checks, and refusal of malformed refresh graphs. The browser alignment audit is independent of these numeric tests. Map styling, controls and narrow-screen usability are checked separately in the application integration.

The integrated atlas draws the full route as a dashed gold centreline. Pit inspection pauses the illustrative lap and offers entry, lane, exit and full-route views. The lane close-up targets the geographic halfway point of the longest source-named `Pit Lane` segment; it is unavailable if the segment metadata is missing. Endpoint labels use the actual junction coordinates. The outline guide also uses the same vertices and reversible geographic projection. Production browser checks verified these controls, return to overview, sourced terrain and phone layouts down to 320 px without horizontal document overflow. All five pit-lane tests and the combined 31-test suite pass.
