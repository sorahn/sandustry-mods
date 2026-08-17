#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asarPath =
  process.env.SANDUSTRY_ASAR ??
  "/Users/daryl/Library/Application Support/Steam/steamapps/common/Sandustry/Sandustry.app/Contents/Resources/app.asar";
const f8Path = path.join(root, "resources/f8-results.json");
const menuPath = path.join(root, "resources/building-menu.html");
const catalogPath = path.join(root, "apps/blueprint-site/src/structure-catalog.json");
const assetRoot = path.join(root, "apps/blueprint-site/public/catalog");

// These are native variant IDs from the F8 runtime definitions. They are not
// separate menu entries, so the building-menu capture cannot map them by name.
const variantAssetSources = new Map([
  [0, "dist/img/conveyor_right.png"],
  [1, "dist/img/conveyor_left.png"],
  [2, "dist/img/conveyor_right.png"],
  [3, "dist/img/shaker_left.png"],
  [4, "dist/img/shaker_right.png"],
  [5, "dist/img/launcher.png"],
  [6, "dist/img/launcher_left.png"],
  [7, "dist/img/launcher_right.png"],
  [8, "dist/img/splitter_left.png"],
  [9, "dist/img/splitter_right.png"],
  [10, "dist/img/block.png"],
  [12, "dist/img/triangle_right.png"],
  [13, "dist/img/triangle_right.png"],
  [14, "dist/img/triangle_right.png"],
  [15, "dist/img/triangle_right.png"],
  [17, "dist/img/filter_left.png"],
  [18, "dist/img/filter_right.png"],
  [19, "dist/img/velocity.png"],
  [21, "dist/img/farm.png"],
  [22, "dist/img/pipes_icon.png"],
  [23, "dist/img/pipes_icon.png"],
  [24, "dist/img/pump.png"],
  [27, "dist/img/gloom_emitter.png"],
  ["glassFoundation", "dist/img/block.png"],
  ["kineticFieldEmitterDownRight", "dist/mods/kinetic_field_emitter_diagonal.png"],
  ["kineticFieldEmitterDownLeft", "dist/mods/kinetic_field_emitter_diagonal.png"],
  ["kineticFieldEmitterUpLeft", "dist/mods/kinetic_field_emitter_diagonal.png"],
  ["kineticFieldEmitterUpRight", "dist/mods/kinetic_field_emitter_diagonal.png"],
]);

const variantAssetFrames = new Map([
  [0, { width: 16, height: 16 }],
  [1, { width: 16, height: 16 }],
  [2, { width: 16, height: 16 }],
  [3, { width: 18, height: 18 }],
  [4, { width: 18, height: 18 }],
  [5, { width: 18, height: 18 }],
  [6, { width: 18, height: 18 }],
  [7, { width: 18, height: 18 }],
  [12, { width: 16, height: 16 }],
  [13, { width: 16, height: 16 }],
  [14, { width: 16, height: 16 }],
  [15, { width: 16, height: 16 }],
  [17, { width: 18, height: 18 }],
  [18, { width: 18, height: 18 }],
  [19, { width: 18, height: 18 }],
  [21, { width: 16, height: 16 }],
  [22, { width: 16, height: 16 }],
  [23, { width: 16, height: 16 }],
  [24, { width: 16, height: 16 }],
  [27, { width: 16, height: 16 }],
  ["glassFoundation", { width: 16, height: 16 }],
  ["conveyorLeftMk2", { width: 16, height: 16 }],
  ["conveyorRightMk2", { width: 16, height: 16 }],
  ["filterLeftMk2", { width: 18, height: 18 }],
  ["filterRightMk2", { width: 18, height: 18 }],
  ["launcherLeftMk2", { width: 18, height: 26 }],
  ["launcherRightMk2", { width: 18, height: 26 }],
  ["launcherUpMk2", { width: 18, height: 18 }],
  ["heatCannonRight", { width: 16, height: 16 }],
  ["heatCannonUp", { width: 16, height: 16 }],
  ["heatCannonLeft", { width: 16, height: 16 }],
  ["heatCannonDown", { width: 16, height: 16 }],
  ["kineticFieldEmitterDownRight", { width: 15, height: 15 }],
  ["kineticFieldEmitterDownLeft", { width: 15, height: 15 }],
  ["kineticFieldEmitterUpLeft", { width: 15, height: 15 }],
  ["kineticFieldEmitterUpRight", { width: 15, height: 15 }],
  ["kineticFieldEmitterDown", { width: 23, height: 16 }],
  ["kineticFieldEmitterLeft", { width: 23, height: 16 }],
  ["kineticFieldEmitterUp", { width: 23, height: 16 }],
]);

function deriveAssetRotation(targetType, allEntries) {
  // Dedicated directional PNG assets are already drawn in their specific orientation.
  const dedicatedAssets = new Set([
    "conveyorLeftMk2",
    "conveyorRightMk2",
    "burnerBeltLeft",
    "burnerBeltRight",
    "clearingFrameLeft",
    "clearingFrameRight",
    "filterLeftMk2",
    "filterRightMk2",
    "launcherLeftMk2",
    "launcherRightMk2",
    "filterWall",
    "filterWallMk2",
    4,
    1,
    3,
    6,
    7,
    8,
    9,
    17,
  ]);

  if (dedicatedAssets.has(targetType)) {
    return undefined;
  }

  const assetRotationOffset =
    new Map([
      ["kineticFieldEmitterDownRight", 45],
      ["kineticFieldEmitterDownLeft", 45],
      ["kineticFieldEmitterUpLeft", 45],
      ["kineticFieldEmitterUpRight", 45],
    ]).get(targetType) ?? 0;

  for (const entry of allEntries) {
    if (Array.isArray(entry.variants)) {
      const match = entry.variants.find(
        (v) => v.id === targetType || String(v.id) === String(targetType),
      );
      if (match && Array.isArray(match.angles) && match.angles.length > 0) {
        // If 0 is one of the valid placement angles, the sprite is drawn at base 0° orientation.
        if (match.angles.includes(0)) {
          return undefined;
        }
        // Specific orientation variant (e.g. heatCannonDown=90, heatCannonLeft=180, heatCannonUp=-90)
        const angle = match.angles[0];
        const offset =
          typeof targetType === "number" && targetType >= 12 && targetType <= 15 ? 135 : 0;
        const rotation = (angle + offset + assetRotationOffset + 360) % 360;
        return rotation !== 0 ? rotation : undefined;
      }
    }
  }
  return undefined;
}

function findImageName(entry, allEntries) {
  if (
    entry.render &&
    typeof entry.render === "object" &&
    typeof entry.render.imageName === "string"
  ) {
    return entry.render.imageName;
  }
  for (const parent of allEntries) {
    if (
      parent.render &&
      typeof parent.render === "object" &&
      typeof parent.render.imageName === "string"
    ) {
      if (Array.isArray(parent.variants)) {
        if (
          parent.variants.some((v) => v.id === entry.type || String(v.id) === String(entry.type))
        ) {
          return parent.render.imageName;
        }
      }
    }
  }
  return undefined;
}

const assetClipOverrides = new Map([
  ["heatCannonRight", false],
  ["heatCannonUp", false],
  ["heatCannonLeft", false],
  ["heatCannonDown", false],
]);

// The diagonal fan PNG contains the 15x15 sprite inside a wider composite
// export. It must remain unclipped and use the same native placement offset as
// the game renderer; clipping it to assetFrame removes most of the fan.
const assetPresentationOverrides = new Map([
  ["kineticFieldEmitter", { assetOffset: { x: -16 } }],
  ["kineticFieldEmitterDown", { assetClip: false, assetOffset: { x: -16 } }],
  ["kineticFieldEmitterLeft", { assetClip: false, assetOffset: { x: -16 } }],
  ["kineticFieldEmitterUp", { assetClip: false, assetOffset: { x: -16 } }],
  ["kineticFieldEmitterDownRight", { assetClip: false, assetOffset: { x: -8, y: 8 } }],
  ["kineticFieldEmitterDownLeft", { assetClip: false, assetOffset: { x: -8, y: 8 } }],
  ["kineticFieldEmitterUpLeft", { assetClip: false, assetOffset: { x: -8, y: 8 } }],
  ["kineticFieldEmitterUpRight", { assetClip: false, assetOffset: { x: -8, y: 8 } }],
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
    return {
      header: JSON.parse(buffer.subarray(alternateStart, alternateEnd).toString("utf8")),
      dataStart: alternateEnd,
    };
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
  return path
    .basename(relative)
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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
  for (const match of html.matchAll(
    /src="file:\/\/\/([^"?]+)"[^>]*style="([^"]*)"[\s\S]{0,1400}?<p[^>]*>([^<]+)<\/p>/g,
  )) {
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
  (value) =>
    (value.startsWith("dist/img/") || value.startsWith("dist/mods/")) &&
    /\.(png|webp|jpg|jpeg)$/i.test(value),
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
    const imageName = findImageName(entry, blueprintCatalog.entries);
    const renderAsset =
      typeof imageName === "string" ? assetByStem.get(assetStem(imageName)) : undefined;
    const menuCapture = typeof entry.name === "string" ? menuAssets.get(entry.name) : undefined;
    const menuAsset = menuCapture ? assetBySource.get(menuCapture.source) : undefined;
    const variantSource = variantAssetSources.get(entry.type);
    const variantAsset = variantSource ? assetBySource.get(variantSource) : undefined;
    // Explicit variant exports must win over the parent render image. This is
    // important for the diagonal fan variants, whose render metadata points
    // at the cardinal fan while their dedicated PNG is 15x15.
    const assetPath = variantAsset ?? renderAsset ?? menuAsset;
    const asset = assetPath ? assets.find((candidate) => candidate.file === assetPath) : undefined;
    const assetFrame = variantAssetFrames.get(entry.type) ?? menuCapture?.frame;
    const derivedRotation = deriveAssetRotation(entry.type, blueprintCatalog.entries);
    return assetPath
      ? {
          ...entry,
          assetPath,
          ...(bottomAnchoredTypes.has(entry.type) ? { positionAnchor: "bottom" } : {}),
          ...(cellScaledTypes.has(entry.type) ? { assetScale: "cell" } : {}),
          ...(asset?.size ? { assetSize: asset.size } : {}),
          ...(assetFrame ? { assetFrame } : {}),
          ...(assetClipOverrides.has(entry.type)
            ? { assetClip: assetClipOverrides.get(entry.type) }
            : {}),
          ...(assetPresentationOverrides.get(entry.type) ?? {}),
          ...(derivedRotation !== undefined ? { assetRotation: derivedRotation } : {}),
        }
      : entry;
  }),
};

fs.writeFileSync(catalogPath, `${JSON.stringify(catalogWithAssets, null, 2)}\n`);
fs.writeFileSync(
  path.join(assetRoot, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "local Sandustry app.asar + building-menu.html",
      assets,
    },
    null,
    2,
  )}\n`,
);
console.log(`wrote static catalog: ${catalogPath}`);
console.log(`extracted ${assets.length} of ${requested.length} native image assets`);
