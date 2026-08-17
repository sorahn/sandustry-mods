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
  [13, { rotation: 180 }],
  [14, { rotation: 0 }],
  [21, { clip: false, offset: { x: -1 } }],
  ["filterLeftMk2", { offset: { x: -1, y: -1 } }],
  ["filterRightMk2", { offset: { x: -1, y: -1 } }],
  [3, { frame: { width: 18, height: 22 }, offset: { x: -1, y: -1 } }],
  [4, { frame: { width: 18, height: 22 }, offset: { x: -1, y: -1 } }],
  ["aurixiteCrystallizer", { clip: false }],
  ["burnerBeltLeft", { clip: true, frame: { width: 16, height: 16 } }],
  ["burnerBeltRight", { clip: true, frame: { width: 16, height: 16 } }],
  ["heatCannonRight", { clip: false, frame: { width: 23, height: 16 } }],
  ["heatCannonDown", { clip: false, frame: { width: 23, height: 16 } }],
  ["heatCannonLeft", { clip: false, frame: { width: 23, height: 16 } }],
  ["heatCannonUp", { clip: false, frame: { width: 23, height: 16 } }],
];
for (const [type, assertions] of expected) {
  const entry = entries.get(type);
  if (!entry) throw new Error(`catalog invariant regression entry is missing: ${String(type)}`);
  for (const [key, value] of Object.entries(assertions)) {
    if (JSON.stringify(entry.renderAsset?.[key]) !== JSON.stringify(value)) {
      throw new Error(`catalog invariant regression for ${String(type)}.renderAsset.${key}`);
    }
  }
}

console.log(`catalog invariants passed for ${catalog.entries.length} entries`);
