# Contributing to Sarthe Atlas

Thanks for helping improve this independent Le Mans explorer. Bug fixes,
source-backed corrections, accessibility, performance and documentation work
are welcome. Open an issue before a large feature or visual redesign so we can
agree on scope.

## Local setup

Fork the repository, clone your fork and create a branch. Use Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Vite prints the local URL. No API keys, paid services or backend are needed.
Fonts, creator-hosted exterior viewers and live map imagery require network
access. Local engineering studies and checked-in geography are separate from
those external services. Browser automation tooling is optional.

## Where to work

- `src/pages/` and `src/components/`: pages and shared interface components.
- `src/three/`: original procedural engineering studies and rendering.
- `src/data/`: catalogue, entry snapshot, references and geographic helpers.
- `public/data/`: sourced geography and generated assets; retain provenance.
- `scripts/` and `tools/circuit-mesh/`: data preparation and optional Rust tools.
- `tests/`: Node test suite; `docs/`: source, accuracy and performance records.

## Before opening a pull request

```sh
npm test
npm run lint
npm run build
```

For interface changes, inspect desktop and narrow mobile layouts, keyboard
navigation and the relevant viewer. Include screenshots and describe what you
checked. Add focused regression coverage for changed behavior where useful.
The build checks the startup JavaScript budget.

If changing the Rust pipeline or its inputs, also run the checks documented in
[the Rust pipeline guide](docs/RUST-PERFORMANCE.md):

```sh
cargo fmt --manifest-path tools/circuit-mesh/Cargo.toml -- --check
npm run mesh:test
npm run mesh:check
```

Use the Rust version pinned in `.github/workflows/check.yml` for reproducibility.
Regenerate changed outputs with `npm run mesh:build`. Normal site work does not
require Rust. Network refresh scripts change source snapshots; run them only
when that refresh is part of your change, and include the updated provenance.

Keep pull requests focused. Explain the problem, resulting behavior and checks
performed, including limitations. Do not commit credentials, `.env` files,
local reports, downloaded third-party meshes, `node_modules/` or `dist/`.

## Evidence and asset rights

The 2026 entry list is the **5 May provisional V2 snapshot**, not live race data.
For factual changes, include a primary source URL, publication/snapshot date,
and the exact claim it supports. Preserve year, variant and uncertainty labels.
A representative engineering mesh is not proof of manufacturer dimensions or
internal layout. See [engineering sources](docs/ENGINEERING-SOURCES.md).

Only submit work you have the right to contribute. Original code contributions
are under [MIT](LICENSE). Third-party material must carry its own documented
license and attribution; submitting it does not relicense it. Follow
[third-party notices](THIRD_PARTY_NOTICES.md) and the
[asset validation gate](docs/ASSET-REGISTER.md). A freely viewable model is not
necessarily free to download or redistribute. Do not add proprietary CAD,
telemetry, sponsor artwork or paid assets without documented permission.

## Working together

Be respectful, specific and constructive. Critique the work, avoid personal
attacks, and respect privacy. Maintainers may remove abusive content or close
out-of-scope contributions. For security issues, use [private reporting](SECURITY.md)
rather than a public issue.
