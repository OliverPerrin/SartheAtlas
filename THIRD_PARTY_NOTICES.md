# Licenses and third-party notices

The [MIT license](LICENSE) applies to original Sarthe Atlas code and original
documentation. It does not replace the licenses or rights of third-party data,
models, images, fonts, dependencies or trademarks.

## Geographic data

- **OpenStreetMap contributors — ODbL 1.0:** circuit geometry and corner locations
  in `public/data/sarthe.geojson`, and the pit route in
  `public/data/circuit-pitlane.geojson`. The circuit snapshot comes through
  [track-atlas](https://github.com/tobi/track-atlas).
  [Attribution and data terms](docs/TRACK-ATTRIBUTION.md) ·
  [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).
- **IGN — Open Licence 2.0:** locally prepared RGE ALTI elevation tiles,
  BD TOPO geography and derived building meshes. BD ORTHO and Plan IGN layers
  are requested from IGN services. Preserve dataset attribution and source dates.
  [Source manifests and precision](docs/CIRCUIT-DATA.md) ·
  [Open Licence 2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md).
- **Upstream corner metadata:** track-atlas credits Lovely Sim Racing and
  Racing Circuits. Its upstream reuse terms are not established by Sarthe
  Atlas's MIT license. See the explicit uncertainty in
  [the attribution record](docs/TRACK-ATTRIBUTION.md).

The source manifests, geometry, terrain tiles and prepared meshes are included
in `public/data/`; preparation scripts are in `scripts/` and `tools/`.

## Hosted models, previews and films

Sketchfab exteriors, their preview images and linked artist films remain on
their original hosts and retain their creators' rights. Embedding or linking
is not a grant to download, extract or redistribute source meshes or artwork.
Creator attribution, model IDs and variant caveats are maintained in
`src/data/references.ts`, `src/data/modelMetadata.ts`, the site's Sources page
and [the asset register](docs/ASSET-REGISTER.md). Some upstream provenance is
unverified; no blanket open-source asset license is claimed.

## Fonts and software dependencies

Barlow Condensed and DM Sans are requested from Google Fonts. Their upstream
font distributions carry the SIL Open Font License; preserve the supplied
license if self-hosting them. JavaScript and Rust dependencies retain their own
licenses. `package-lock.json` and `tools/circuit-mesh/Cargo.lock` record versions;
consult each distribution's license when redistributing dependencies.

## Names and marks

Vehicle, manufacturer, team, championship and circuit names identify the
subjects. No trademark rights or endorsement are granted. Sarthe Atlas is not
affiliated with the ACO, FIA, FIA WEC, IMSA, manufacturers or teams.
