import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { catalogVisualBlueprint, renderVisualBlueprintSvg } from "./svg-visual-renderer";

const root = process.cwd();

test("blueprint SVG snapshots", async () => {
  const blueprintRoot = path.join(root, "tests/visual/blueprints");
  const snapshotRoot = path.join(root, "tests/visual/svg");
  const update = process.argv.includes("--update");
  const fixtures = [
    { name: "catalog", input: catalogVisualBlueprint() },
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
    assert.ok(fixture.input, `SVG fixture is empty: ${fixture.name}`);
    const snapshotPath = path.join(snapshotRoot, `${fixture.name}.svg`);
    const actual = `${renderVisualBlueprintSvg(fixture.input).trim()}\n`;
    if (update) {
      await writeFile(snapshotPath, actual);
      continue;
    }
    const expected = await readFile(snapshotPath, "utf8");
    assert.equal(
      actual,
      expected,
      `SVG snapshot mismatch: ${fixture.name}.svg (run npm run test:blueprint-svg -- --update)`,
    );
  }
});
