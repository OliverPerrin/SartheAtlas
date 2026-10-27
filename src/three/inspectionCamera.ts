import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import type { Preset } from "./cameraPresets.ts";
import type { V3 } from "./primitives.tsx";
import * as THREE from "three";
import { cockpitLayout } from "./cockpitLayout.ts";
import { layerWeights } from "./layerPlan.ts";
import { mechanicalLayout } from "./mechanicalGeometry.ts";

export function setCameraProjection(
  camera: THREE.PerspectiveCamera,
  fov: number,
  near: number,
) {
  camera.fov = fov;
  camera.near = near;
  camera.updateProjectionMatrix();
}

export function inspectionFrame(
  car: Car,
  body: Body,
  shape: Shape,
  preset: Preset,
  lift: number,
) {
  const layers = layerWeights(lift);
  const cabinRise = 0.72 * layers.cabin;
  // A high rear-quarter view looks over the seat back into the wheel, dash
  // and pedal box, instead of placing the near plane against the headrest.
  const cockpit = cockpitLayout(car, body, shape);
  if (preset === "cockpit")
    return {
      position: [
        cockpit.wheel[0] - 0.95,
        cockpit.wheel[1] + 0.78 + cabinRise,
        cockpit.z + 0.86,
      ] as V3,
      target: [
        cockpit.wheel[0],
        cockpit.wheel[1] + cabinRise,
        cockpit.wheel[2],
      ] as V3,
      fov: 46,
    };
  if (preset === "pedals")
    // Look over the sill and down into the footwell. The wheel and dash sit
    // outboard of this line, so the pedals stay visible without hiding parts.
    return {
      position: [
        cockpit.pedals[0] - 0.72,
        cockpit.pedals[1] + 0.62 + cabinRise,
        cockpit.z + 0.92,
      ] as V3,
      target: [
        cockpit.pedals[0] + 0.02,
        cockpit.pedals[1] + 0.1 + cabinRise,
        cockpit.z + 0.02,
      ] as V3,
      fov: 48,
    };
  if (preset === "running")
    return {
      position: [
        body.frontX + 0.65,
        1.02 + 0.05 * layers.bodywork,
        0.32 + 0.35 * layers.cabin,
      ] as V3,
      target: [
        body.frontX,
        0.35 + 0.04 * layers.cabin,
        body.wheelZ * 0.65 + 0.5 * layers.cabin,
      ] as V3,
      fov: 48,
    };
  const engine = mechanicalLayout(car, body, shape).engineX;
  const engineRise = 0.5 * layers.cabin;
  if (preset === "powertrain") {
    // Front-mid cars are best seen from the front quarter. Mid- and rear-engine
    // GT cars have the tub, fuel cell, roll hoop and transaxle packed around
    // the engine, so look in from the rear quarter, low enough to keep the
    // cylinder banks and headers readable instead of foreshortened.
    if (car.engine.position === "front-mid")
      return {
        position: [
          engine + 1.15 - 0.08 * layers.cabin,
          1.48 + engineRise,
          1.15,
        ] as V3,
        target: [engine - 0.08 * layers.cabin, 0.47 + engineRise, 0] as V3,
        fov: 42,
      };
    const rear = car.engine.position === "rear";
    // Leave headroom for the engine teardown envelope: cam covers travel
    // 0.13 m along the bank normal and the plenum 0.09 m upwards, so frame
    // the assembled engine a little wider than its closed silhouette.
    return {
      position: [
        engine - (rear ? 0.9 : 0.44),
        (rear ? 1.12 : 1.68) + engineRise,
        rear ? 0.98 : 1.04,
      ] as V3,
      target: [engine + (rear ? 0.04 : 0), (rear ? 0.45 : 0.4) + engineRise, 0] as V3,
      fov: 46,
    };
  }
  return {
    position: [
      engine + 1.15 - 0.08 * layers.cabin,
      1.48 + engineRise,
      1.15,
    ] as V3,
    target: [engine - 0.08 * layers.cabin, 0.47 + engineRise, 0] as V3,
    fov: 42,
  };
}
