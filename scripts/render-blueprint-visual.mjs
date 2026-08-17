#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appRoot = path.join(root, "apps/blueprint-site");
const outputRoot = path.join(root, "artifacts/visual");
const blueprintRoot = path.join(root, "tests/visual/blueprints");
const baselineRoot = path.join(root, "tests/visual/baselines");
const port = 4179;
const siteUrl = `http://127.0.0.1:${port}/inspect`;
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

function chromePath() {
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : process.platform === "win32"
        ? [
            process.env.PROGRAMFILES + "\\Google\\Chrome\\Application\\chrome.exe",
            process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) {
    throw new Error("Google Chrome or Chromium is required for visual rendering.");
  }
  return found;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(siteUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for the blueprint site at ${siteUrl}`);
}

async function visualJobs() {
  const jobs = [
    {
      name: "catalog",
      url: `${siteUrl}?visualFixture=catalog`,
      baseline: path.join(root, "tests/visual/catalog-baseline.png"),
    },
  ];
  const files = (await readdir(blueprintRoot)).filter((file) => file.endsWith(".txt")).sort();
  for (const file of files) {
    const name = path.basename(file, ".txt");
    const input = (await readFile(path.join(blueprintRoot, file), "utf8")).trim();
    if (!input) throw new Error(`Visual blueprint is empty: ${file}`);
    jobs.push({
      name,
      url: `${siteUrl}?visualBlueprint=${encodeURIComponent(input)}`,
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

async function capture(chrome, job, currentPath) {
  const url = job.url;
  await new Promise((resolve, reject) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=2500",
        "--window-size=2048,1024",
        `--screenshot=${currentPath}`,
        url,
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Chrome exited with status ${code}`)),
    );
  });
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
  const chrome = chromePath();
  await mkdir(outputRoot, { recursive: true });
  await mkdir(baselineRoot, { recursive: true });
  const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: appRoot,
    stdio: "ignore",
  });
  try {
    await waitForServer();
    for (const job of jobs) {
      const currentPath = path.join(outputRoot, `${job.name}-current.png`);
      await capture(chrome, job, currentPath);
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
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
