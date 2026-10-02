import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Corner, TrackGeo } from "../data/trackGeo.ts";
import { sections } from "../data/track.ts";
import "./ElevationProfile.css";

type ElevationSource = {
  label: string;
  url?: string;
  resolutionMeters?: number;
  sampleSpacingMetres?: number;
  datum?: string;
  note?: string;
};

type ProfileElevationContext = {
  source?: string;
  url?: string;
  resource?: string;
  verticalDatum?: string;
  sampleSpacingMetres?: number;
  samples?: { fraction: number; elevation: number | null }[];
};

type Props = {
  track: TrackGeo & { elevations?: (number | null)[] };
  activeFraction?: number | null;
  activeCorner?: string | null;
  onFraction?: (fraction: number) => void;
  onCorner?: (name: string) => void;
  source?: ElevationSource;
  className?: string;
};

const landmarks = [
  "Dunlop Chicane",
  "Tertre Rouge",
  "Mulsanne",
  "Arnage",
  "Porsche Curves",
  "Ford Chicane",
];
const isHeight = (height: unknown): height is number =>
  typeof height === "number" && Number.isFinite(height);
const clampFraction = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const distanceText = (metres: number) => `${(metres / 1000).toFixed(2)} km`;

export default function ElevationProfile({
  track,
  activeFraction,
  activeCorner,
  onFraction,
  onCorner,
  source,
  className = "",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(1000);
  const [position, setPosition] = useState({ fraction: 0, externalKey: "|" });
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(200, Math.round(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const contextElevation = (
    track as TrackGeo & { context?: { elevation?: ProfileElevationContext } }
  ).context?.elevation;
  const effectiveSource: ElevationSource | undefined =
    source ??
    (contextElevation
      ? {
          label: contextElevation.source ?? "Sourced terrain model",
          url:
            contextElevation.url ??
            (contextElevation.resource
              ? `https://data.geopf.fr/altimetrie/resources/${encodeURIComponent(contextElevation.resource)}`
              : undefined),
          datum: contextElevation.verticalDatum,
          sampleSpacingMetres: contextElevation.sampleSpacingMetres,
          note: "Source accuracy varies by measurement method.",
        }
      : undefined);
  const profile = useMemo(() => {
    const sampled = (
      track as TrackGeo & { context?: { elevation?: ProfileElevationContext } }
    ).context?.elevation?.samples;
    const validContext =
      sampled &&
      sampled.length > 1 &&
      sampled.every(
        (sample, index) =>
          Number.isFinite(sample.fraction) &&
          sample.fraction >= 0 &&
          sample.fraction <= 1 &&
          (index === 0 || sample.fraction >= sampled[index - 1].fraction),
      );
    const aligned = track.elevations?.length === track.points.length;
    const samples = validContext
      ? sampled.map((sample) => ({
          distance: sample.fraction * track.length,
          height: sample.elevation,
        }))
      : track.points.map((_, index) => ({
          distance: track.cum[index],
          height: aligned ? track.elevations![index] : null,
        }));
    const finite = samples.flatMap((sample) =>
      isHeight(sample.height) ? [sample.height] : [],
    );
    const closed =
      samples.length && samples.at(-1)!.distance < track.length - 1e-6
        ? [...samples, { distance: track.length, height: samples[0].height }]
        : samples;
    const segments: { distance: number; height: number }[][] = [];
    let segment: { distance: number; height: number }[] = [];
    for (const sample of closed) {
      if (isHeight(sample.height))
        segment.push({ distance: sample.distance, height: sample.height });
      else if (segment.length) {
        segments.push(segment);
        segment = [];
      }
    }
    if (segment.length) segments.push(segment);
    return {
      samples: closed,
      segments,
      count: finite.length,
      missing: samples.length - finite.length,
      min: finite.length ? Math.min(...finite) : null,
      max: finite.length ? Math.max(...finite) : null,
    };
  }, [track]);

  const heightAt = (fraction: number) => {
    const d = clampFraction(fraction) * track.length;
    let lo = 0,
      hi = profile.samples.length - 1;
    if (hi < 1) return null;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (profile.samples[mid].distance <= d) lo = mid;
      else hi = mid;
    }
    const a = profile.samples[lo],
      b = profile.samples[hi];
    const length = b.distance - a.distance;
    const t =
      length > 0 ? Math.min(1, Math.max(0, (d - a.distance) / length)) : 0;
    if (t <= 1e-9) return isHeight(a.height) ? a.height : null;
    if (t >= 1 - 1e-9) return isHeight(b.height) ? b.height : null;
    return isHeight(a.height) && isHeight(b.height)
      ? a.height + (b.height - a.height) * t
      : null;
  };
  const selectedCorner = track.corners.find(
    (corner) => corner.name === activeCorner,
  );
  const externalKey = `${activeCorner ?? ""}|${activeFraction ?? ""}`;
  const selected = clampFraction(
    position.externalKey === externalKey
      ? position.fraction
      : (selectedCorner?.fraction ?? activeFraction ?? 0),
  );
  const inspected = hover ?? selected;
  const altitude = heightAt(inspected);
  const section =
    sections.find((part) => inspected >= part.from && inspected < part.to) ??
    sections[0];
  const seen = new Set<string>();
  const corners = track.corners.filter(
    (corner) =>
      landmarks.includes(corner.name) &&
      !seen.has(corner.name) &&
      Boolean(seen.add(corner.name)),
  );
  const highlightedCorner = corners.find(
    (corner) => Math.abs(corner.fraction - selected) < 1e-5,
  )?.name;
  const selectFraction = (fraction: number) => {
    const next = clampFraction(fraction);
    setPosition({ fraction: next, externalKey });
    onFraction?.(next);
  };
  const selectCorner = (corner: Corner) => {
    setPosition({ fraction: corner.fraction, externalKey });
    if (onCorner) onCorner(corner.name);
    else onFraction?.(corner.fraction);
  };
  const padding = { left: 45, right: 20, top: 24, bottom: 42 };
  const height = 226;
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const lower = profile.min === null ? 0 : Math.floor(profile.min / 5) * 5 - 5;
  const upper = profile.max === null ? 10 : Math.ceil(profile.max / 5) * 5 + 5;
  const X = (distance: number) =>
    padding.left + (distance / Math.max(1, track.length)) * plotWidth;
  const Y = (elevation: number) =>
    padding.top +
    ((upper - elevation) / Math.max(1, upper - lower)) * plotHeight;
  const pathFor = (segment: { distance: number; height: number }[]) =>
    segment
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${X(point.distance).toFixed(2)},${Y(point.height).toFixed(2)}`,
      )
      .join(" ");
  const axisSteps = Math.max(2, Math.min(7, Math.floor(plotWidth / 125)));
  const pointFraction = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return clampFraction(
      (((event.clientX - box.left) * width) / Math.max(1, box.width) -
        padding.left) /
        plotWidth,
    );
  };
  const available = profile.count > 1 && track.length > 0;

  return (
    <section
      className={`elevation-profile ${className}`}
      aria-labelledby={`${uid}-title`}
    >
      <div className="elevation-heading">
        <div>
          <span className="kicker">Elevation along the lap</span>
          <h2 id={`${uid}-title`}>The rise and fall of the circuit.</h2>
        </div>
        {available && (
          <dl className="elevation-stats">
            <div>
              <dt>Lowest ground</dt>
              <dd>
                ≈ {Math.round(profile.min!)} <span>m</span>
              </dd>
            </div>
            <div>
              <dt>Highest ground</dt>
              <dd>
                ≈ {Math.round(profile.max!)} <span>m</span>
              </dd>
            </div>
            <div>
              <dt>Elevation range</dt>
              <dd>
                ≈ {Math.round(profile.max! - profile.min!)} <span>m</span>
              </dd>
            </div>
          </dl>
        )}
      </div>
      <div ref={container} className="elevation-plot">
        {available ? (
          <>
            <div className="elevation-inspection" aria-live="off">
              <span>
                {distanceText(inspected * track.length)} <i>into the lap</i>
              </span>
              <strong>
                {altitude === null
                  ? "No height sample"
                  : `${Math.round(altitude)} m`}{" "}
                <span>{effectiveSource?.datum ?? "ground altitude"}</span>
              </strong>
              <span
                className="elevation-section"
                style={{ color: section.color }}
              >
                {section.name}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              role="img"
              aria-label={`Ground elevation profile around the circuit. Lowest ${Math.round(profile.min!)} metres, highest ${Math.round(profile.max!)} metres. Axes use different scales.`}
              onPointerMove={(event) => setHover(pointFraction(event))}
              onPointerDown={(event) => {
                dragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                setHover(pointFraction(event));
              }}
              onPointerUp={(event) => {
                dragging.current = false;
                selectFraction(pointFraction(event));
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                dragging.current = false;
                setHover(null);
              }}
              onPointerLeave={() => {
                if (!dragging.current) setHover(null);
              }}
            >
              <defs>
                <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#7298b6" stopOpacity=".22" />
                  <stop offset="1" stopColor="#7298b6" stopOpacity=".02" />
                </linearGradient>
                <clipPath id={`${uid}-clip`}>
                  <rect
                    x={padding.left}
                    y={padding.top}
                    width={plotWidth}
                    height={plotHeight}
                  />
                </clipPath>
              </defs>
              {Array.from({ length: 5 }, (_, index) => {
                const elevation = lower + ((upper - lower) * index) / 4;
                return (
                  <g key={index}>
                    <line
                      className="elevation-grid-line"
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={Y(elevation)}
                      y2={Y(elevation)}
                    />
                    <text
                      className="elevation-axis"
                      x={padding.left - 9}
                      y={Y(elevation) + 4}
                      textAnchor="end"
                    >
                      {Math.round(elevation)}
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: axisSteps + 1 }, (_, index) => {
                const distance = (track.length * index) / axisSteps;
                return (
                  <text
                    key={index}
                    className="elevation-axis"
                    x={X(distance)}
                    y={height - 17}
                    textAnchor={
                      index === 0
                        ? "start"
                        : index === axisSteps
                          ? "end"
                          : "middle"
                    }
                  >
                    {(distance / 1000).toFixed(1)} km
                  </text>
                );
              })}
              <g clipPath={`url(#${uid}-clip)`}>
                {profile.segments.map((segment, index) => (
                  <g key={index}>
                    <path
                      d={`${pathFor(segment)} L${X(segment.at(-1)!.distance)},${Y(lower)} L${X(segment[0].distance)},${Y(lower)} Z`}
                      fill={`url(#${uid}-fill)`}
                    />
                    <path d={pathFor(segment)} className="elevation-trace" />
                  </g>
                ))}
                <line
                  className="elevation-cursor"
                  x1={X(inspected * track.length)}
                  x2={X(inspected * track.length)}
                  y1={padding.top}
                  y2={height - padding.bottom}
                />
                {altitude !== null && (
                  <circle
                    className="elevation-current-point"
                    cx={X(inspected * track.length)}
                    cy={Y(altitude)}
                    r="5"
                  />
                )}
              </g>
              {corners.map((corner) => {
                const elevation = heightAt(corner.fraction);
                return elevation === null ? null : (
                  <g
                    key={corner.number}
                    className={
                      highlightedCorner === corner.name
                        ? "elevation-corner active"
                        : "elevation-corner"
                    }
                    transform={`translate(${X(corner.fraction * track.length)},${Y(elevation)})`}
                  >
                    <circle r="3" />
                    <title>
                      {corner.name}: {Math.round(elevation)} m
                    </title>
                  </g>
                );
              })}
              <text className="elevation-axis-title" x={padding.left} y="13">
                Altitude · m
              </text>
            </svg>
            <label
              className="elevation-slider-label"
              htmlFor={`${uid}-position`}
            >
              Inspect a position <span>Drag the graph or use the slider</span>
            </label>
            <input
              id={`${uid}-position`}
              className="elevation-slider"
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={selected}
              aria-label="Position on the elevation profile"
              aria-valuetext={`${distanceText(selected * track.length)}, ${heightAt(selected) === null ? "height unavailable" : `${Math.round(heightAt(selected)!)} metres ground altitude`}`}
              onChange={(event) => {
                setHover(null);
                selectFraction(Number(event.target.value));
              }}
            />
            <div
              className="elevation-corners"
              aria-label="Inspect a named corner"
            >
              {corners.map((corner) => (
                <button
                  key={corner.number}
                  type="button"
                  className={highlightedCorner === corner.name ? "active" : ""}
                  aria-pressed={highlightedCorner === corner.name}
                  onClick={() => selectCorner(corner)}
                >
                  <span>{corner.number}</span>
                  {corner.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="elevation-unavailable">
            <strong>Elevation data is unavailable.</strong>
            <p>
              The profile appears when sourced ground samples are available.
              Missing heights are not shown as a flat circuit.
            </p>
          </div>
        )}
      </div>
      <p className="elevation-source">
        {effectiveSource?.url ? (
          <a href={effectiveSource.url} target="_blank" rel="noreferrer">
            {effectiveSource.label}
          </a>
        ) : (
          (effectiveSource?.label ?? "Sourced ground elevations")
        )}
        {effectiveSource?.resolutionMeters
          ? ` · ${effectiveSource.resolutionMeters} m source grid`
          : ""}
        {effectiveSource?.datum ? ` · ${effectiveSource.datum}` : ""}
        {effectiveSource?.sampleSpacingMetres
          ? ` · samples every ~${Math.round(effectiveSource.sampleSpacingMetres)} m`
          : ""}
        . Ground-model heights may differ from the road surface or bridge decks.
        Axes are independently scaled for readability.
        {available && profile.missing > 0
          ? ` ${profile.missing} missing samples; gaps remain visible.`
          : ""}
        {effectiveSource?.note ? ` ${effectiveSource.note}` : ""}
      </p>
    </section>
  );
}
