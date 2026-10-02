import test from "node:test";
import assert from "node:assert/strict";
import { modelMetadata } from "../src/data/modelMetadata.ts";
import { posterVariantsFor } from "../scripts/refresh-exterior-metadata.mjs";

test("every exterior poster retains its original full-size image and same-composition responsive variants", () => {
  assert.equal(Object.keys(modelMetadata).length, 18);
  for (const [id, model] of Object.entries(modelMetadata)) {
    const images = model.posterVariants;
    assert.ok(images.length >= 2, id);
    assert.equal(images.at(-1).url, model.poster);
    assert.equal(
      new Set(images.map((image) => image.width)).size,
      images.length,
    );
    const family = model.poster.slice(0, model.poster.lastIndexOf("/"));
    const ratio = images.at(-1).width / images.at(-1).height;
    for (const image of images) {
      assert.ok(Number.isInteger(image.width) && image.width >= 256);
      assert.ok(Number.isInteger(image.height) && image.height > 0);
      assert.equal(image.url.slice(0, image.url.lastIndexOf("/")), family);
      assert.ok(Math.abs(image.width / image.height - ratio) <= 0.005);
      assert.ok(Number.isInteger(image.bytes) && image.bytes > 0);
    }
  }
});

test("poster refresh rejects crops, different thumbnail families, undersized placeholders and duplicate widths", () => {
  const poster = "https://example.test/thumbnails/verified/original.jpg";
  const images = [
    { width: 1920, height: 1080, url: poster, size: 200000 },
    {
      width: 720,
      height: 405,
      url: "https://example.test/thumbnails/verified/small.jpg",
      size: 40000,
    },
    {
      width: 720,
      height: 405,
      url: "https://example.test/thumbnails/verified/duplicate.jpg",
      size: 39000,
    },
    {
      width: 256,
      height: 256,
      url: "https://example.test/thumbnails/verified/square.jpg",
      size: 8000,
    },
    {
      width: 1024,
      height: 576,
      url: "https://example.test/thumbnails/different/frame.jpg",
      size: 70000,
    },
    {
      width: 64,
      height: 36,
      url: "https://example.test/thumbnails/verified/tiny.jpg",
      size: 1000,
    },
  ];
  assert.deepEqual(
    posterVariantsFor(images, poster).map((image) => image.width),
    [720, 1920],
  );
  assert.throws(
    () =>
      posterVariantsFor(
        images,
        "https://example.test/thumbnails/new/frame.jpg",
      ),
    /review source/,
  );
});
