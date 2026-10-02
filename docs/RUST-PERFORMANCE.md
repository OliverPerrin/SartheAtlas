# Circuit asset preparation and car projection caching

Implemented and measured on 2 October 2026, after [PR #1](https://github.com/OliverPerrin/SartheAtlas/pull/1) merged the earlier site improvements into main.

The browser no longer parses the complete building GeoJSON or extrudes thousands of building shapes when opening the driving study. A Rust compiler prepares source-faithful indexed geometry ahead of time. Car glazing also evaluates repeated projection points once per geometry build. Both changes preserve the existing study detail.

## Prepared circuit geometry

The frozen source contains 15,950 buildings. The existing 600 m track corridor includes 2,898: 2,757 sourced volumes and 141 flat footprints with unknown height/ground. The compiler retains polygon holes, MultiPolygon membership, height provenance, ground-attribute precedence, terrain interpolation and missing-data behavior. It uses the same projection scales, scene scale 0.1 and elevation base 44.89 m as the previous renderer.

The compiler creates separate Float32 position/normal arrays and Uint32 indices. Unused building UVs are omitted; the materials are untextured. Source SHA-256 hashes and attribution are retained in the manifest. The binary and its deterministic gzip envelope each have a checksum. A `.mesh` filename prevents static servers from treating the stored envelope as HTTP Content-Encoding; the loader explicitly decompresses it.

| Measurement | Previous | Prepared |
| --- | ---: | ---: |
| Source/application payload, uncompressed | 14,092,562 B GeoJSON | 3,355,400 B binary |
| Compressed payload | 1,099,116 B GeoJSON gzip* | 784,724 B stored gzip |
| Geometry buffers | Approximately 6.0 MB, position/normal/UV | 3,355,368 B, position/normal/index |
| Local preparation p50 | 74.5 ms parse + extrusion | 10.0 ms validated loader |
| Local first prepared load | — | 24.1 ms |

*The source gzip figure uses local Node gzip level 9, not a guarantee that a given host uses gzip for GeoJSON. The prepared gzip also uses level 9 and is explicitly shipped, so its 784,724-byte size applies without depending on host compression. Native preview measured only one manifest request (3,428 B) and one prepared-mesh request (784,724 B), including repeated atlas/study switches. No full source building GeoJSON was requested by the driving study. The geographic atlas keeps its original complete building source.

The loader benchmark uses in-memory Response objects in Node 26.7. It includes manifest parsing, both SHA checks, native gzip decompression, length/finite-value/index validation and zero-copy buffer views; it excludes network, React and GPU time. Subsequent loads measured p50 10.0 / p95 11.35 ms. The first run measured 24.1 ms and a maximum main-thread sampling gap of 10.9 ms. These results establish a reduction in this preparation work, not device FPS or an overall page-speed multiplier. A worker prototype reduced blocking but increased cold total time, so it was not adopted.

Parity checks against the former Three.js renderer verify all positions, normals, bounds, face-plane boundaries, areas and volumes. Different equivalent roof/floor diagonals from the triangulation library are allowed: exact surface boundaries and holes remain unchanged. The largest measured normal difference was 3.3e-24, and the aggregate signed-volume difference was 2e-12 scene units cubed. The geometry has 61,924 solid and 518 footprint triangles.

Native browser checks confirmed prepared buildings and sourced terrain render together on desktop and at a 390-pixel viewport without overflow. A missing/invalid asset gives a clear unavailable-building status while terrain and the study remain usable. The loader refuses invalid checksums, malformed indices, inconsistent counts/bounds and coordinate/datum mismatch.

## Car geometry construction

`Body.patch` now delegates to a build-local projection cache. Duplicate subdivision points reuse their position and normal evaluations. The output retains the previous non-indexed triangle order, mirrored winding and every Float32 component. The cache is discarded after each build; it retains no model or renderer.

Measured on Apple M5 / Node 26.7 with 40 warmed repeats and five separate cold processes:

| Model | Warm p50 before → after | Warm p95 before → after | Cold p50 before → after |
| --- | ---: | ---: | ---: |
| Ferrari | 12.82 → 5.55 ms | 26.21 → 8.78 ms | 24.13 → 14.82 ms |
| Porsche | 17.98 → 7.19 ms | 25.39 → 10.18 ms | 28.42 → 18.72 ms |
| BMW M4 | 17.35 → 6.50 ms | 25.53 → 9.88 ms | 28.34 → 18.28 ms |

These measurements cover fresh body/profile and all glazing construction, excluding module/process startup, React, GPU and network time. Rust/WASM would add delivery and integration costs here; eliminating repeated work in JavaScript already gives a measured 2.3–2.7× improvement in the warmed construction benchmark. All 18 cars have bit-exact parity tests, including curved lenses, shell UVs and geometry isolation between builds.

## Reproduce and refresh

Normal development, tests and deployment use the checked-in prepared assets and require Node 24 or newer. Rust is required only for rebuilding/verifying those assets. CI uses Rust 1.99.0 with the locked crate dependencies; a dedicated job verifies formatting, Rust tests and byte-for-byte reproducibility.

```sh
npm test
npm run lint
npm run build
node scripts/benchmark-projected-patches.mjs --repeats 40 --cold-runs 5
```

After installing Rust with [the official installer](https://rust-lang.org/tools/install/):

```sh
npm run mesh:test
npm run mesh:build
npm run mesh:check
```

After refreshing circuit sources, run `mesh:build` and commit both `public/data/circuit-buildings-mesh.json` and `public/data/circuit-study-buildings.mesh`. Source-checksum tests reject stale prepared geometry. The wrapper prepares the projection/grid from the existing track loader, runs the Rust compiler into a temporary directory, and publishes only completed outputs. No Rust or WebAssembly runtime is downloaded by the website.

Related evidence: [performance](PERFORMANCE.md), [circuit precision](CIRCUIT-DATA.md), [attribution](TRACK-ATTRIBUTION.md).
