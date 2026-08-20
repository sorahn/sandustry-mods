import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "bun:test";
import { catalogVisualBlueprint, renderVisualBlueprint } from "./node-renderer";

const visualRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(visualRoot, "../../../..");
const blueprintRoot = path.join(visualRoot, "blueprints");
const baselineRoot = path.join(visualRoot, "baselines");
const outputRoot = path.join(repoRoot, "artifacts/visual");
const update = process.argv.includes("--update");

const fixtures = [
  {
    name: "catalog",
    input: catalogVisualBlueprint(),
    baseline: path.join(visualRoot, "catalog-baseline.png"),
  },
  ...(await readdir(blueprintRoot))
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .map(async (file) => ({
      name: path.basename(file, ".txt"),
      input: (await readFile(path.join(blueprintRoot, file), "utf8")).trim(),
      baseline: path.join(baselineRoot, `${path.basename(file, ".txt")}.png`),
    })),
];

const resolvedFixtures = await Promise.all(fixtures);
await mkdir(outputRoot, { recursive: true });

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

describe("blueprint PNG snapshots", () => {
  for (const fixture of resolvedFixtures) {
    test(fixture.name, async () => {
      assert.ok(fixture.input, `PNG fixture is empty: ${fixture.name}`);
      const currentPath = path.join(outputRoot, `${fixture.name}-bun-current.png`);
      const trimmedPath = path.join(outputRoot, `${fixture.name}-bun-trimmed.png`);
      const diffPath = path.join(outputRoot, `${fixture.name}-bun-diff.png`);
      const png = await renderVisualBlueprint(
        fixture.input,
        path.join(repoRoot, "apps/blueprint-site/public"),
      );
      await writeFile(currentPath, png);

      const trim = await runMagick([currentPath, "-trim", "+repage", trimmedPath]);
      assert.equal(trim.code, 0, `ImageMagick trim failed: ${trim.stderr}`);

      if (update) {
        await writeFile(fixture.baseline, await readFile(trimmedPath));
        return;
      }

      const comparison = await runMagick([
        "compare",
        "-metric",
        "AE",
        fixture.baseline,
        trimmedPath,
        diffPath,
      ]);
      assert.equal(
        comparison.code,
        0,
        `PNG snapshot mismatch: ${fixture.name}.png (${comparison.stderr || "differing pixels"})`,
      );
    });
  }
});
