import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import type { Preset } from "./cameraPresets.ts";
import type { V3 } from "./primitives.tsx";
import * as THREE from "three";
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
  const proto = car.category !== "LMGT3";
  const roof = body.x(shape.cockpit.roof);
  const driver = proto ? 0.08 : -0.36;
  const raised = lift * 0.9;
  if (preset === "cockpit")
    return {
      position: [
        roof - 0.28,
        (proto ? 0.91 : 1.04) + raised,
        driver + 0.14,
      ] as V3,
      target: [roof + 0.44, (proto ? 0.53 : 0.65) + raised, driver] as V3,
      fov: 68,
    };
  if (preset === "pedals")
    return {
      position: [roof + 0.12, 0.39 + raised, driver + 0.5] as V3,
      target: [roof + 0.82, 0.2 + raised, driver] as V3,
      fov: 55,
    };
  if (preset === "running")
    return {
      position: [
        body.frontX + 0.65,
        1.02 + 0.05 * lift,
        0.32 + 0.4 * lift,
      ] as V3,
      target: [
        body.frontX,
        0.35 + 0.05 * lift,
        body.wheelZ * 0.65 + 0.4 * lift,
      ] as V3,
      fov: 48,
    };
  const engine = mechanicalLayout(car, body, shape).engineX;
  return {
    position: [engine + 1.15, 1.48 + 0.75 * lift, 1.15] as V3,
    target: [engine, 0.47 + 0.75 * lift, 0] as V3,
    fov: 42,
  };
}
