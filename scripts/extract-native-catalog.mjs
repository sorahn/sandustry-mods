#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asarPath = process.env.SANDUSTRY_ASAR ??
  "/Users/daryl/Library/Application Support/Steam/steamapps/common/Sandustry/Sandustry.app/Contents/Resources/app.asar";
const f8Path = path.join(root, "resources/f8-results.json");
const menuPath = path.join(root, "resources/building-menu.html");
const catalogPath = path.join(root, "apps/blueprint-site/src/structure-catalog.json");
const assetRoot = path.join(root, "apps/blueprint-site/public/catalog");

function readAsarHeader(buffer) {
  if (buffer.length < 8) throw new Error("ASAR is too small to contain a header");
  const jsonSize = buffer.length >= 12 ? buffer.readUInt32LE(8) : buffer.readUInt32LE(4);
  const jsonStart = buffer.length >= 12 ? 16 : 8;
  const jsonEnd = jsonStart + jsonSize;
  try {
    const json = buffer.subarray(jsonStart, jsonEnd).toString("utf8").replace(/\0.*$/s, "");
    return { header: JSON.parse(json), dataStart: 8 + buffer.readUInt32LE(4) };
  } catch {
    const headerSize = buffer.readUInt32LE(4);
    const alternateStart = 8;
    const alternateEnd = alternateStart + headerSize;
    return { header: JSON.parse(buffer.subarray(alternateStart, alternateEnd).toString("utf8")), dataStart: alternateEnd };
  }
}

function flattenFiles(node, prefix = "", output = new Map()) {
  for (const [name, value] of Object.entries(node.files ?? {})) {
    const relative = prefix ? `${prefix}/${name}` : name;
    if (value.files) flattenFiles(value, relative, output);
    else output.set(relative, value);
  }
  return output;
}

function safeAssetName(relative) {
  return relative.replace(/^dist\//, "").replaceAll("/", "__");
}

function assetStem(relative) {
  return path.basename(relative).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function capturedMenuAssets() {
  if (!fs.existsSync(menuPath)) return new Map();
  const html = fs.readFileSync(menuPath, "utf8");
  const names = new Map();
  for (const match of html.matchAll(/src="file:\/\/\/([^"?]+)"[\s\S]{0,1400}?<p[^>]*>([^<]+)<\/p>/g)) {
    const decoded = decodeURIComponent(match[1]);
    const marker = "/dist/";
    const index = decoded.indexOf(marker);
    const name = match[2].trim();
    if (index >= 0 && name) names.set(name, decoded.slice(index + 1));
  }
  return names;
}

if (!fs.existsSync(asarPath)) {
  throw new Error(`Steam ASAR not found: ${asarPath}`);
}
if (!fs.existsSync(f8Path)) throw new Error(`F8 catalog not found: ${f8Path}`);

const archive = fs.readFileSync(asarPath);
const { header, dataStart } = readAsarHeader(archive);
const files = flattenFiles(header);
const blueprintCatalog = JSON.parse(fs.readFileSync(f8Path, "utf8"));
const menuAssets = capturedMenuAssets();
const requested = [...files.keys()].filter(
  (value) => value.startsWith("dist/img/") && /\.(png|webp|jpg|jpeg)$/i.test(value),
);
const assets = [];
fs.mkdirSync(assetRoot, { recursive: true });

for (const relative of requested) {
  const record = files.get(relative);
  if (!record || typeof record.offset !== "string" || typeof record.size !== "number") continue;
  const start = dataStart + Number(record.offset);
  const outputName = safeAssetName(relative);
  fs.writeFileSync(path.join(assetRoot, outputName), archive.subarray(start, start + record.size));
  assets.push({ source: relative, file: `catalog/${outputName}`, bytes: record.size });
}

const assetByStem = new Map(assets.map((asset) => [assetStem(asset.source), asset.file]));
const assetBySource = new Map(assets.map((asset) => [asset.source, asset.file]));
const catalogWithAssets = {
  ...blueprintCatalog,
  entries: blueprintCatalog.entries.map((entry) => {
    const imageName = entry.render?.imageName;
    const renderAsset = typeof imageName === "string" ? assetByStem.get(assetStem(imageName)) : undefined;
    const menuAsset = typeof entry.name === "string" ? assetBySource.get(menuAssets.get(entry.name)) : undefined;
    const assetPath = renderAsset ?? menuAsset;
    return assetPath ? { ...entry, assetPath } : entry;
  }),
};

fs.writeFileSync(catalogPath, `${JSON.stringify(catalogWithAssets, null, 2)}\n`);
fs.writeFileSync(path.join(assetRoot, "manifest.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "local Sandustry app.asar + building-menu.html",
  assets,
}, null, 2)}\n`);
console.log(`wrote static catalog: ${catalogPath}`);
console.log(`extracted ${assets.length} of ${requested.length} native image assets`);
