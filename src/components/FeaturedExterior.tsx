import ExteriorViewer from "../ExteriorViewer.tsx";
import { exteriorTuning, materialRecipeFor } from "../data/exteriorTuning.ts";
import type { Reference } from "../data/references.ts";

export default function FeaturedExterior({
  reference,
  title,
}: {
  reference: Reference;
  title: string;
}) {
  return (
    <ExteriorViewer
      id={reference.id}
      title={title}
      poster={reference.poster}
      materialOverrides={materialRecipeFor(reference.id)}
      {...exteriorTuning[reference.id]}
      // The home stage is wide and shallow, so the car can sit closer.
      fitScale={(exteriorTuning[reference.id]?.fitScale ?? 1) * 0.66}
      compact
      active
    />
  );
}
