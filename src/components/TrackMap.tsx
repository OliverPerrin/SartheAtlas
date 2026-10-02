import { useMemo, useCallback } from "react";
import type { RefObject } from "react";
import type { TrackGeo } from "../data/trackGeo.ts";
import { pointAt, projectLngLat } from "../data/trackGeo.ts";
import { usePitLane } from "../data/pitLane.ts";
import { sections } from "../data/track.ts";

type Props = {
  track: TrackGeo;
  activeCorner?: string;
  activeSection?: string;
  onCorner?: (name: string) => void;
  labels?: boolean;
  dots?: { fraction: number; color: string }[];
  className?: string;
  viewportRef?: RefObject<SVGSVGElement | null>;
};

export const namedCorners = [1, 2, 6, 7, 8, 9, 10, 12, 14, 16, 17, 18];

export default function TrackMap({
  track,
  activeCorner,
  activeSection,
  onCorner,
  labels = true,
  dots = [],
  className,
  viewportRef,
}: Props) {
  const { pitLane } = usePitLane();
  const { minX, maxX, minZ, maxZ } = track.bounds;
  const pad = 420;
  const w = maxX - minX + pad * 2,
    h = maxZ - minZ + pad * 2;
  const P = useCallback(
    (x: number, z: number) =>
      `${(x - minX + pad).toFixed(1)},${(z - minZ + pad).toFixed(1)}`,
    [minX, minZ, pad],
  );
  const paths = useMemo(
    () =>
      sections.map((s) => {
        const pts: string[] = [];
        track.points.forEach((p, i) => {
          const f = track.cum[i] / track.length;
          if (f >= s.from - 0.002 && f <= s.to + 0.002) pts.push(P(p[0], p[1]));
        });
        if (s.to >= 1) pts.push(P(track.points[0][0], track.points[0][1]));
        return { s, d: "M" + pts.join(" L") };
      }),
    [track, P],
  );
  const full = useMemo(
    () => "M" + track.points.map((p) => P(p[0], p[1])).join(" L") + "Z",
    [track, P],
  );
  const pitPath = useMemo(
    () =>
      pitLane
        ? "M" +
          pitLane.coordinates
            .map(([lng, lat]) => {
              const [x, z] = projectLngLat(track, lng, lat);
              return P(x, z);
            })
            .join(" L")
        : null,
    [pitLane, track, P],
  );
  const start = track.points[0];
  const seen = new Set<string>();
  const markers = track.corners.filter((c) => {
    if (!namedCorners.includes(c.number) || seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
  const fs = w / 40;
  return (
    <svg
      ref={viewportRef}
      className={className}
      viewBox={`0 0 ${w.toFixed(0)} ${h.toFixed(0)}`}
      role={onCorner ? "group" : "img"}
      aria-label="Map of the Circuit de la Sarthe"
    >
      <path
        d={full}
        fill="none"
        stroke="rgba(61,123,255,0.18)"
        strokeWidth={fs * 1.6}
        strokeLinejoin="round"
      />
      <path
        d={full}
        fill="none"
        stroke="#0b1226"
        strokeWidth={fs * 0.75}
        strokeLinejoin="round"
      />
      {paths.map(({ s, d }) => (
        <path
          key={s.id}
          d={d}
          fill="none"
          stroke={s.color}
          strokeWidth={activeSection === s.id ? fs * 0.6 : fs * 0.36}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={activeSection && activeSection !== s.id ? 0.35 : 1}
        />
      ))}
      {pitLane && (
        <path
          d={pitPath ?? undefined}
          fill="none"
          stroke="#ffe0a2"
          strokeWidth={fs * 0.2}
          strokeDasharray={`${fs * 0.4} ${fs * 0.25}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>Mapped pit entry, pit lane and exit</title>
        </path>
      )}
      <g transform={`translate(${P(start[0], start[1])})`}>
        <rect
          x={-fs * 0.9}
          y={-fs * 0.2}
          width={fs * 1.8}
          height={fs * 0.4}
          fill="#fff"
        />
        {labels && (
          <text
            x={fs * 1.3}
            y={fs * 0.35}
            fontSize={fs * 0.9}
            fill="#fff"
            fontWeight={700}
            fontFamily="Barlow Condensed, sans-serif"
          >
            START / FINISH
          </text>
        )}
      </g>
      {markers.map((c) => {
        const active = activeCorner === c.name;
        // Dense sequences read more clearly with labels alternating across the road.
        const left = [1, 12, 16, 18].includes(c.number);
        const labelY =
          c.number === 1 ? fs * 1.05 : c.number === 2 ? -fs * 0.25 : fs * 0.3;
        return (
          <g
            key={c.number}
            transform={`translate(${P(c.x, c.z)})`}
            className={onCorner ? "map-corner" : undefined}
            onClick={onCorner ? () => onCorner(c.name) : undefined}
            role={onCorner ? "button" : undefined}
            tabIndex={onCorner ? 0 : undefined}
            aria-pressed={onCorner ? active : undefined}
            onKeyDown={
              onCorner
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCorner(c.name);
                    }
                  }
                : undefined
            }
            aria-label={onCorner ? `Corner ${c.number}, ${c.name}` : undefined}
          >
            {onCorner && <circle r={fs * 1.35} fill="transparent" />}
            <circle
              r={fs * (active ? 0.95 : 0.7)}
              fill={active ? "#3d7bff" : "#f4f6ff"}
              stroke="#0b1226"
              strokeWidth={fs * 0.12}
            />
            <text
              y={fs * 0.28}
              fontSize={fs * 0.78}
              textAnchor="middle"
              fill={active ? "#fff" : "#0b1226"}
              fontWeight={800}
              fontFamily="Barlow Condensed, sans-serif"
            >
              {c.number}
            </text>
            {labels && (
              <text
                x={fs * (left ? -1.2 : 1.2)}
                y={labelY}
                textAnchor={left ? "end" : "start"}
                fontSize={fs * 0.8}
                fill={active ? "#fff" : "#9fb0dd"}
                fontWeight={700}
                fontFamily="Barlow Condensed, sans-serif"
                letterSpacing={fs * 0.02}
              >
                {c.name.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
      {dots.map((d, i) => {
        const p = pointAt(track, d.fraction);
        return (
          <circle
            key={i}
            cx={p.x - minX + pad}
            cy={p.z - minZ + pad}
            r={fs * 0.55}
            fill={d.color}
            stroke="#fff"
            strokeWidth={fs * 0.12}
          />
        );
      })}
    </svg>
  );
}
