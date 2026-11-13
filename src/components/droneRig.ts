import type { Map as GeoMap } from "maplibre-gl";
import { carById, classOrder } from "../data/cars.ts";
import type { Car, ClassName } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import type { Entry } from "../data/entries.ts";
import {
  brakeAt,
  fractionAtTime,
  lineAt,
  speedAt,
  speedModel,
  timeAtFraction,
} from "../data/lapModel.ts";
import type { SpeedModel } from "../data/lapModel.ts";
import { unprojectXZ } from "../data/trackGeo.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import type { Phase } from "../data/racePhase.ts";
import type { DroneCarState } from "../three/droneCars.ts";

/**
 * The drone shared by the home page lap and the circuit atlas: where the three
 * class cars are at a race time, and a chase camera that flies behind one.
 */

/** One car per class: the entry whose colour study each 3D model wears. */
const CAST: Record<ClassName, string> = {
  Hypercar: "50",
  LMP2: "22",
  LMGT3: "92",
};
export function droneCast(): { car: Car; entry: Entry }[] {
  return classOrder.map((cls) => {
    const entry = entries.find((e) => e.number === CAST[cls])!;
    return { car: carById(entry.carId)!, entry };
  });
}

export const droneLighting: Record<
  Phase,
  { brightness: number; saturation: number; contrast: number; hue: number }
> = {
  day: { brightness: 1, saturation: 0.1, contrast: 0.06, hue: 0 },
  dusk: { brightness: 0.74, saturation: 0.05, contrast: 0.2, hue: -8 },
  night: { brightness: 0.5, saturation: -0.45, contrast: 0.3, hue: 0 },
  dawn: { brightness: 0.7, saturation: -0.2, contrast: 0.12, hue: 6 },
};
// Haze at the horizon sells the altitude, and carries the colour of the hour.
export const droneSkies: Record<Phase, Record<string, string | number>> = {
  day: {
    "sky-color": "#7fa6cf",
    "horizon-color": "#f3d6ae",
    "fog-color": "#d9c7a8",
    "sky-horizon-blend": 0.7,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.82,
    "atmosphere-blend": 0,
  },
  dusk: {
    "sky-color": "#3b3f78",
    "horizon-color": "#ff8a3d",
    "fog-color": "#c96a3c",
    "sky-horizon-blend": 0.85,
    "horizon-fog-blend": 0.75,
    "fog-ground-blend": 0.7,
    "atmosphere-blend": 0,
  },
  night: {
    "sky-color": "#02040c",
    "horizon-color": "#1b2550",
    "fog-color": "#0b1024",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.5,
    "fog-ground-blend": 0.8,
    "atmosphere-blend": 0,
  },
  dawn: {
    "sky-color": "#5f79b8",
    "horizon-color": "#ffb3a6",
    "fog-color": "#c9a7b4",
    "sky-horizon-blend": 0.8,
    "horizon-fog-blend": 0.7,
    "fog-ground-blend": 0.72,
    "atmosphere-blend": 0,
  },
};
/** How strongly the circuit's own lighting shows: 0 by day, 1 at night. */
export const droneLit = (phase: Phase) =>
  phase === "night" ? 1 : phase === "dusk" ? 0.55 : phase === "dawn" ? 0.3 : 0;

/** Paint the aerial photograph for the hour. `layer` is the raster layer id. */
export function lightDroneMap(m: GeoMap, layer: string, phase: Phase) {
  const look = droneLighting[phase];
  m.setSky(droneSkies[phase]);
  m.setPaintProperty(layer, "raster-brightness-max", look.brightness);
  m.setPaintProperty(layer, "raster-saturation", look.saturation);
  m.setPaintProperty(layer, "raster-contrast", look.contrast);
  m.setPaintProperty(layer, "raster-hue-rotate", look.hue);
}

/** A width in metres on the ground, as a zoom expression in pixels. */
export const groundWidth = (metres: number) => [
  "interpolate",
  ["exponential", 2],
  ["zoom"],
  12,
  (metres * 2 ** 12) / 52400,
  21,
  (metres * 2 ** 21) / 52400,
];

const smooth = (x: number) => x * x * (3 - 2 * x);
const deg = (radians: number) => (radians * 180) / Math.PI;

export type DroneFrame = {
  cls: ClassName;
  /** Lap fraction of the followed car, along the mapped centreline. */
  fraction: number;
  /** Modelled speed, km/h. */
  kmh: number;
  /** Seconds into the followed car's lap, and its lap time. */
  elapsed: number;
  lap: number;
  /** The followed car on the driving line, metres from the track origin. */
  x: number;
  z: number;
  longitude: number;
  latitude: number;
  heading: number;
};

export function createDroneRig(
  track: TrackGeo,
  gaps: Record<ClassName, number>,
) {
  const models = Object.fromEntries(
    classOrder.map((cls) => [cls, speedModel(track, cls)]),
  ) as Record<ClassName, SpeedModel>;
  const states: DroneCarState[] = classOrder.map(() => ({
    x: 0,
    z: 0,
    heading: 0,
    visible: false,
    brake: 0,
  }));
  // Geographic position of every car, for map markers.
  const points = classOrder.map(() => ({
    longitude: 0,
    latitude: 0,
    heading: 0,
  }));
  const origin: [number, number] = [0, 0];
  let scale = 2;
  // Camera memory: eased zoom and bearing, and a slow clock for the drift.
  let zoom: number | null = null,
    bearing = 0,
    drift = 0;

  const aheadBearing = (fraction: number, metres: number) => {
    const here = lineAt(track, fraction);
    const ahead = lineAt(track, fraction + metres / track.length);
    return 90 + deg(Math.atan2(ahead.z - here.z, ahead.x - here.x));
  };

  return {
    models,
    states: () => states,
    points: () => points,
    origin: () => origin,
    scale: () => scale,
    /** The race time at which a class reaches a lap fraction. */
    timeAt(cls: ClassName, fraction: number) {
      return timeAtFraction(models[cls], fraction) - gaps[cls];
    },
    /**
     * Put every car where it is at race time `t`, measured from the followed
     * car, and report that car's telemetry.
     */
    place(
      t: number,
      followed: ClassName,
      shown?: Record<ClassName, boolean>,
    ): DroneFrame {
      const model = models[followed];
      const fraction = fractionAtTime(model, t + gaps[followed], track.length);
      const car = lineAt(track, fraction);
      origin[0] = car.longitude;
      origin[1] = car.latitude;
      classOrder.forEach((cls, i) => {
        const f =
          cls === followed
            ? fraction
            : fractionAtTime(models[cls], t + gaps[cls], track.length);
        const point = cls === followed ? car : lineAt(track, f);
        const state = states[i];
        state.x = point.x - car.x;
        state.z = point.z - car.z;
        state.heading = point.heading;
        state.brake = brakeAt(models[cls], f);
        state.visible =
          (shown?.[cls] ?? true) && Math.hypot(state.x, state.z) < 1400;
        points[i].longitude = point.longitude;
        points[i].latitude = point.latitude;
        points[i].heading = point.heading;
      });
      return {
        cls: followed,
        fraction,
        kmh: speedAt(model, fraction) * 3.6,
        elapsed:
          (((t + gaps[followed]) % model.lapTime) + model.lapTime) %
          model.lapTime,
        lap: model.lapTime,
        x: car.x,
        z: car.z,
        longitude: car.longitude,
        latitude: car.latitude,
        heading: car.heading,
      };
    },
    /** Forget the camera's momentum, e.g. when the chase starts or jumps. */
    cut() {
      zoom = null;
      drift = 0;
    },
    /**
     * Fly the chase camera for one frame. `dt` is real seconds, so the camera
     * eases the same whatever the playback speed. A helicopter shot: tighter
     * in the slow corners, pulled back and flatter where the ground goes by
     * fastest, but never so close that a hairpin looks like a crawl.
     */
    chase(m: GeoMap, frame: DroneFrame, dt: number, height: number) {
      const pace = smooth(Math.min(1, Math.max(0, (frame.kmh - 80) / 250)));
      const goalZoom = 18.9 - pace * 0.65;
      // Look where the line goes over the next second or so.
      const goal = aheadBearing(
        frame.fraction,
        Math.max(45, (frame.kmh / 3.6) * 0.9),
      );
      if (zoom === null) {
        zoom = goalZoom;
        bearing = goal;
      }
      drift += dt;
      zoom += (goalZoom - zoom) * Math.min(1, dt * 0.8);
      bearing += (((goal - bearing + 540) % 360) - 180) * Math.min(1, dt * 1.8);
      // Cars are drawn a little over scale, more so from further away, so
      // they stay readable from the air.
      scale = 1.45 + (19.25 - zoom) * 0.7;
      const view = bearing + Math.sin(drift / 11) * 12;
      const tilt = 71 + pace * 4 + Math.sin(drift / 13) * 2;
      // Frame the car in the lower part of the picture by aiming the camera
      // at the road ahead of it. (Map padding would do this too, but the sky
      // is drawn from the unpadded centre and leaves a blank band.)
      const metresPerPixel =
        (78271.517 * Math.cos((frame.latitude * Math.PI) / 180)) / 2 ** zoom;
      const lead =
        (height * 0.13 * metresPerPixel) / Math.cos((tilt * Math.PI) / 180);
      const rad = (view * Math.PI) / 180;
      m.jumpTo({
        center: unprojectXZ(
          track,
          frame.x + Math.sin(rad) * lead,
          frame.z - Math.cos(rad) * lead,
        ),
        bearing: view,
        zoom: zoom + Math.sin(drift / 9) * 0.1,
        pitch: tilt,
      });
    },
    /** The last stretch of line the followed car covered, for its trail. */
    trail(frame: DroneFrame, metres = 80, steps = 24) {
      const tail = frame.fraction - metres / track.length;
      const coordinates: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const p = lineAt(track, tail + ((frame.fraction - tail) * i) / steps);
        coordinates.push([p.longitude, p.latitude]);
      }
      return coordinates;
    },
    /** Where the camera should open, before the first frame. */
    opening(fraction: number) {
      const p = lineAt(track, fraction);
      return {
        center: [p.longitude, p.latitude] as [number, number],
        bearing: aheadBearing(fraction, 70),
      };
    },
  };
}
export type DroneRig = ReturnType<typeof createDroneRig>;
