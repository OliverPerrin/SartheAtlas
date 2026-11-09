import { useState } from "react";
import { isDark, usePhase } from "../data/racePhase.ts";
import "./StudyImage.css";

const base = import.meta.env.BASE_URL;

/**
 * A still of one of the built-in engineering studies, rendered by
 * scripts/study-renders: the same studio, camera and light for every car.
 * Car families also have a night image, lamps on, which fades in with the
 * site's time of day.
 */
export default function StudyImage({
  car,
  entry,
  alt,
  className = "",
  priority = false,
}: {
  /** Car family id: shows the day image and, after dark, the night one. */
  car?: string;
  /** Race number: shows that entry's colour study. */
  entry?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const phase = usePhase();
  const dark = isDark(phase) && !!car && !entry;
  // The night image is requested the first time it is needed, then kept.
  const [nightSeen, setNightSeen] = useState(dark);
  if (dark && !nightSeen) setNightSeen(true);
  const day = entry ? `entry-${entry}` : `${car}-day`;
  return (
    <span className={`study-image ${className}${dark ? " dark" : ""}`}>
      <img
        src={`${base}studies/${day}.avif`}
        width={960}
        height={600}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
      {car && !entry && nightSeen && (
        <img
          className="study-night"
          src={`${base}studies/${car}-night.avif`}
          width={960}
          height={600}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}
