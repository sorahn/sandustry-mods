#!/usr/bin/env node

/** Preserve Steam's installed workshop ID in repository metadata. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = join(ROOT, "workshop-published-ids.json");
const [modId, installDir] = process.argv.slice(2);

if (!modId || !installDir) {
  console.error("Usage: capture-workshop-id.mjs <mod-id> <installed-mod-dir>");
  process.exit(2);
}

const workshopPath = join(installDir, "workshop.json");
if (!existsSync(workshopPath)) process.exit(0);

const workshop = readJson(workshopPath);
const publishedFileId = workshop.publishedFileId;
if (publishedFileId == null || String(publishedFileId).trim() === "") process.exit(0);

const registry = existsSync(registryPath) ? readJson(registryPath) : {};
const normalizedId = String(publishedFileId);
const recordedId = registry[modId];
if (recordedId != null && String(recordedId) !== normalizedId) {
  console.error(
    `publishedFileId mismatch for ${modId}: registry has ${recordedId}, installed workshop.json has ${normalizedId}`,
  );
  process.exit(1);
}
if (recordedId != null) process.exit(0);

registry[modId] = normalizedId;
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`recorded ${modId} publishedFileId=${normalizedId}`);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`could not read ${path}: ${error.message}`);
    process.exit(1);
  }
}
