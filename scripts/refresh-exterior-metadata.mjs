// Read only public model metadata. This does not download or extract any 3D mesh.
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { exteriorReferences } from "../src/data/references.ts";
import { modelMetadata } from "../src/data/modelMetadata.ts";

export function posterVariantsFor(images, poster) {
  const source = images.find((image) => image.url === poster);
  if (!source || !(source.width > 0 && source.height > 0))
    throw new Error(
      "Existing poster is absent from current public thumbnails; review source before replacing it",
    );
  const family = source.url.slice(0, source.url.lastIndexOf("/"));
  const ratio = source.width / source.height;
  const byWidth = new Map();
  for (const image of images) {
    if (!(
      Number.isInteger(image.width) &&
      Number.isInteger(image.height) &&
      image.height > 0
    ))
      continue;
    if (image.width < 256 || image.width > source.width) continue;
    if (image.url.slice(0, image.url.lastIndexOf("/")) !== family) continue;
    // Reject square/cropped alternatives; allow normal integer resizing rounding.
    if (Math.abs(image.width / image.height - ratio) > 0.005) continue;
    if (!byWidth.has(image.width))
      byWidth.set(image.width, {
        width: image.width,
        height: image.height,
        url: image.url,
        ...(Number.isInteger(image.size) && image.size > 0
          ? { bytes: image.size }
          : {}),
      });
  }
  return [...byWidth.values()].sort((a, b) => a.width - b.width);
}

export async function refreshExteriorMetadata() {
  const metadata = {};
  const ids = [
    ...new Set(
      Object.values(exteriorReferences).map((reference) => reference.id),
    ),
  ];
  for (let i = 0; i < ids.length; i += 3) {
    const results = await Promise.all(
      ids.slice(i, i + 3).map(async (id) => {
        const response = await fetch(
          `https://api.sketchfab.com/v3/models/${id}`,
          { signal: AbortSignal.timeout(20000) },
        );
        if (!response.ok) throw new Error(`${id}: ${response.status}`);
        const data = await response.json();
        const previous = modelMetadata[id];
        const image = previous
          ? data.thumbnails.images.find(
              (image) => image.url === previous.poster,
            )
          : data.thumbnails.images
              .toSorted((a, b) => b.width - a.width)
              .find((image) => image.width <= 1920);
        if (!image)
          throw new Error(
            `${id}: missing original poster; review changed public thumbnail before replacing it`,
          );
        return [
          id,
          {
            // A responsive-image refresh must not silently replace provenance or the
            // poster composition that was reviewed for this model.
            ...(previous ?? {
              modelTitle: data.name,
              poster: image.url,
              triangles: data.faceCount,
              publishedAt: data.publishedAt,
              sourceUrl: data.viewerUrl,
              authorUrl: data.user.profileUrl,
              licenseLabel: data.license?.label ?? "Not specified",
            }),
            posterVariants: posterVariantsFor(
              data.thumbnails.images,
              image.url,
            ),
          },
        ];
      }),
    );
    for (const [id, record] of results) metadata[id] = record;
  }
  const type = `export type PosterVariant = { width: number; height: number; url: string; bytes?: number; };\nexport type ModelMetadata = { modelTitle: string; poster: string; posterVariants?: readonly PosterVariant[]; triangles: number; publishedAt: string; sourceUrl: string; authorUrl: string; licenseLabel: string; };\n`;
  const source = `// Public model metadata snapshot, poster sizes verified ${new Date().toISOString().slice(0, 10)}.\n// Source: https://api.sketchfab.com/v3/models/{id}. No mesh files are downloaded.\n${type}export const modelMetadata: Record<string, ModelMetadata> = ${JSON.stringify(metadata, null, 2)};\n`;
  await writeFile(
    new URL("../src/data/modelMetadata.ts", import.meta.url),
    source,
  );
  console.log(
    `Saved verified poster variants for ${ids.length} exterior models; original metadata retained.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await refreshExteriorMetadata();
