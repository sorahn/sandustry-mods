#!/usr/bin/env node

import { build } from "esbuild";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const blueprintRoot = path.join(root, "tests/visual/blueprints");
const snapshotRoot = path.join(root, "tests/visual/svg");
const update = process.argv.includes("--update");

const bundle = await build({
  bundle: true,
  entryPoints: [path.join(root, "scripts/svg-visual-renderer.ts")],
  format: "esm",
  platform: "node",
  write: false,
});
const renderer = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);

const fixtures = [
  { name: "catalog", input: renderer.catalogVisualBlueprint() },
  ...(await readdir(blueprintRoot))
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .map(async (file) => ({
      name: path.basename(file, ".txt"),
      input: (await readFile(path.join(blueprintRoot, file), "utf8")).trim(),
    })),
];

const resolvedFixtures = await Promise.all(fixtures);
if (update) await mkdir(snapshotRoot, { recursive: true });
for (const fixture of resolvedFixtures) {
  if (!fixture.input) throw new Error(`SVG fixture is empty: ${fixture.name}`);
  const snapshotPath = path.join(snapshotRoot, `${fixture.name}.svg`);
  const actual = `${renderer.renderVisualBlueprintSvg(fixture.input).trim()}\n`;
  if (update) {
    await writeFile(snapshotPath, actual);
    console.log(`  updated ${fixture.name}.svg`);
    continue;
  }
  const expected = `${await readFile(snapshotPath, "utf8")}`;
  if (actual !== expected) {
    throw new Error(
      `SVG snapshot mismatch: ${fixture.name}.svg (run npm run test:blueprint-svg -- --update)`,
    );
  }
  console.log(`  ✓ ${fixture.name}.svg`);
}

console.log(`SVG snapshots ${update ? "updated" : "passed"}`);
