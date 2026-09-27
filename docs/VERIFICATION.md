# Verification

2026-09-27

- Production build: TypeScript and Vite pass. Three.js is lazy-loaded; Vite reports the expected large 3D bundle warning (~258 kB gzip).
- Lint: pass with no diagnostics.
- Five Node data-integrity tests pass: catalogue coverage, source and reference metadata, non-hybrid classification, system completeness and geographic circuit invariants.
- Desktop browser: component selection updates the information panel; internal selection reveals the hidden body layer; keyboard End sets the exploded-view slider to 100%; changing to LMGT3 resets explosion and excludes hybrid components; exterior button loads the corresponding creator iframe.
- Circuit: corner selection updates text and numbering (Arnage = 12); night toggle changes the scene; lap pause control available. Flat geographic outline only.
- Mobile 390 × 844: page width stays within viewport; class / car selectors and horizontal system list remain available; viewer controls and information panels stack.
- A React/Drei DOM-marker unmount issue was removed by moving labels to Three.js sprites, retaining HTML system and corner selectors as accessible alternatives. Browser error capture remained empty during subsequent car and class-switch interactions.
- GitHub Actions initial and formatting build / lint / test runs: successful.
- External-viewer QA rejected a broken Ferrari community scene with duplicated cars. The replacement is Project 212’s public 499P viewer; no paid source files were purchased. Viewer API controls provide zoom, fit and a slow-load fallback.

Not verified: exact manufacturer geometry, complete internal components, 2026 race liveries, all eleven remote viewers on all devices, production hosting or real telemetry. Community model availability and download / redistribution rights are not assumed.
