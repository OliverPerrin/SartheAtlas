import { createContext, useContext } from "react";
import * as THREE from "three";
import type { SystemId } from "../data/systems.ts";
import { createBuildClock, packGarage } from "./teardown.ts";
import type {
  BuildClock,
  GarageLayout,
  LayoutItem,
  StudioMode,
} from "./teardown.ts";

/**
 * Measures the assemblies that are actually mounted, then packs them on the
 * garage floor. Parts register themselves; measuring happens lazily so late
 * suspense chunks are included once they arrive.
 */
export class GarageRegistry {
  private entries = new Map<THREE.Group, { system: SystemId; key: string }>();
  private layout: GarageLayout | null = null;
  private serial = 0;
  private listeners = new Set<() => void>();
  version = 0;

  add(group: THREE.Group, system: SystemId) {
    this.entries.set(group, { system, key: `${system}#${this.serial++}` });
    this.invalidate();
    return () => {
      this.entries.delete(group);
      this.invalidate();
    };
  }

  invalidate() {
    this.layout = null;
    this.version++;
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  current(): GarageLayout {
    if (!this.layout) this.layout = this.measure();
    return this.layout;
  }

  offsetFor(group: THREE.Group) {
    const entry = this.entries.get(group);
    return entry ? this.current().offsets.get(entry.key) : undefined;
  }

  private measure(): GarageLayout {
    const items: LayoutItem[] = [];
    const box = new THREE.Box3();
    const part = new THREE.Box3();
    for (const [group, entry] of this.entries) {
      group.updateWorldMatrix(true, true);
      box.makeEmpty();
      group.traverseVisible((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        part.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
        box.union(part);
      });
      if (box.isEmpty()) continue;
      // Remove the part's own travel so the measurement is the assembled pose.
      const travel = new THREE.Vector3().setFromMatrixPosition(
        group.matrixWorld,
      );
      box.translate(travel.negate());
      items.push({
        key: entry.key,
        system: entry.system,
        min: box.min.toArray() as [number, number, number],
        max: box.max.toArray() as [number, number, number],
      });
    }
    return packGarage(items);
  }
}

export type TeardownState = {
  mode: StudioMode;
  clock: BuildClock;
  garage: GarageRegistry;
};

export const TeardownCtx = createContext<TeardownState>({
  mode: "cutaway",
  clock: createBuildClock(),
  garage: new GarageRegistry(),
});

export const useTeardown = () => useContext(TeardownCtx);
