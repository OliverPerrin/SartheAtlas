import { useState } from "react";
import type { Car } from "../data/cars.ts";
import { entriesFor } from "../data/entries.ts";
import { exteriorReferences } from "../data/references.ts";
import Silhouette from "./Silhouette.tsx";
import "./CarPreview.css";

export default function CarPreview({
  car,
  className = "",
  label = false,
  priority = false,
  sizes,
}: {
  car: Car;
  className?: string;
  label?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const reference = exteriorReferences[car.id];
  const poster = reference?.poster;
  const variants = reference?.posterVariants;
  const largest = variants?.at(-1);
  const compactVariants = variants?.filter((image) => image.width <= 1024);
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 820px)").matches;
  const fullSrcSet = variants
    ?.map((image) => `${image.url} ${image.width}w`)
    .join(", ");
  const srcSet = (priority && !mobile ? variants : compactVariants)
    ?.map((image) => `${image.url} ${image.width}w`)
    .join(", ");
  // React may assign src before the picture source is attached. Use the small
  // reviewed rendition for mobile/cards so that fallback assignment cannot
  // start a full-size request before responsive source selection.
  const compactPoster = compactVariants?.at(-1)?.url ?? poster;
  const fallbackPoster = priority && !mobile ? poster : compactPoster;
  const compactSrcSet = compactVariants
    ?.map((image) => `${image.url} ${image.width}w`)
    .join(", ");
  // Preserve the original full-size desktop hero. Lazy cards can select their
  // actual layout width; explicit fallbacks cover browsers without auto-sizes.
  const imageSizes =
    sizes ??
    (priority
      ? "(max-width: 820px) 100vw, 1920px"
      : "auto, (max-width: 600px) calc(100vw - 48px), (max-width: 1000px) 45vw, 400px");
  const title = reference?.modelTitle ?? `${car.make} ${car.name}`;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = poster && poster !== failedUrl;
  return (
    <div className={`car-preview ${className}`}>
      {photo ? (
        <picture>
          {priority && compactSrcSet && (
            <source
              media="(max-width: 820px)"
              srcSet={compactSrcSet}
              sizes="100vw"
            />
          )}
          {priority && fullSrcSet && (
            <source
              media="(min-width: 821px)"
              srcSet={fullSrcSet}
              sizes={sizes ?? "1920px"}
            />
          )}
          <img
            src={fallbackPoster}
            srcSet={srcSet}
            sizes={srcSet ? imageSizes : undefined}
            width={largest?.width}
            height={largest?.height}
            alt={`${title} exterior reference with its original finish`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            onError={() => setFailedUrl(poster!)}
          />
        </picture>
      ) : (
        <Silhouette car={car} entry={entriesFor(car.id)[0]} />
      )}
      {label && (
        <span className="car-preview-label">
          {photo
            ? "Exterior reference · original livery"
            : "Engineering illustration"}
        </span>
      )}
    </div>
  );
}
