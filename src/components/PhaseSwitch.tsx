import { phaseIcon } from "./phaseIcon.ts";
import { phaseInfo, phases, setPhase, usePhase } from "../data/racePhase.ts";

/** The four lights of the race as a frosted switch with a sliding knob. */
export default function PhaseSwitch({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const phase = usePhase();
  return (
    <div
      className={`glass-switch phase-switch${compact ? " compact" : ""} ${className}`}
      role="group"
      aria-label="Time of day"
      style={
        {
          "--n": phases.length,
          "--i": phases.indexOf(phase),
        } as React.CSSProperties
      }
    >
      {phases.map((p) => {
        const Icon = phaseIcon[p];
        return (
          <button
            key={p}
            aria-pressed={phase === p}
            aria-label={compact ? phaseInfo[p].label : undefined}
            title={`${phaseInfo[p].label} · ${phaseInfo[p].clock}`}
            onClick={() => setPhase(p)}
          >
            <Icon size={14} />
            {!compact && <span>{phaseInfo[p].label}</span>}
          </button>
        );
      })}
    </div>
  );
}
