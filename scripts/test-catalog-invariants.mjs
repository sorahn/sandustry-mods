#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCatalogInvariants } from "./catalog-invariants.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "apps/blueprint-site/src/structure-catalog.json");
const assetRoot = path.join(root, "apps/blueprint-site/public/catalog");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

assertCatalogInvariants(catalog, { assetRoot });

const entries = new Map(catalog.entries.map((entry) => [entry.type, entry]));
const expected = [
  [13, { assetRotation: 180 }],
  [14, { assetRotation: 0 }],
  [21, { assetClip: false, assetOffset: { x: -1 } }],
  ["filterLeftMk2", { assetOffset: { x: -1, y: -1 } }],
  ["filterRightMk2", { assetOffset: { x: -1, y: -1 } }],
  [3, { assetFrame: { width: 18, height: 22 }, assetOffset: { x: -1, y: -1 } }],
  [4, { assetFrame: { width: 18, height: 22 }, assetOffset: { x: -1, y: -1 } }],
  ["aurixiteCrystallizer", { assetClip: false }],
  ["burnerBeltLeft", { assetClip: true, assetFrame: { width: 16, height: 16 } }],
  ["burnerBeltRight", { assetClip: true, assetFrame: { width: 16, height: 16 } }],
  ["heatCannonRight", { assetClip: false, assetFrame: { width: 23, height: 16 } }],
  ["heatCannonDown", { assetClip: false, assetFrame: { width: 23, height: 16 } }],
  ["heatCannonLeft", { assetClip: false, assetFrame: { width: 23, height: 16 } }],
  ["heatCannonUp", { assetClip: false, assetFrame: { width: 23, height: 16 } }],
];
for (const [type, assertions] of expected) {
  const entry = entries.get(type);
  if (!entry) throw new Error(`catalog invariant regression entry is missing: ${String(type)}`);
  for (const [key, value] of Object.entries(assertions)) {
    if (JSON.stringify(entry[key]) !== JSON.stringify(value)) {
      throw new Error(`catalog invariant regression for ${String(type)}.${key}`);
    }
  }
}

console.log(`catalog invariants passed for ${catalog.entries.length} entries`);
