#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testBundle = path.join(root, "artifacts/blueprint-node-test.mjs");
function check(label) {
  console.log(`  ✓ ${label}`);
}

console.log("blueprint node tests");
try {
  await build({
    bundle: true,
    entryPoints: ["packages/sandustry-blueprint-node/src/index.ts"],
    external: ["@resvg/resvg-js"],
    format: "esm",
    platform: "node",
    outfile: testBundle,
  });
  const nodeRenderer = await import(testBundle);

  const png = await nodeRenderer.renderBlueprintStringToNodePng("", {
    assetRoot: path.join(root, "apps/blueprint-site/public"),
    catalog: {
      get: (type) =>
        type === "fan"
          ? {
              name: "Fan",
              footprint: { width: 4, height: 4 },
              renderAsset: {
                path: "catalog/mods__fan_diagonal.png",
                sourceSize: { width: 16, height: 16 },
              },
            }
          : undefined,
    },
    scale: 1,
    blueprint: {
      name: "Node renderer",
      data: [{ type: "fan", x: 0, y: 0 }],
      signalLinks: null,
    },
    showGrid: false,
    showFoundationOutlines: false,
    showSignalLinks: false,
  });

  assert.equal(png[0], 0x89);
  assert.equal(String.fromCharCode(...png.subarray(1, 4)), "PNG");
  check("Node PNG rendering with local asset resolution");
  console.log(`node blueprint renderer passed (${png.length} bytes)`);
} catch (error) {
  console.error(`  ✕ ${error instanceof Error ? error.message : error}`);
  throw error;
}
