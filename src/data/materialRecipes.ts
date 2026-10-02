// Runtime finish corrections for specific creator-hosted models.
// Names and channel roles verified with the official Sketchfab Viewer SDK on 2026-09-30.
// This is a plain studio finish, not a race-entry livery or manufacturer material specification.
// Original Corvette recipe: d76261866d3047d4b2f76993bf92f85e by MattDoesBlender.
// BMW and Genesis names, maps and node roles were also verified via the official SDK.
export type MaterialRecipe = {
  name: string;
  color?: string;
  colorFactor?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  clearCoat?: number;
  clearCoatRoughness?: number;
};

export const materialRecipes: Record<string, readonly MaterialRecipe[]> = {
  // Valkyrie LM source: tyre/carbon scalar metalness and mapped glass inspected live.
  // Keep texture maps and UVs; scale the pale rubber atlas without replacing it.
  // Body paint, opacity atlas and car graphics retain their authored channels.
  aston: [
    { name: "EXT_TYRE", colorFactor: 0.28, metalness: 0, roughness: 0.88 },
    { name: "CHASSIS_CARBON", metalness: 0.03, roughness: 0.5 },
    {
      name: "EXT_GLASS",
      metalness: 0,
      clearCoat: 0.3,
      clearCoatRoughness: 0.08,
    },
  ],
  // TR010: repair separate untextured lenses/interior without replacing race paint maps.
  toyota: [
    {
      name: "PAINT",
      metalness: 0,
      roughness: 0.34,
      clearCoat: 0.38,
      clearCoatRoughness: 0.22,
    },
    {
      name: "FRONT_LIGHTS",
      color: "#171c24",
      metalness: 0.03,
      roughness: 0.18,
      clearCoat: 0.3,
      clearCoatRoughness: 0.12,
    },
    {
      name: "GLASS",
      color: "#26333f",
      metalness: 0,
      roughness: 0.075,
      opacity: 0.16,
    },
    { name: "EXT_GLASS", metalness: 0, roughness: 0.08 },
    { name: "INT_GLASS", metalness: 0, roughness: 0.09 },
    { name: "BLACK", color: "#11151a", metalness: 0, roughness: 0.67 },
    {
      name: "COCKPIT_DETAIL",
      color: "#252a30",
      metalness: 0.03,
      roughness: 0.63,
    },
    {
      name: "COCKPIT_ALCANTARA",
      color: "#15191e",
      metalness: 0,
      roughness: 0.94,
    },
    { name: "ALCANTARA", color: "#15191e", metalness: 0, roughness: 0.94 },
    { name: "STEER_COLOR", color: "#242b33", metalness: 0.03, roughness: 0.61 },
    { name: "ENGINE", color: "#434b54", metalness: 0.58, roughness: 0.5 },
    { name: "SAFE", color: "#333b45", metalness: 0.04, roughness: 0.66 },
    { name: "SEATBELT", color: "#252930", metalness: 0, roughness: 0.94 },
    { name: "TYRE", metalness: 0, roughness: 0.9 },
    { name: "RIM", metalness: 0.76, roughness: 0.38 },
    { name: "CARBON", metalness: 0.03, roughness: 0.57 },
    { name: "MIRROR", metalness: 1, roughness: 0.1 },
  ],
  // JUSTGAME BMW: keep all original livery/tyre maps; correct flat default finishes.
  bmw: [
    {
      name: "Body",
      metalness: 0,
      roughness: 0.34,
      clearCoat: 0.42,
      clearCoatRoughness: 0.21,
    },
    {
      name: "Body.001",
      metalness: 0,
      roughness: 0.34,
      clearCoat: 0.42,
      clearCoatRoughness: 0.21,
    },
    { name: "EXT_Tyre", metalness: 0, roughness: 0.87 },
    { name: "RIMS", metalness: 0.78, roughness: 0.34 },
    { name: "carbon", metalness: 0.03, roughness: 0.52 },
    { name: "Bottom", metalness: 0, roughness: 0.63 },
    { name: "glass", metalness: 0, roughness: 0.075 },
    { name: "Glass", metalness: 0, roughness: 0.14 },
    { name: "MIRRORS", metalness: 0.88, roughness: 0.12 },
    // Confirmed rolling-wheel overlays obscure the actual stationary spokes.
    { name: "EXT_Rim_Blur", opacity: 0 },
    { name: "EXT_Rim_Blur_2", opacity: 0 },
  ],
  // LMP12 GMR-001: original colour maps remain; tint only the grey rubber atlas.
  genesis: [
    {
      name: "PAINT",
      metalness: 0.04,
      roughness: 0.36,
      clearCoat: 0.38,
      clearCoatRoughness: 0.24,
    },
    { name: "EXT_TYRES", color: "#555961", metalness: 0, roughness: 0.9 },
    { name: "RIM", color: "#2d3238", metalness: 0.76, roughness: 0.38 },
    { name: "CARBON", metalness: 0.025, roughness: 0.55 },
    { name: "CHASSIS_DETAIL", metalness: 0.05, roughness: 0.6 },
    { name: "BODY_DETAIL", metalness: 0.02, roughness: 0.42 },
    {
      name: "EXT_GLASS",
      color: "#34404d",
      metalness: 0,
      roughness: 0.075,
      opacity: 0.12,
      clearCoat: 0.35,
      clearCoatRoughness: 0.085,
    },
    {
      name: "INT_GLASS",
      color: "#788594",
      metalness: 0,
      roughness: 0.095,
      opacity: 0.07,
    },
    { name: "MIRROR", metalness: 1, roughness: 0.09 },
    { name: "CHROME", metalness: 0.84, roughness: 0.28 },
    { name: "DISC", metalness: 0.74, roughness: 0.61 },
  ],
  corvette: [
    {
      color: "#060809",
      metalness: 0,
      name: "BLACK_PARTS",
      roughness: 0.6,
    },
    {
      color: "#0d141c",
      metalness: 0,
      name: "EXT_LIGHTS_GLASS_FRONT",
      opacity: 0.26,
      roughness: 0.08,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_PLASTIC_DASH",
      roughness: 0.6,
    },
    {
      color: "#33383d",
      metalness: 0.8,
      name: "EXT_EXAULST",
      roughness: 0.42,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "EXT_DECALS",
      opacity: 0,
      roughness: 0.6,
    },
    {
      color: "#850204",
      metalness: 0,
      name: "EXT_LIGHTS_GLASS_REAR",
      opacity: 0.65,
      roughness: 0.08,
    },
    {
      color: "#0d141c",
      metalness: 0,
      name: "EXT_GLASS",
      opacity: 0.26,
      roughness: 0.08,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "EXT_CHASSIS_CARBON",
      roughness: 0.6,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_WINDOWS_BLACK",
      roughness: 0.6,
    },
    {
      color: "#030405",
      metalness: 0,
      name: "EXT_TIRE_WALL",
      roughness: 0.92,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_BANNER",
      roughness: 0.6,
    },
    {
      color: "#0d141c",
      metalness: 0,
      name: "INT_GLASS",
      opacity: 0.26,
      roughness: 0.08,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_CARBON",
      roughness: 0.6,
    },
    {
      color: "#030405",
      metalness: 0,
      name: "EXT_TIRE_TREAD",
      roughness: 0.92,
    },
    {
      color: "#b3bdcc",
      metalness: 1,
      name: "MIRROR",
      roughness: 0.06,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_NET",
      roughness: 0.6,
    },
    {
      color: "#bfd1e6",
      metalness: 0.45,
      name: "EXT_LIGHTS",
      roughness: 0.18,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_COCKPIT_DETAILS",
      roughness: 0.6,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_LEDS",
      roughness: 0.6,
    },
    {
      clearCoat: 1,
      clearCoatRoughness: 0.08,
      color: "#e69e02",
      metalness: 0.05,
      name: "EXT_CARPAINT",
      roughness: 0.22,
    },
    {
      color: "#33383d",
      metalness: 0.8,
      name: "INT_ROOLCAGE",
      roughness: 0.42,
    },
    {
      color: "#24262b",
      metalness: 0.9,
      name: "EXT_RIMS_BLUR",
      opacity: 0,
      roughness: 0.27,
    },
    {
      color: "#33383d",
      metalness: 0.8,
      name: "INT_METAL_COCKPIT",
      roughness: 0.42,
    },
    {
      color: "#33383d",
      metalness: 0.8,
      name: "EXT_MECANICALS_PARTS",
      roughness: 0.42,
    },
    {
      color: "#45474d",
      metalness: 0.85,
      name: "BRAKE_DISC",
      roughness: 0.58,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "EXT_WINDOWS_BLACK",
      roughness: 0.6,
    },
    {
      color: "#33383d",
      metalness: 0.8,
      name: "ENGINE",
      roughness: 0.42,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "EXT_GRILL",
      roughness: 0.6,
    },
    {
      color: "#0d141c",
      metalness: 0,
      name: "INT_GLASS_DASH",
      opacity: 0.26,
      roughness: 0.08,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_ALCANTARA",
      roughness: 0.6,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "DISPLAY",
      roughness: 0.6,
    },
    {
      color: "#24262b",
      metalness: 0.9,
      name: "EXT_RIMS",
      roughness: 0.27,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_STEER_WHEEL",
      roughness: 0.6,
    },
    {
      color: "#060809",
      metalness: 0,
      name: "INT_STEER_DECALS",
      opacity: 0,
      roughness: 0.6,
    },
  ],
};

// Never reuse these names against a different creator's model of the same car.
export const materialRecipeModelIds: Record<string, string> = {
  aston: "7daa766d301f4d489312b0922d4bdc0d",
  corvette: "d76261866d3047d4b2f76993bf92f85e",
  toyota: "9d9800d56b754f65acfba6f91966a5c3",
  bmw: "9871477854b64e82bd43438eb9b940fd",
  genesis: "b78356b7cea64044839219c44329ff82",
};

// These are documented setEnvironment() properties; the owner HDR is retained.
export type EnvironmentRecipe = {
  exposure?: number;
  lightIntensity?: number;
  shadowEnabled?: boolean;
};
export const environmentRecipes: Record<string, EnvironmentRecipe> = {
  bmw: { exposure: 1.25, lightIntensity: 1.6 },
  genesis: { exposure: 1.4, lightIntensity: 1.5, shadowEnabled: false },
};

// Identified source filters add synthetic grain/halo rather than car surface detail.
export type PostProcessingRecipe = {
  enable?: boolean;
  bloomEnable?: boolean;
  grainEnable?: boolean;
  sharpenEnable?: boolean;
  toneMappingEnable?: boolean;
  toneMappingExposure?: number;
  ssaoEnable?: boolean;
  ssaoIntensity?: number;
  ssaoRadius?: number;
};
export const postProcessingRecipes: Record<string, PostProcessingRecipe> = {
  bmw: {
    enable: true,
    bloomEnable: false,
    grainEnable: false,
    sharpenEnable: false,
    toneMappingEnable: true,
    toneMappingExposure: 0.86,
    ssaoEnable: true,
    ssaoIntensity: 0.28,
  },
  genesis: {
    enable: true,
    ssaoEnable: true,
    ssaoIntensity: 0.24,
    ssaoRadius: 0.0007,
  },
};
