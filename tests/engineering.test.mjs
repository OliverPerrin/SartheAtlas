import { test } from "node:test";
import assert from "node:assert/strict";
import { cars } from "../src/data/cars.ts";
import { systemsFor } from "../src/data/systems.ts";
import {
  carEngineeringSummary,
  engineeringDetailsFor,
  engineeringLayoutFor,
  engineeringSources,
} from "../src/data/engineeringDetails.ts";

const car = (id) => cars.find((entry) => entry.id === id);

test("every applicable engineering system has parts, provenance and a geometry boundary", () => {
  for (const entry of cars) {
    assert.ok(carEngineeringSummary(entry).architecture.length > 45);
    for (const system of systemsFor(entry)) {
      const detail = engineeringDetailsFor(entry, system.id);
      assert.ok(detail, `${entry.id}/${system.id}`);
      assert.ok(detail.components.length >= 3 && detail.components.length <= 6);
      assert.ok(detail.interfaces.length >= 2);
      assert.match(detail.geometryNotice, /not manufacturer CAD/);
      for (const source of detail.sourceIds)
        assert.ok(engineeringSources[source], source);
      for (const component of detail.components) {
        assert.ok(component.role.length > 25);
        assert.equal(
          component.evidence === "documented",
          component.sourceIds.length > 0,
        );
        for (const source of component.sourceIds)
          assert.ok(engineeringSources[source], source);
      }
    }
  }
});

test("non-hybrids cannot acquire a battery or MGU assembly through the detail API", () => {
  for (const entry of cars.filter((entry) => !entry.hybrid)) {
    assert.equal(engineeringDetailsFor(entry, "hybrid"), undefined);
    const coolingParts = engineeringDetailsFor(entry, "cooling")
      .components.map((part) => part.name)
      .join(" ");
    assert.doesNotMatch(coolingParts, /Electrical thermal/);
  }
  for (const entry of cars.filter((entry) => entry.platform === "LMDh")) {
    assert.match(
      engineeringDetailsFor(entry, "hybrid").architecture,
      /rear transmission/,
    );
  }
});

test("engine-specific physical exceptions survive generic assembly helpers", () => {
  assert.equal(engineeringLayoutFor(car("alpine")).turboCount, 1);
  assert.equal(car("alpine").engine.bankAngle, 95);
  assert.match(
    engineeringDetailsFor(car("alpine"), "engine").components[2].name,
    /Single turbocharger/,
  );
  for (const entry of cars.filter((entry) => !entry.engine.turbo)) {
    assert.equal(engineeringLayoutFor(entry).turboCount, 0);
    assert.doesNotMatch(
      engineeringDetailsFor(entry, "cooling")
        .components.map((part) => part.name)
        .join(" "),
      /Charge-air/,
    );
  }
  assert.match(
    engineeringDetailsFor(car("m4"), "engine").components[0].name,
    /Inline/,
  );
  assert.match(
    engineeringDetailsFor(car("porsche"), "engine").components[0].name,
    /Opposed/,
  );
});

test("suspension and fuel exceptions cannot be flattened into class defaults", () => {
  assert.equal(engineeringLayoutFor(car("porsche")).suspensionKind, "mixed");
  assert.equal(engineeringLayoutFor(car("porsche")).fuelLocation, "front");
  assert.equal(
    engineeringLayoutFor(car("porsche")).gearboxLocation,
    "ahead-of-rear-engine",
  );
  assert.equal(
    engineeringLayoutFor(car("lexus")).gearboxLocation,
    "unverified",
  );
  for (const id of ["toyota", "aston"])
    assert.equal(engineeringLayoutFor(car(id)).springMedium, "torsion-bar");
  assert.equal(
    engineeringLayoutFor(car("peugeot")).suspensionKind,
    "unverified",
  );
  const heave = engineeringDetailsFor(
    car("cadillac"),
    "suspension",
  ).components.at(-1);
  assert.equal(heave.evidence, "representative");
  const astonCentralDamper = engineeringDetailsFor(
    car("aston"),
    "suspension",
  ).components.at(-1);
  assert.equal(astonCentralDamper.evidence, "documented");
});
