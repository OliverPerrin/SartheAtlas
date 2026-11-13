import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/**
 * A modelled exterior: one geometry per material name, already in the car's
 * frame (x forward, y up, z right, origin on the ground under the centre).
 * `shell` carries the livery layout in its UVs; see tools/blender/README.md.
 */
export type CarMesh = Record<string, THREE.BufferGeometry>;

const pending = new Map<string, Promise<CarMesh | null>>();
const settled = new Map<string, CarMesh | null>();

/** Quantised attributes become plain floats so geometry can be transformed. */
function toFloat(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const out = new Float32Array(attribute.count * attribute.itemSize);
  for (let i = 0; i < attribute.count; i++)
    for (let k = 0; k < attribute.itemSize; k++)
      out[i * attribute.itemSize + k] = attribute.getComponent(i, k);
  return new THREE.BufferAttribute(out, attribute.itemSize);
}

export function loadCarMesh(url: string): Promise<CarMesh | null> {
  let request = pending.get(url);
  if (!request) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    request = loader
      .loadAsync(url)
      .then((gltf) => {
        const parts: CarMesh = {};
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          const geometry = mesh.geometry;
          for (const name of Object.keys(geometry.attributes))
            geometry.setAttribute(name, toFloat(geometry.attributes[name]));
          geometry.applyMatrix4(mesh.matrixWorld);
          const material = mesh.material as THREE.Material;
          parts[material.name || mesh.name] = geometry;
          material.dispose();
        });
        return parts.shell ? parts : null;
      })
      .catch(() => null)
      .then((parts) => {
        settled.set(url, parts);
        return parts;
      });
    pending.set(url, request);
  }
  return request;
}

/**
 * For render: returns the mesh, or null when the file is missing or broken
 * (the caller falls back to the procedural body). Suspends while loading.
 */
export function readCarMesh(url: string): CarMesh | null {
  if (settled.has(url)) return settled.get(url)!;
  throw loadCarMesh(url);
}
