# Geographic driving study

The geographic atlas is the photographic map. The optional driving study is an analytical view of the same geolocated circuit, IGN terrain and mapped building footprints. It is not a reconstruction of surveyed pavement, bridge decks or architectural facades.

## Coordinates and elevation

- The original geographic outline is retained. `trackGeo.ts` uses a reversible local WGS84 tangent approximation, with east-positive x and south-positive z. Geographic coordinates remain available for the map.
- The 1,201 indexed IGN RGE ALTI samples match the original closed coordinate list. The scene removes only its duplicate closing vertex, leaving 1,200 points. Heights are metres in NGF-IGN69, EPSG:5720.
- Absolute source altitudes remain unchanged. The minimum valid indexed altitude, 44.89 m in this capture, is the scene's local zero. The captured indexed range is 44.89–82.65 m.
- The approximately 50 m display terrain grid is a coarser presentation of the sourced terrain. Missing values remain missing; the geographic sampler does not extrapolate outside the source bounds.
- Explicit missing indexed elevations are never replaced by a second profile. Source failures produce a labelled flat fallback, not measured zero-height terrain.

## Ground is not necessarily the racing surface

The captured ground profile contains abrupt changes that must not be described as surveyed road gradients. Indexed samples 283–285, near the Tertre Rouge exit, contain:

| Coordinate | Ground altitude |
| --- | --- |
| 0.223384, 47.961110 | 62.78 m |
| 0.223473, 47.961063 | 59.40 m |
| 0.223559, 47.961015 | 63.21 m |

The first transition drops 3.38 m over approximately 8.46 m; the next rises 3.81 m over approximately 8.35 m. These imply raw local tangents of approximately −21.8° and +24.5°. Some dense Dunlop vertices are only approximately 0.68 m apart and have a 0.23 m height difference, amplifying sample/position uncertainty in a point-to-point slope.

Independent BD TOPO road probes found transverse ground-level roads near two profile dips. Their heights are consistent with terrain below raised crossings, but a nearest road feature can cross the racing route rather than follow it. Its third-coordinate altitude is therefore not automatically a valid deck-height substitute. Bridge/deck geometry requires separate validation before any road-height correction.

The visible profile and the animated car's centre height retain the sourced ground altitude. Only the illustrative vehicle attitude uses a broader 20 m local ground tangent and short temporal damping. It is labelled **estimated ride attitude**. This does not smooth, rewrite or certify the source heights; banking, pavement crossfall and bridge decks are not inferred.

## Buildings and performance

The full 15,950-feature IGN BD TOPO building layer is preserved for the geographic map. The driving study lazily loads that layer and renders a subset whose footprint centre lies within 600 m of the circuit. Buffers are merged into two batches rather than creating thousands of React mesh objects.

Only positive, explicitly sourced heights become extruded massing. A reported ground altitude supplies the base where available, otherwise a valid terrain sample does. Unknown heights or bases remain flat mapped footprints. Polygon holes and multipolygons are retained. Flat roof massing is a display simplification, not claimed architectural geometry.

The old randomly scattered trees, village boxes, guessed pit/grandstand buildings, bridge torus and invented kerbs were removed. The coloured circuit stroke is a centreline overlay; it does not assert an asphalt width or painted surface.

The 312 KB core context loads independently of the approximately 13 MB building layer. Home-page outline previews do not parse building geometry. Provider documentation, licences and source consistency checks are recorded in the context and terrain manifest.
