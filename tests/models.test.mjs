import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { cars } from "../src/data/cars.ts";
import { modelledCars } from "../src/data/carModels.ts";
import { Body } from "../src/three/body.ts";
import { shapes } from "../src/three/shapes.ts";

function readGlb(path) {
  const data = readFileSync(path);
  assert.equal(data.readUInt32LE(0), 0x46546c67, `${path}: glTF magic`);
  assert.equal(data.readUInt32LE(8), data.byteLength, `${path}: declared length`);
  const jsonLength = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + jsonLength).toString());
}

/** World-space bounds of a packed mesh, from its quantised accessor and node. */
function bounds(json, name) {
  const node = json.nodes.find((n) => n.name === name);
  if (!node) return null;
  const position = json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
  const at = (q, k) => node.translation[k] + (q / 32767) * node.scale[k];
  return { min: position.min.map(at), max: position.max.map(at) };
}

test("every modelled car ships a full and a light mesh that match its dimensional skeleton", () => {
  assert.ok(modelledCars.length > 0);
  for (const id of modelledCars) {
    assert.ok(cars.some((car) => car.id === id), `${id} is a catalogue car`);
    const body = new Body(shapes[id].body);
    const { length, width, wheelR } = body.spec;
    for (const file of [`public/models/${id}.glb`, `public/models/${id}.lod.glb`]) {
      assert.ok(existsSync(file), `${file} exists; run npm run models:build`);
      const json = readGlb(file);
      assert.deepEqual(json.extensionsRequired.sort(), ["EXT_meshopt_compression", "KHR_mesh_quantization"]);
      const names = json.nodes.map((node) => node.name);
      for (const part of ["shell", "glass", "lamp_front", "lamp_rear"])
        assert.ok(names.includes(part), `${file}: ${part}`);
      const shell = json.meshes[json.nodes.find((n) => n.name === "shell").mesh].primitives[0];
      assert.ok(shell.attributes.TEXCOORD_0 !== undefined, `${file}: the shell carries the livery layout`);
      const box = bounds(json, "shell");
      // x forward, y up, z right; the origin is on the ground under the centre.
      assert.ok(Math.abs(box.max[0] - box.min[0] - length) < 0.02, `${file}: length ${(box.max[0] - box.min[0]).toFixed(3)} vs ${length}`);
      assert.ok(Math.abs(box.max[0] + box.min[0]) < 0.02, `${file}: centred along its length`);
      assert.ok(Math.abs(box.max[2] + box.min[2]) < 0.005, `${file}: symmetric`);
      assert.ok(Math.abs(box.max[2] - box.min[2] - width) < 0.04, `${file}: width ${(box.max[2] - box.min[2]).toFixed(3)} vs ${width}`);
      assert.ok(box.min[1] > 0.05 && box.min[1] < 0.25, `${file}: ride height ${box.min[1].toFixed(3)}`);
      assert.ok(box.max[1] > wheelR * 2 + 0.3 && box.max[1] < 1.5, `${file}: roof ${box.max[1].toFixed(3)}`);
      // The wheel openings sit over the skeleton's axles: the arch lips are
      // built round them, so their extent along the car gives the axle span.
      const trim = bounds(json, "trim");
      assert.ok(trim, `${file}: trim`);
    }
    const full = statSync(`public/models/${id}.glb`).size;
    const light = statSync(`public/models/${id}.lod.glb`).size;
    assert.ok(full < 320 * 1024, `${id}: ${Math.round(full / 1024)} KB`);
    assert.ok(light < full * 0.6, `${id}: light mesh ${Math.round(light / 1024)} KB`);
  }
});
