// fits.json → src/data/bodyOutlines.ts
import { readFileSync, writeFileSync } from "node:fs";
const fits = JSON.parse(readFileSync("/tmp/sa-qa/sil/fits.json", "utf8"));
const refs = JSON.parse(readFileSync("/tmp/sa-qa/sil/refs.json", "utf8"));
const until = JSON.parse(readFileSync("/tmp/sa-qa/sil/until.json", "utf8"));
const r2 = (v) => (v == null ? 0 : Math.round(v * 100) / 100);
let out = `import type { BodyOutline } from "../three/bodyFit.ts";

/**
 * Measured outlines of the creator-hosted exterior references in
 * references.ts. Each model was viewed through the public Sketchfab Viewer
 * API from the side and from above with a narrow field of view. The
 * silhouettes were scaled to the catalogue wheelbase at the detected axles,
 * then sampled at 41 stations from nose to tail. Heights are fitted only up
 * to \`heightUntil\`: on GT cars, the deck ahead of the rear wing; on
 * prototypes, the windscreen base, so the designed canopy keeps its shape
 * and the fin does not stand in for the engine cover. Only these coarse
 * dimensions are stored: no mesh, texture or image data. The references'
 * own year and variant caveats apply.
 */
export const bodyOutlines: Record<string, BodyOutline> = {\n`;
for (const ref of refs) {
  const fit = fits[ref.car];
  if (!fit) continue;
  out += `  // ${ref.label} (${ref.id})\n  ${JSON.stringify(ref.car)}: {\n    top: [${fit.stations.map((s) => r2(s[1])).join(", ")}],\n    half: [${fit.stations.map((s) => r2(s[2])).join(", ")}],\n    heightUntil: ${until[ref.car]},\n  },\n`;
}
out += "};\n";
writeFileSync(`${process.env.ROOT ?? "/Users/oliverperrin/SartheAtlas"}/src/data/bodyOutlines.ts`, out);
console.log("cars", Object.keys(fits).length);
