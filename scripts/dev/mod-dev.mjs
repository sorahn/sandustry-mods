#!/usr/bin/env node

/**
 * Build and watch one repository mod for local Sandustry development.
 *
 * HMR and game-process supervision are intentionally separate phases. This
 * command owns only the selected mod's build/install loop for now.
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MODS_ROOT = join(ROOT, "mods");
const DEBOUNCE_MS = 100;
const POLL_MS = 250;

const args = process.argv.slice(2);
const modArgument = valueAfter("--mod");
const once = args.includes("--once");

if (!modArgument) {
  console.error("Usage: node scripts/dev/mod-dev.mjs --mod <mod> [--once]");
  process.exit(2);
}

const modDirName = resolveModDirectory(modArgument);
const modDir = join(MODS_ROOT, modDirName);
const manifestPath = join(modDir, "modinfo.json");
const sourcePath = join(modDir, "src", "entry.tsx");
const buildDir = join(modDir, "build");
const packageDir = join(buildDir, "package");
const manifest = readJson(manifestPath);
const modId = requiredString(manifest.id, "modinfo.id");
const entry = requiredString(manifest.entry, "modinfo.entry");

if (entry !== "entry.js") {
  fail(`modinfo.entry must be entry.js, got ${JSON.stringify(entry)}`);
}
if (!existsSync(sourcePath)) fail(`missing ${relative(ROOT, sourcePath)}`);

const installRoot = process.env.SANDUSTRY_MODS_DIR || defaultModsDirectory();
const installDir = join(installRoot, modId);
let building = false;
let buildQueued = false;
let buildTimer = null;
let pollTimer = null;
let shuttingDown = false;

console.log(`dev mod: ${modId}`);
console.log(`source: ${relative(ROOT, modDir)}`);
console.log(`install: ${installDir}`);

await buildAndInstall("initial build");
if (once) process.exit(0);

startPolling();

console.log(`watching ${relative(ROOT, modDir)} (Ctrl+C to stop)`);

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function resolveModDirectory(argument) {
  const names = readdirSync(MODS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => !existsSync(join(MODS_ROOT, name, ".deprecated")));

  const match =
    names.find((name) => name === argument) ||
    names.find((name) => name === `sandustry-${argument}`);
  if (!match) fail(`unknown MOD='${argument}'. Available mods: ${names.join(", ")}`);
  return match;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`could not read ${relative(ROOT, path)}: ${error.message}`);
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
}

function defaultModsDirectory() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) return join(appData, "sandustry", "mods");
    return join(homedir(), "AppData", "Roaming", "sandustry", "mods");
  }
  if (process.platform === "darwin")
    return join(homedir(), "Library", "Application Support", "sandustry", "mods");
  return join(homedir(), ".config", "sandustry", "mods");
}

async function buildAndInstall(reason) {
  if (shuttingDown) return;
  if (building) {
    buildQueued = true;
    return;
  }

  building = true;
  const started = Date.now();
  console.log(`building (${reason})...`);
  try {
    const typecheck = spawnSync("npx", ["tsc", "--noEmit"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (typecheck.status !== 0)
      throw new Error(`TypeScript check failed with exit code ${typecheck.status ?? "unknown"}`);

    mkdirSync(buildDir, { recursive: true });
    await build({
      entryPoints: [sourcePath],
      bundle: true,
      format: "esm",
      platform: "neutral",
      target: "es2022",
      jsxFactory: "sandkit.react.createElement",
      jsxFragment: "sandkit.react.Fragment",
      alias: { "~shared": join(ROOT, "shared") },
      outfile: join(buildDir, "entry.js"),
      logLevel: "info",
    });

    await installPackage();
    console.log(`built ${modId} in ${Date.now() - started}ms`);
  } catch (error) {
    console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    building = false;
    if (buildQueued) {
      buildQueued = false;
      scheduleBuild("queued change");
    }
  }
}

async function installPackage() {
  await mkdir(packageDir, { recursive: true });
  await cp(join(buildDir, "entry.js"), join(packageDir, "entry.js"));
  await cp(manifestPath, join(packageDir, "modinfo.json"));

  for (const name of ["assets", "preview.png"]) {
    const source = join(modDir, name);
    if (!existsSync(source)) continue;
    const target = join(packageDir, name);
    if (name === "assets") await rm(target, { recursive: true, force: true });
    await cp(source, target, { recursive: true, force: true });
  }

  await mkdir(installDir, { recursive: true });
  await cp(packageDir, installDir, { recursive: true, force: true });
}

function startPolling() {
  let previous = snapshotWatchedFiles();
  pollTimer = setInterval(() => {
    const next = snapshotWatchedFiles();
    if (sameSnapshot(previous, next)) return;
    previous = next;
    scheduleBuild("source or package change");
  }, POLL_MS);
}

function snapshotWatchedFiles() {
  const files = new Map();
  for (const root of [join(modDir, "src"), join(modDir, "assets"), join(ROOT, "shared")]) {
    collectFiles(root, files);
  }
  for (const path of [manifestPath, join(modDir, "preview.png"), join(ROOT, "tsconfig.json")]) {
    addFileSnapshot(path, files);
  }
  return files;
}

function collectFiles(root, files) {
  if (!existsSync(root)) return;
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) collectFiles(path, files);
    else addFileSnapshot(path, files);
  }
}

function addFileSnapshot(path, files) {
  try {
    const info = statSync(path);
    if (info.isFile()) files.set(path, `${info.mtimeMs}:${info.size}`);
  } catch {
    // Files may be temporarily absent while an editor replaces them.
  }
}

function sameSnapshot(a, b) {
  if (a.size !== b.size) return false;
  for (const [path, signature] of a) if (b.get(path) !== signature) return false;
  return true;
}

function scheduleBuild(reason) {
  if (shuttingDown) return;
  if (buildTimer) clearTimeout(buildTimer);
  buildTimer = setTimeout(() => {
    buildTimer = null;
    void buildAndInstall(reason);
  }, DEBOUNCE_MS);
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (buildTimer) clearTimeout(buildTimer);
  if (pollTimer) clearInterval(pollTimer);
  console.log("dev watcher stopped");
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
