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

// These are native variant IDs from the F8 runtime definitions. They are not
// separate menu entries, so the building-menu capture cannot map them by name.
const variantAssetSources = new Map([
  [1, "dist/img/conveyor_left.png"],
  [3, "dist/img/shaker_left.png"],
  [6, "dist/img/launcher_left.png"],
  [7, "dist/img/launcher_right.png"],
  [17, "dist/img/filter_left.png"],
  [8, "dist/img/splitter_left.png"],
  [9, "dist/img/splitter_right.png"],
  [12, "dist/img/triangle_right.png"],
  [13, "dist/img/triangle_right.png"],
  [14, "dist/img/triangle_right.png"],
  [15, "dist/img/triangle_right.png"],
  ["conveyorLeftMk2", "dist/img/conveyor_left.png"],
  ["conveyorRightMk2", "dist/img/conveyor_right.png"],
  ["filterLeftMk2", "dist/img/filter_left.png"],
  ["filterRightMk2", "dist/img/filter_right.png"],
  ["launcherLeftMk2", "dist/img/launcher_left.png"],
  ["launcherRightMk2", "dist/img/launcher_right.png"],
  ["launcherUpMk2", "dist/img/launcher.png"],
]);

const variantAssetFrames = new Map([
  [1, { width: 16, height: 16 }],
  [3, { width: 18, height: 18 }],
  [6, { width: 18, height: 18 }],
  [7, { width: 18, height: 18 }],
  [17, { width: 18, height: 18 }],
  [12, { width: 16, height: 16 }],
  [13, { width: 16, height: 16 }],
  [14, { width: 16, height: 16 }],
  [15, { width: 16, height: 16 }],
  ["conveyorLeftMk2", { width: 16, height: 16 }],
  ["conveyorRightMk2", { width: 16, height: 16 }],
  ["filterLeftMk2", { width: 18, height: 18 }],
  ["filterRightMk2", { width: 18, height: 18 }],
  ["launcherLeftMk2", { width: 18, height: 18 }],
  ["launcherRightMk2", { width: 18, height: 18 }],
  ["launcherUpMk2", { width: 18, height: 18 }],
]);

const variantAssetRotations = new Map([
  [12, 270],
  [13, 0],
  [14, 180],
  [15, 90],
]);

const bottomAnchoredTypes = new Set([20]);
const cellScaledTypes = new Set([20]);

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

function imageSize(buffer) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(pngSignature)) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  return undefined;
}

function capturedMenuAssets() {
  if (!fs.existsSync(menuPath)) return new Map();
  const html = fs.readFileSync(menuPath, "utf8");
  const names = new Map();
  for (const match of html.matchAll(/src="file:\/\/\/([^"?]+)"[^>]*style="([^"]*)"[\s\S]{0,1400}?<p[^>]*>([^<]+)<\/p>/g)) {
    const decoded = decodeURIComponent(match[1]);
    const marker = "/dist/";
    const index = decoded.indexOf(marker);
    const name = match[3].trim();
    const style = match[2];
    const width = style.match(/\bwidth:\s*(\d+)px/i)?.[1];
    const height = style.match(/\bheight:\s*(\d+)px/i)?.[1];
    if (index >= 0 && name) {
      names.set(name, {
        source: decoded.slice(index + 1),
        frame: width && height ? { width: Number(width), height: Number(height) } : undefined,
      });
    }
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
  const contents = archive.subarray(start, start + record.size);
  fs.writeFileSync(path.join(assetRoot, outputName), contents);
  assets.push({
    source: relative,
    file: `catalog/${outputName}`,
    bytes: record.size,
    size: imageSize(contents),
  });
}

const assetByStem = new Map(assets.map((asset) => [assetStem(asset.source), asset.file]));
const assetBySource = new Map(assets.map((asset) => [asset.source, asset.file]));
const catalogWithAssets = {
  ...blueprintCatalog,
  entries: blueprintCatalog.entries.map((entry) => {
    const imageName = entry.render?.imageName;
    const renderAsset = typeof imageName === "string" ? assetByStem.get(assetStem(imageName)) : undefined;
    const menuCapture = typeof entry.name === "string" ? menuAssets.get(entry.name) : undefined;
    const menuAsset = menuCapture ? assetBySource.get(menuCapture.source) : undefined;
    const variantSource = variantAssetSources.get(entry.type);
    const variantAsset = variantSource ? assetBySource.get(variantSource) : undefined;
    const assetPath = renderAsset ?? menuAsset ?? variantAsset;
    const asset = assetPath ? assets.find((candidate) => candidate.file === assetPath) : undefined;
    const assetFrame =
      menuCapture?.frame ??
      variantAssetFrames.get(entry.type);
    return assetPath
      ? {
          ...entry,
          assetPath,
          ...(bottomAnchoredTypes.has(entry.type) ? { positionAnchor: "bottom" } : {}),
          ...(cellScaledTypes.has(entry.type) ? { assetScale: "cell" } : {}),
          ...(asset?.size ? { assetSize: asset.size } : {}),
          ...(assetFrame && !renderAsset ? { assetFrame } : {}),
          ...(variantAssetRotations.has(entry.type)
            ? { assetRotation: variantAssetRotations.get(entry.type) }
            : {}),
        }
      : entry;
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
