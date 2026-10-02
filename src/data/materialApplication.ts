// Work only on an exact inspected material. Texture descriptors and UV bindings
// are preserved unless the recipe explicitly requests removal of a colour map.
type MaterialChannel = {
  enable?: boolean;
  color?: number[];
  factor?: number;
  [key: string]: unknown;
};
export type ViewerMaterial = {
  name: string;
  stateSetID: number;
  channels: Record<string, MaterialChannel>;
  [key: string]: unknown;
};
export type MaterialOverride = {
  name: string;
  color?: string;
  colorFactor?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  clearCoat?: number;
  clearCoatRoughness?: number;
  clearColorTexture?: boolean;
};
export function applyMaterialOverride(
  source: ViewerMaterial,
  override: MaterialOverride,
): ViewerMaterial {
  const material = structuredClone(source);
  const channels = material.channels;
  if (override.clearColorTexture) {
    for (const key of ["AlbedoPBR", "DiffusePBR", "DiffuseColor"]) {
      if (channels[key]) channels[key].texture = null;
    }
  }
  const base = channels.AlbedoPBR?.enable
    ? channels.AlbedoPBR
    : channels.DiffusePBR?.enable
      ? channels.DiffusePBR
      : (channels.AlbedoPBR ?? channels.DiffusePBR);
  if (override.color && base && /^#[0-9a-f]{6}$/i.test(override.color)) {
    base.color = [1, 3, 5].map(
      (offset) => parseInt(override.color!.slice(offset, offset + 2), 16) / 255,
    );
    base.factor = 1;
    base.enable = true;
  }
  if (override.colorFactor !== undefined && base)
    base.factor = Math.min(1, Math.max(0, override.colorFactor));
  for (const [key, value] of [
    ["MetalnessPBR", override.metalness],
    ["RoughnessPBR", override.roughness],
    ["Opacity", override.opacity],
    ["ClearCoat", override.clearCoat],
    ["ClearCoatRoughness", override.clearCoatRoughness],
  ] as const) {
    if (value !== undefined && channels[key]) {
      channels[key].factor = Math.min(1, Math.max(0, value));
      channels[key].enable = true;
    }
  }
  return material;
}
