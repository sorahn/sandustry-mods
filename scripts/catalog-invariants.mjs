import fs from "node:fs";
import path from "node:path";

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isFiniteInteger(value) {
  return Number.isInteger(value) && Number.isFinite(value);
}

function pngSize(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function checkSize(errors, label, size) {
  if (!size || !isPositiveInteger(size.width) || !isPositiveInteger(size.height)) {
    errors.push(`${label} must have positive integer width and height`);
  }
}

export function validateCatalog(catalog, { assetRoot } = {}) {
  const errors = [];
  const entries = catalog?.entries;
  if (!Array.isArray(entries)) return ["catalog.entries must be an array"];

  const types = new Set();
  for (const entry of entries) {
    const label = `entry ${String(entry?.type)}`;
    if (entry === null || typeof entry !== "object") {
      errors.push("catalog entries must be objects");
      continue;
    }
    if (types.has(entry.type)) errors.push(`${label} is duplicated`);
    types.add(entry.type);

    checkSize(errors, `${label} footprint`, entry.footprint);
    const renderAsset = entry.renderAsset;
    if (renderAsset !== undefined && typeof renderAsset !== "object") {
      errors.push(`${label} renderAsset must be an object`);
      continue;
    }
    if (renderAsset) {
      if (typeof renderAsset.path !== "string" || renderAsset.path.length === 0) {
        errors.push(`${label} renderAsset.path must be a non-empty string`);
      }
      if (renderAsset.clip !== undefined && typeof renderAsset.clip !== "boolean") {
        errors.push(`${label} renderAsset.clip must be boolean`);
      }
      const validScale =
        renderAsset.scale === undefined ||
        typeof renderAsset.scale === "string" ||
        (typeof renderAsset.scale === "object" &&
          typeof renderAsset.scale.mode === "string" &&
          (renderAsset.scale.factor === undefined || Number.isFinite(renderAsset.scale.factor)));
      if (!validScale) {
        errors.push(`${label} renderAsset.scale must be a mode or mode/factor object`);
      }
      const validAnchor =
        renderAsset.anchor === undefined ||
        typeof renderAsset.anchor === "string" ||
        (typeof renderAsset.anchor === "object" &&
          typeof renderAsset.anchor.edge === "string" &&
          (renderAsset.anchor.offsetCells === undefined ||
            Number.isFinite(renderAsset.anchor.offsetCells)));
      if (!validAnchor) {
        errors.push(`${label} renderAsset.anchor must be an edge or edge/offset object`);
      }
      if (renderAsset.lightColor !== undefined && typeof renderAsset.lightColor !== "string") {
        errors.push(`${label} renderAsset.lightColor must be a string`);
      }
      if (renderAsset.debug !== undefined) {
        if (
          typeof renderAsset.debug !== "object" ||
          (renderAsset.debug.height !== undefined &&
            (!Number.isFinite(renderAsset.debug.height) || renderAsset.debug.height <= 0))
        ) {
          errors.push(`${label} renderAsset.debug must contain a positive height`);
        }
      }
      if (renderAsset.animation !== undefined) {
        if (
          typeof renderAsset.animation !== "object" ||
          (renderAsset.animation.topology !== undefined &&
            typeof renderAsset.animation.topology !== "string")
        ) {
          errors.push(`${label} renderAsset.animation has invalid topology metadata`);
        } else {
          for (const key of ["cornerFrame", "edgeFrame", "interiorFrame"]) {
            const value = renderAsset.animation[key];
            if (value !== undefined && (!isFiniteInteger(value) || value < 0)) {
              errors.push(`${label} renderAsset.animation.${key} must be non-negative`);
            }
          }
          const sideRotation = renderAsset.animation.sideRotation;
          if (
            sideRotation !== undefined &&
            (!isFiniteInteger(sideRotation) ||
              sideRotation < 0 ||
              sideRotation >= 360 ||
              sideRotation % 45 !== 0)
          ) {
            errors.push(`${label} renderAsset.animation.sideRotation must be normalized`);
          }
        }
      }
    }
    if (renderAsset?.rotation !== undefined) {
      if (
        !isFiniteInteger(renderAsset.rotation) ||
        renderAsset.rotation < 0 ||
        renderAsset.rotation >= 360 ||
        renderAsset.rotation % 45 !== 0
      ) {
        errors.push(`${label} renderAsset.rotation must be a normalized multiple of 45`);
      }
    }
    if (renderAsset?.offset !== undefined) {
      for (const axis of ["x", "y"]) {
        if (renderAsset.offset[axis] !== undefined && !isFiniteInteger(renderAsset.offset[axis])) {
          errors.push(`${label} renderAsset.offset.${axis} must be a finite integer`);
        }
      }
    }
    if (renderAsset?.frameIndex !== undefined && !isFiniteInteger(renderAsset.frameIndex)) {
      errors.push(`${label} renderAsset.frameIndex must be a non-negative integer`);
    } else if (renderAsset?.frameIndex !== undefined && renderAsset.frameIndex < 0) {
      errors.push(`${label} renderAsset.frameIndex must be non-negative`);
    }

    if (Array.isArray(entry.variants)) {
      const variantIds = new Set();
      for (const variant of entry.variants) {
        if (variant?.id === undefined || variantIds.has(String(variant.id))) {
          errors.push(`${label} has a missing or duplicate variant id`);
        }
        variantIds.add(String(variant?.id));
        if (
          !Array.isArray(variant?.angles) ||
          variant.angles.some((angle) => !isFiniteInteger(angle))
        ) {
          errors.push(`${label} variant ${String(variant?.id)} has invalid angles`);
        }
      }
    }

    if (renderAsset?.path) {
      if (!assetRoot) {
        errors.push(`${label} cannot validate renderAsset.path without assetRoot`);
      } else {
        const relative = renderAsset.path.replace(/^catalog\//, "");
        const assetFile = path.resolve(assetRoot, relative);
        if (
          !assetFile.startsWith(`${path.resolve(assetRoot)}${path.sep}`) ||
          !fs.existsSync(assetFile)
        ) {
          errors.push(`${label} renderAsset.path does not resolve: ${renderAsset.path}`);
        } else {
          const actualSize = pngSize(fs.readFileSync(assetFile));
          if (!actualSize) errors.push(`${label} asset is not a readable PNG: ${renderAsset.path}`);
          if (renderAsset.sourceSize) {
            checkSize(errors, `${label} renderAsset.sourceSize`, renderAsset.sourceSize);
            if (
              actualSize &&
              (actualSize.width !== renderAsset.sourceSize.width ||
                actualSize.height !== renderAsset.sourceSize.height)
            ) {
              errors.push(`${label} renderAsset.sourceSize does not match ${renderAsset.path}`);
            }
          }
          if (renderAsset?.frame)
            checkSize(errors, `${label} renderAsset.frame`, renderAsset.frame);
          if (renderAsset?.sourceCrop) {
            const crop = renderAsset.sourceCrop;
            if (
              ![crop.x, crop.y].every(isFiniteInteger) ||
              !isPositiveInteger(crop.width) ||
              !isPositiveInteger(crop.height) ||
              crop.x < 0 ||
              crop.y < 0 ||
              crop.x + crop.width > actualSize.width ||
              crop.y + crop.height > actualSize.height
            ) {
              errors.push(`${label} renderAsset.sourceCrop exceeds ${renderAsset.path}`);
            }
          }
          if (renderAsset?.frame && actualSize) {
            const frameIndex = renderAsset.frameIndex ?? 0;
            const requiredWidth = (frameIndex + 1) * renderAsset.frame.width;
            const requiredHeight = renderAsset.frame.height;
            if (requiredWidth > actualSize.width || requiredHeight > actualSize.height) {
              errors.push(`${label} renderAsset.frameIndex/frame exceeds ${renderAsset.path}`);
            }
            const isWide =
              actualSize.width > renderAsset.frame.width ||
              actualSize.height > renderAsset.frame.height;
            if (isWide && renderAsset.clip === undefined) {
              errors.push(`${label} wide asset needs explicit renderAsset.clip metadata`);
            }
          }
        }
      }
    } else if (entry.renderAsset) {
      errors.push(`${label} has render-asset metadata without assetPath`);
    }
  }

  return errors;
}

export function assertCatalogInvariants(catalog, options) {
  const errors = validateCatalog(catalog, options);
  if (errors.length > 0) throw new Error(`catalog invariants failed:\n- ${errors.join("\n- ")}`);
}
