import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LAYER_STAGES,
  isBetweenStages,
  layerWeights,
  stageAt,
} from "../src/three/layerPlan.ts";

const close = (value, expected) => Math.abs(value - expected) < 1e-9;

test("layer buttons land on the canonical stage stops", () => {
  assert.deepEqual(
    LAYER_STAGES.map((stage) => stage.at),
    [0, 0.25, 0.5, 0.75, 1],
  );
  assert.deepEqual(
    LAYER_STAGES.map((stage) => stage.stage),
    [0, 1, 2, 3, 4],
  );
  for (const stage of LAYER_STAGES) {
    assert.equal(stageAt(stage.at).stage, stage.stage);
    assert.equal(isBetweenStages(stage.at), false);
  }
  assert.equal(isBetweenStages(0.31), true);
  assert.equal(stageAt(0.31).stage, 1);
  assert.equal(stageAt(0.62).stage, 2);
});

test("each stage completes before the next layer moves", () => {
  const at = (stop) => layerWeights(stop);
  // Bodywork only.
  assert.ok(close(at(0).bodywork, 0));
  assert.ok(close(at(0.25).bodywork, 1));
  assert.ok(close(at(0.25).cooling, 0));
  assert.ok(close(at(0.25).cabin, 0));
  assert.ok(close(at(0.25).structure, 0));
  // Cooling core starts only after the fan/shroud peel at 0.25–0.375.
  assert.ok(close(at(0.375).cooling, 0));
  assert.ok(close(at(0.5).cooling, 1));
  assert.ok(close(at(0.5).cabin, 0));
  assert.ok(close(at(0.5).structure, 0));
  // Driveline completes at the third stop; structure has not moved yet.
  assert.ok(close(at(0.75).cabin, 1));
  assert.ok(close(at(0.75).structure, 0));
  // Structure is the only layer left.
  assert.ok(close(at(1).structure, 1));
});

test("weights are clamped, finite and monotonic for every layer", () => {
  for (const stop of [-2, 0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 3]) {
    const weights = layerWeights(stop);
    for (const value of Object.values(weights)) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= 0 && value <= 1);
    }
  }
  let previous = layerWeights(-1);
  for (let e = 0; e <= 1.0001; e += 0.01) {
    const weights = layerWeights(e);
    for (const layer of Object.keys(weights)) {
      assert.ok(
        weights[layer] + 1e-9 >= previous[layer],
        `${layer} never reverses`,
      );
    }
    previous = weights;
  }
});
