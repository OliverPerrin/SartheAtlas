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
      compact
      active
    />
  );
}
