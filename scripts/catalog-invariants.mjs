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
    if (entry.assetScaleFactor !== undefined) {
      errors.push(`${label} still has retired assetScaleFactor metadata`);
    }
    if (entry.assetClip !== undefined && typeof entry.assetClip !== "boolean") {
      errors.push(`${label} assetClip must be boolean`);
    }
    if (entry.assetRotation !== undefined) {
      if (
        !isFiniteInteger(entry.assetRotation) ||
        entry.assetRotation < 0 ||
        entry.assetRotation >= 360 ||
        entry.assetRotation % 45 !== 0
      ) {
        errors.push(`${label} assetRotation must be a normalized multiple of 45`);
      }
    }
    if (entry.assetOffset !== undefined) {
      for (const axis of ["x", "y"]) {
        if (entry.assetOffset[axis] !== undefined && !isFiniteInteger(entry.assetOffset[axis])) {
          errors.push(`${label} assetOffset.${axis} must be a finite integer`);
        }
      }
    }
    if (entry.assetFrameIndex !== undefined && !isFiniteInteger(entry.assetFrameIndex)) {
      errors.push(`${label} assetFrameIndex must be a non-negative integer`);
    } else if (entry.assetFrameIndex !== undefined && entry.assetFrameIndex < 0) {
      errors.push(`${label} assetFrameIndex must be non-negative`);
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

    if (entry.assetPath) {
      if (!assetRoot) {
        errors.push(`${label} cannot validate assetPath without assetRoot`);
      } else {
        const relative = entry.assetPath.replace(/^catalog\//, "");
        const assetFile = path.resolve(assetRoot, relative);
        if (
          !assetFile.startsWith(`${path.resolve(assetRoot)}${path.sep}`) ||
          !fs.existsSync(assetFile)
        ) {
          errors.push(`${label} assetPath does not resolve: ${entry.assetPath}`);
        } else {
          const actualSize = pngSize(fs.readFileSync(assetFile));
          if (!actualSize) errors.push(`${label} asset is not a readable PNG: ${entry.assetPath}`);
          if (entry.assetSize) {
            checkSize(errors, `${label} assetSize`, entry.assetSize);
            if (
              actualSize &&
              (actualSize.width !== entry.assetSize.width ||
                actualSize.height !== entry.assetSize.height)
            ) {
              errors.push(`${label} assetSize does not match ${entry.assetPath}`);
            }
          }
          if (entry.assetFrame) checkSize(errors, `${label} assetFrame`, entry.assetFrame);
          if (entry.assetFrame && actualSize) {
            const frameIndex = entry.assetFrameIndex ?? 0;
            const requiredWidth = (frameIndex + 1) * entry.assetFrame.width;
            const requiredHeight = entry.assetFrame.height;
            if (requiredWidth > actualSize.width || requiredHeight > actualSize.height) {
              errors.push(`${label} assetFrameIndex/frame exceeds ${entry.assetPath}`);
            }
            const isWide =
              actualSize.width > entry.assetFrame.width ||
              actualSize.height > entry.assetFrame.height;
            if (isWide && entry.assetClip === undefined) {
              errors.push(`${label} wide asset needs explicit assetClip metadata`);
            }
          }
        }
      }
    } else if (entry.assetFrame || entry.assetClip || entry.assetOffset) {
      errors.push(`${label} has render-asset metadata without assetPath`);
    }
  }

  return errors;
}

export function assertCatalogInvariants(catalog, options) {
  const errors = validateCatalog(catalog, options);
  if (errors.length > 0) throw new Error(`catalog invariants failed:\n- ${errors.join("\n- ")}`);
}
