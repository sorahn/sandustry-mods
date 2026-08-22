import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "bun:test";
import { decodeBrowserSave, renderMinimapRgba } from "../../src/index";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testRoot, "../..");
const repoRoot = path.resolve(packageRoot, "../..");
const outputRoot = path.join(repoRoot, "artifacts/visual/save-explorer");

function runMagick(args: string[]) {
  return new Promise<{ code: number; stderr: string }>((resolve, reject) => {
    const child = spawn("magick", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? 1, stderr: stderr.trim() }));
  });
}

async function compareFixture(fixtureName: string) {
  const fixtureStem = path.basename(fixtureName, ".save");
  const fixturePath = path.join(testRoot, "saves", fixtureName);
  const referencePath = path.join(testRoot, "baselines", `${fixtureStem}.png`);
  await mkdir(outputRoot, { recursive: true });
  const save = await decodeBrowserSave(await readFile(fixturePath));
  const raster = renderMinimapRgba(save);
  const rawPath = path.join(outputRoot, "main-save-current.rgba");
  const currentPath = path.join(outputRoot, "main-save-current.png");
  const normalizedReferencePath = path.join(outputRoot, "main-save-reference-960.png");
  const diffPath = path.join(outputRoot, "main-save-diff.png");
  await writeFile(rawPath, raster.pixels);

  const render = await runMagick([
    "-size",
    `${raster.width}x${raster.height}`,
    "-depth",
    "8",
    `rgba:${rawPath}`,
    currentPath,
  ]);
  assert.equal(render.code, 0, `Unable to write rendered minimap: ${render.stderr}`);

  const normalize = await runMagick([
    referencePath,
    "-resize",
    `${raster.width}x${raster.height}!`,
    "-strip",
    normalizedReferencePath,
  ]);
  assert.equal(normalize.code, 0, `Unable to normalize minimap reference: ${normalize.stderr}`);

  const comparison = await runMagick([
    "compare",
    "-metric",
    "AE",
    normalizedReferencePath,
    currentPath,
    diffPath,
  ]);
  assert.ok(comparison.code === 0 || comparison.code === 1, comparison.stderr);
  const differingPixels = comparison.stderr.split(/\s+/)[0] || "unknown";
  console.log(
    `save explorer visual: ${differingPixels} differing pixels; current=${currentPath}; diff=${diffPath}`,
  );
  assert.ok((await stat(currentPath)).size > 0);
  assert.ok((await stat(diffPath)).size > 0);
}

for (const fixtureName of (await readdir(path.join(testRoot, "saves")))
  .filter((name) => name.endsWith(".save"))
  .sort()) {
  test(`renders and compares the ${path.basename(fixtureName, ".save")} minimap reference`, () =>
    compareFixture(fixtureName));
}
