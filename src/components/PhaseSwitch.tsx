import { phaseIcon } from "./phaseIcon.ts";
import { phaseInfo, phases, setPhase, usePhase } from "../data/racePhase.ts";

/** The site's one time-of-day control: day, dusk, night or dawn. */
export default function PhaseSwitch({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Icons only, for the header. */
  compact?: boolean;
}) {
  const phase = usePhase();
  return (
    <div
      className={`seg phase-switch${compact ? " compact" : ""} ${className}`}
      role="group"
      aria-label="Time of day"
    >
      {phases.map((p) => {
        const Icon = phaseIcon[p];
        return (
          <button
            key={p}
            aria-pressed={phase === p}
            aria-label={compact ? phaseInfo[p].label : undefined}
            title={compact ? phaseInfo[p].label : undefined}
            onClick={() => setPhase(p)}
          >
            <Icon size={15} />
            <span>{phaseInfo[p].label}</span>
          </button>
        );
      })}
    </div>
  );
}
