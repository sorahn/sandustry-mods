#!/usr/bin/env node

import { spawn } from "node:child_process";
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { copyFile, mkdir, rename, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const visualRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(visualRoot, "../../../..");
const outputRoot = path.join(root, "artifacts/visual");
const blueprintRoot = path.join(visualRoot, "blueprints");
const baselineRoot = path.join(visualRoot, "baselines");
const update = process.argv.includes("--update");
const diff = process.argv.includes("--diff");
const onlyArgument = process.argv.find((argument) => argument.startsWith("--only="));
const onlyIndex = process.argv.indexOf("--only");
const only = onlyArgument
  ? onlyArgument.slice("--only=".length)
  : onlyIndex >= 0
    ? process.argv[onlyIndex + 1]
    : undefined;
if (onlyIndex >= 0 && !only) {
  throw new Error("--only requires a snapshot name");
}

async function visualJobs() {
  const jobs = [
    {
      name: "catalog",
      input: undefined,
      baseline: path.join(visualRoot, "catalog-baseline.png"),
    },
  ];
  const files = (await readdir(blueprintRoot)).filter((file) => file.endsWith(".txt")).sort();
  for (const file of files) {
    const name = path.basename(file, ".txt");
    const input = (await readFile(path.join(blueprintRoot, file), "utf8")).trim();
    if (!input) throw new Error(`Visual blueprint is empty: ${file}`);
    jobs.push({
      name,
      input,
      baseline: path.join(baselineRoot, `${name}.png`),
    });
  }
  if (!only) return jobs;
  const selected = jobs.filter((job) => job.name === only);
  if (selected.length === 0) {
    throw new Error(`unknown visual snapshot '${only}'; expected catalog or a blueprint filename`);
  }
  return selected;
}

async function loadNodeRenderer() {
  const bundlePath = path.join(outputRoot, "node-visual-renderer.mjs");
  await build({
    bundle: true,
    entryPoints: [path.join(visualRoot, "node-renderer.ts")],
    external: ["@resvg/resvg-js"],
    format: "esm",
    platform: "node",
    outfile: bundlePath,
  });
  return import(bundlePath);
}

async function capture(renderer, job, currentPath) {
  const input = job.input ?? renderer.catalogVisualBlueprint();
  const png = await renderer.renderVisualBlueprint(
    input,
    path.join(root, "apps/blueprint-site/public"),
  );
  await writeFile(currentPath, png);
  const trimmedPath = `${currentPath}.trim.png`;
  await new Promise((resolve, reject) => {
    const child = spawn("magick", [currentPath, "-trim", "+repage", trimmedPath], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ImageMagick exited with status ${code}`)),
    );
  });
  await rename(trimmedPath, currentPath);
}

async function compare(baselinePath, currentPath, diffPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "magick",
      ["compare", "-metric", "AE", baselinePath, currentPath, diffPath],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let metric = "";
    child.stderr.on("data", (chunk) => {
      metric += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const value = metric.trim();
      console.log(`  ${path.basename(baselinePath)}: ${value || "0"} differing pixels`);
      if (code === 0) resolve();
      else reject(new Error(`visual regression detected for ${path.basename(baselinePath)}`));
    });
  });
}

async function run() {
  const jobs = await visualJobs();
  await mkdir(outputRoot, { recursive: true });
  if (update) await mkdir(baselineRoot, { recursive: true });
  const renderer = await loadNodeRenderer();
  for (const job of jobs) {
    const currentPath = path.join(outputRoot, `${job.name}-current.png`);
    await capture(renderer, job, currentPath);
    if (update) {
      await copyFile(currentPath, job.baseline);
      console.log(`  updated ${job.name} baseline`);
    } else if (!existsSync(job.baseline)) {
      throw new Error(
        `missing visual baseline for ${job.name}; run npm run visual:render -- --update`,
      );
    } else if (diff) {
      await compare(job.baseline, currentPath, path.join(outputRoot, `${job.name}-diff.png`));
    } else {
      console.log(`  rendered ${job.name}: ${currentPath}`);
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
