import assert from "node:assert/strict";
import path from "node:path";
import { test } from "bun:test";
import { catalogVisualBlueprint, renderVisualBlueprint } from "./node-visual-renderer";

test("node blueprint renderer", async () => {
  const png = await renderVisualBlueprint(
    catalogVisualBlueprint(),
    path.join(process.cwd(), "apps/blueprint-site/public"),
  );
  assert.equal(png[0], 0x89);
  assert.equal(String.fromCharCode(...png.subarray(1, 4)), "PNG");
  assert.ok(png.length > 100, `expected a rendered PNG, got ${png.length} bytes`);
});
