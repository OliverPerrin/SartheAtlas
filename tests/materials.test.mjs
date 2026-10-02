import { test } from "node:test";
import assert from "node:assert/strict";
import { materialRecipes } from "../src/data/materialRecipes.ts";

test("studio material restorations retain unique named parts and physically bounded factors", () => {
  for (const [car, recipe] of Object.entries(materialRecipes)) {
    assert.equal(
      new Set(recipe.map((part) => part.name)).size,
      recipe.length,
      `${car}: unique target materials`,
    );
    for (const part of recipe) {
      assert.ok(part.name.length > 2);
      if (part.color !== undefined) assert.match(part.color, /^#[a-f\d]{6}$/i);
      for (const key of [
        "colorFactor",
        "metalness",
        "roughness",
        "opacity",
        "clearCoat",
        "clearCoatRoughness",
      ]) {
        if (part[key] !== undefined)
          assert.ok(
            Number.isFinite(part[key]) && part[key] >= 0 && part[key] <= 1,
            `${car}/${part.name}/${key}`,
          );
      }
    }
  }
});

test("finish repairs are bound to their inspected model rather than every asset for the same car", async () => {
  const { materialRecipeModelIds } =
    await import("../src/data/materialRecipes.ts");
  const { materialRecipeFor } = await import("../src/data/exteriorTuning.ts");
  for (const [car, id] of Object.entries(materialRecipeModelIds)) {
    assert.equal(materialRecipeFor(id), materialRecipes[car]);
    assert.equal(materialRecipeFor(`different-${id}`), undefined);
  }
});

test("physical finish corrections preserve mapped livery, alpha atlas, UVs and source records", async () => {
  const { applyMaterialOverride } =
    await import("../src/data/materialApplication.ts");
  const source = {
    name: "EXT_GLASS",
    stateSetID: 17,
    channels: {
      AlbedoPBR: {
        enable: true,
        factor: 0.55,
        texture: { uid: "livery", texCoordUnit: 1, wrapS: "REPEAT" },
      },
      MetalnessPBR: {
        enable: true,
        factor: 0.94,
        texture: { uid: "metal", texCoordUnit: 1 },
      },
      RoughnessPBR: {
        enable: false,
        factor: 0.07,
        texture: { uid: "rough", texCoordUnit: 1 },
      },
      Opacity: {
        enable: true,
        factor: 1,
        texture: { uid: "alpha", texCoordUnit: 0 },
      },
      NormalMap: {
        enable: true,
        factor: 1,
        texture: { uid: "normal", texCoordUnit: 1 },
      },
    },
  };
  const snapshot = structuredClone(source);
  const result = applyMaterialOverride(source, {
    name: "EXT_GLASS",
    metalness: 0,
    roughness: 0.08,
  });
  assert.deepEqual(source, snapshot, "do not mutate creator material");
  assert.deepEqual(
    result.channels.AlbedoPBR,
    source.channels.AlbedoPBR,
    "retain original paint factor and map",
  );
  assert.deepEqual(
    result.channels.Opacity,
    source.channels.Opacity,
    "retain source transparency mask",
  );
  assert.deepEqual(result.channels.NormalMap, source.channels.NormalMap);
  for (const channel of Object.keys(source.channels))
    assert.deepEqual(
      result.channels[channel].texture,
      source.channels[channel].texture,
      `${channel}: retain map and UV binding`,
    );
  assert.equal(result.channels.MetalnessPBR.factor, 0);
  assert.equal(result.channels.RoughnessPBR.enable, true);
  assert.equal(result.stateSetID, source.stateSetID);
});

test("mapped rubber correction scales its atlas while retaining markings and UV binding", async () => {
  const { applyMaterialOverride } =
    await import("../src/data/materialApplication.ts");
  const source = {
    name: "EXT_TYRE",
    stateSetID: 18,
    channels: {
      AlbedoPBR: {
        enable: true,
        factor: 1,
        texture: { uid: "tyre-and-markings", texCoordUnit: 1 },
      },
      MetalnessPBR: { enable: true, factor: 0.87 },
      RoughnessPBR: { enable: true, factor: 0.62 },
    },
  };
  const part = materialRecipes.aston.find((part) => part.name === source.name);
  const result = applyMaterialOverride(source, part);
  assert.equal(result.channels.AlbedoPBR.factor, 0.28);
  assert.deepEqual(
    result.channels.AlbedoPBR.texture,
    source.channels.AlbedoPBR.texture,
  );
  assert.equal(source.channels.AlbedoPBR.factor, 1);
  assert.equal(result.channels.MetalnessPBR.factor, 0);
});
