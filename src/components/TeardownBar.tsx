import { useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw, Wrench } from "lucide-react";
import type { Car } from "../data/cars.ts";
import { BUILD_STEPS, currentStep } from "../three/teardown.ts";
import type { BuildClock, StudioMode } from "../three/teardown.ts";

function BuildTimeline({ car, clock }: { car: Car; clock: BuildClock }) {
  const progress = useSyncExternalStore(clock.subscribe, clock.get);
  const playing = useSyncExternalStore(clock.subscribe, clock.isPlaying);
  const index = currentStep(progress);
  const step = BUILD_STEPS[index];
  const done = progress >= 1;
  return (
    <div className="teardown-bar build">
      <button
        className="teardown-play"
        onClick={() => (playing ? clock.pause() : clock.play())}
        aria-label={
          playing ? "Pause build" : done ? "Replay build" : "Play build"
        }
      >
        {playing ? (
          <Pause size={16} />
        ) : done ? (
          <RotateCcw size={16} />
        ) : (
          <Play size={16} />
        )}
      </button>
      <div className="teardown-track">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            clock.pause();
            clock.set(Number(e.target.value));
          }}
          aria-label="Build progress"
          aria-valuetext={`Step ${index + 1} of ${BUILD_STEPS.length}: ${step.label}`}
        />
        <ol className="teardown-steps" aria-hidden="true">
          {BUILD_STEPS.map((s, i) => (
            <li
              key={s.label}
              title={s.label}
              className={i < index || done ? "done" : i === index ? "on" : ""}
            />
          ))}
        </ol>
      </div>
      <p className="teardown-caption" aria-live="polite">
        <strong>
          {done
            ? "Ready to roll out"
            : `Step ${index + 1} of ${BUILD_STEPS.length} · ${step.label}`}
        </strong>
        {done
          ? "Every assembly is installed. Switch to Wind tunnel to see how air moves around the finished car."
          : step.detail(car)}
      </p>
    </div>
  );
}

export function TeardownBar({
  mode,
  car,
  clock,
  onBuild,
}: {
  mode: StudioMode;
  car: Car;
  clock: BuildClock;
  onBuild: () => void;
}) {
  if (mode === "build") return <BuildTimeline car={car} clock={clock} />;
  if (mode === "garage")
    return (
      <div className="teardown-bar">
        <p className="teardown-caption">
          <strong>Garage layout</strong>
          Every assembly off the car and laid out in primer, grouped the way a
          team strips a car between sessions. Select a part to name its
          components.
        </p>
        <button className="btn primary teardown-cta" onClick={onBuild}>
          <Wrench size={15} /> Build it
        </button>
      </div>
    );
  if (mode === "tunnel")
    return (
      <div className="teardown-bar tunnel">
        <div className="flow-legend" aria-label="Relative air speed">
          <span>Slower</span>
          <i />
          <span>Faster</span>
        </div>
        <p className="teardown-caption">
          <strong>Illustrative airflow · not CFD</strong>
          Paths follow this study's own body. Air speeds up over the roof and
          under the floor; the diffuser and rear wing turn it upward, which
          pushes the car down. Vortices roll off the wing tips.
        </p>
      </div>
    );
  return null;
}
