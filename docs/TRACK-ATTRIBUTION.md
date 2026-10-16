# Attribution

This project combines data from multiple sources. Respect their licenses.

## OpenStreetMap

Geometry and named-corner coordinates are derived from OpenStreetMap data via
the Overpass API.

The separate pit-lane snapshot uses six connected ways from the public
OpenStreetMap map API. It retains the same ODbL credit; its way versions,
junctions and geographic vertices are documented in [PITLANE-DATA.md](PITLANE-DATA.md).

> © OpenStreetMap contributors, licensed under the
> [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).

In this repository, the circuit outline and corner features are stored in
`public/data/sarthe.geojson`; the pit route is in
`public/data/circuit-pitlane.geojson`. Preserve the ODbL terms and attribution
when reusing these datasets. Source history and processing details are recorded
in [CIRCUIT-DATA.md](CIRCUIT-DATA.md) and [PITLANE-DATA.md](PITLANE-DATA.md).

## Lovely-Sim-Racing/lovely-track-data

Ordered corner metadata (apex/sector/pit lap fractions, severity, direction) and
the colloquial corner-name base layer come from
[Lovely-Sim-Racing/lovely-track-data](https://github.com/Lovely-Sim-Racing/lovely-track-data).
Their corner/straight names are credited upstream to Racing Circuits. No explicit
license file was found in lovely-track-data at the open-source preparation review
(16 October 2026). These upstream metadata are not relicensed under this project's
MIT license; verify permission with the upstream authors before extracting or
redistributing that metadata separately.

## IGN geography

The atlas displays **© IGN — BD ORTHO, RGE ALTI, BD TOPO and Plan IGN**.
IGN's data are used under [Licence Ouverte / Open Licence 2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md).
Keep this attribution with redistributed local elevation and building data.
The original OSM outline retains its independent ODbL attribution.

The public WMTS and WFS sources, retrieval dates, native sampling, derived tile
encoding and SHA-256 checksums are recorded in `public/data/circuit-context.json`
and `public/data/circuit-terrain-manifest.json`. See [circuit data](CIRCUIT-DATA.md)
for precision and missing-data rules. Aerial photographs are orthorectified
imagery, not live satellite data. Ground elevation does not establish bridge
deck height or surveyed road camber. Building extrusions simplify sourced
footprints and available heights; they do not establish facade or roof detail.
