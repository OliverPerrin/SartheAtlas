// Compresses the plain GLB files that build.py writes into the small files
// the site ships: positions as 16-bit, normals as 8-bit and UVs as 16-bit
// integers (KHR_mesh_quantization), then meshopt compression. Materials are
// reduced to their names, which is all the runtime reads.
//
//   node tools/blender/pack.mjs [--in tools/blender/.build] [--out public/models]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MeshoptEncoder } from "meshoptimizer";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const here = new URL(".", import.meta.url).pathname;
const input = resolve(option("in", join(here, ".build")));
const output = resolve(option("out", join(here, "..", "..", "public", "models")));

const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readGlb(file) {
  const data = readFileSync(file);
  const jsonLength = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString());
  const bin = data.subarray(20 + jsonLength + 8);
  return { json, bin };
}

function accessor(json, bin, index) {
  const a = json.accessors[index];
  const view = json.bufferViews[a.bufferView];
  const Type = COMPONENTS[a.componentType];
  const size = SIZES[a.type];
  const stride = view.byteStride ?? Type.BYTES_PER_ELEMENT * size;
  const out = new Type(a.count * size);
  const start = bin.byteOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const source = new DataView(bin.buffer, start);
  const read = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[a.componentType];
  for (let i = 0; i < a.count; i++)
    for (let k = 0; k < size; k++)
      out[i * size + k] = source[read](i * stride + k * Type.BYTES_PER_ELEMENT, true);
  return out;
}

function pack(file) {
  const { json, bin } = readGlb(file);
  const out = {
    asset: { version: "2.0", generator: "sarthe-atlas tools/blender" },
    extensionsUsed: ["KHR_mesh_quantization", "EXT_meshopt_compression"],
    extensionsRequired: ["KHR_mesh_quantization", "EXT_meshopt_compression"],
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };
  const chunks = [];
  let packed = 0;
  let raw = 0;
  const view = (encoded, count, stride, mode) => {
    out.bufferViews.push({
      buffer: 1,
      byteOffset: raw,
      byteLength: count * stride,
      ...(mode === "ATTRIBUTES" ? { byteStride: stride } : {}),
      extensions: {
        EXT_meshopt_compression: { buffer: 0, byteOffset: packed, byteLength: encoded.byteLength, byteStride: stride, count, mode },
      },
    });
    chunks.push(encoded);
    const padded = (encoded.byteLength + 3) & ~3;
    if (padded > encoded.byteLength) chunks.push(new Uint8Array(padded - encoded.byteLength));
    packed += padded;
    raw += (count * stride + 3) & ~3;
    return out.bufferViews.length - 1;
  };
  let triangles = 0;
  for (const node of json.nodes ?? []) {
    if (node.mesh === undefined) continue;
    if (node.translation || node.rotation || node.scale || node.matrix)
      throw new Error(`${file}: ${node.name} has a transform; apply it before export`);
    const mesh = json.meshes[node.mesh];
    const primitive = mesh.primitives[0];
    const position = accessor(json, bin, primitive.attributes.POSITION);
    const normal = accessor(json, bin, primitive.attributes.NORMAL);
    const uv = primitive.attributes.TEXCOORD_0 !== undefined ? accessor(json, bin, primitive.attributes.TEXCOORD_0) : null;
    const indices = Uint32Array.from(accessor(json, bin, primitive.indices));
    const [remap, unique] = MeshoptEncoder.reorderMesh(indices, true, true);
    // Quantise about the mesh's own centre; the node carries the scale back.
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.length; i++) {
      min[i % 3] = Math.min(min[i % 3], position[i]);
      max[i % 3] = Math.max(max[i % 3], position[i]);
    }
    const centre = min.map((v, k) => (v + max[k]) / 2);
    const half = Math.max(1e-6, ...min.map((v, k) => (max[k] - v) / 2));
    const p16 = new Int16Array(unique * 4);
    const n8 = new Int8Array(unique * 4);
    const t16 = uv ? new Uint16Array(unique * 2) : null;
    for (let i = 0; i < remap.length; i++) {
      const to = remap[i];
      if (to === 0xffffffff) continue;
      for (let k = 0; k < 3; k++) {
        p16[to * 4 + k] = Math.round(((position[i * 3 + k] - centre[k]) / half) * 32767);
        n8[to * 4 + k] = Math.round(Math.max(-1, Math.min(1, normal[i * 3 + k])) * 127);
      }
      if (t16)
        for (let k = 0; k < 2; k++)
          t16[to * 2 + k] = Math.round(Math.max(0, Math.min(1, uv[i * 2 + k])) * 65535);
    }
    const bytes = (typed) => new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    const attributes = {};
    const add = (name, typed, stride, componentType, type, extra = {}) => {
      const bufferView = view(MeshoptEncoder.encodeVertexBuffer(bytes(typed), unique, stride), unique, stride, "ATTRIBUTES");
      out.accessors.push({ bufferView, componentType, count: unique, type, normalized: true, ...extra });
      attributes[name] = out.accessors.length - 1;
    };
    const q = (k) => [min[k], max[k]].map((v) => Math.round(((v - centre[k]) / half) * 32767));
    add("POSITION", p16, 8, 5122, "VEC3", { min: [q(0)[0], q(1)[0], q(2)[0]], max: [q(0)[1], q(1)[1], q(2)[1]] });
    add("NORMAL", n8, 4, 5120, "VEC3");
    if (t16) add("TEXCOORD_0", t16, 4, 5123, "VEC2");
    const wide = unique > 65535;
    const index = wide ? indices : Uint16Array.from(indices);
    const indexView = view(MeshoptEncoder.encodeIndexBuffer(bytes(index), index.length, wide ? 4 : 2), index.length, wide ? 4 : 2, "TRIANGLES");
    out.accessors.push({ bufferView: indexView, componentType: wide ? 5125 : 5123, count: index.length, type: "SCALAR" });
    const name = json.materials[primitive.material].name;
    out.materials.push({ name });
    out.meshes.push({ name, primitives: [{ attributes, indices: out.accessors.length - 1, material: out.materials.length - 1 }] });
    out.nodes.push({ name, mesh: out.meshes.length - 1, translation: centre, scale: [half, half, half] });
    out.scenes[0].nodes.push(out.nodes.length - 1);
    triangles += index.length / 3;
  }
  const body = Buffer.concat(chunks);
  out.buffers.push({ byteLength: body.byteLength });
  out.buffers.push({ byteLength: raw, extensions: { EXT_meshopt_compression: { fallback: true } } });
  let text = Buffer.from(JSON.stringify(out));
  if (text.byteLength % 4) text = Buffer.concat([text, Buffer.alloc(4 - (text.byteLength % 4), 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + text.byteLength + 8 + body.byteLength, 8);
  const chunk = (type, length) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(length, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  return { file: Buffer.concat([header, chunk(0x4e4f534a, text.byteLength), text, chunk(0x004e4942, body.byteLength), body]), triangles };
}

await MeshoptEncoder.ready;
mkdirSync(output, { recursive: true });
for (const name of readdirSync(input).filter((f) => f.endsWith(".glb")).sort()) {
  const { file, triangles } = pack(join(input, name));
  writeFileSync(join(output, name), file);
  console.log(`${name.padEnd(22)} ${String(triangles).padStart(6)} triangles ${(file.byteLength / 1024).toFixed(0).padStart(5)} KB`);
}
