#!/usr/bin/env node

/**
 * Build and watch one repository mod for local Sandustry development.
 *
 * HMR and game-process supervision are intentionally separate phases. This
 * command owns only the selected mod's build/install loop for now.
 */
import { build } from "esbuild";
import { createServer } from "node:http";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MODS_ROOT = join(ROOT, "mods");
const WORKSHOP_REGISTRY = join(ROOT, "workshop-published-ids.json");
const HMR_RUNTIME_PATH = join(ROOT, "scripts/dev/hmr-runtime.js");
const HMR_RUNTIME = readFileSync(HMR_RUNTIME_PATH, "utf8");
const HMR_PORT = 19147;
const HMR_PATH = "/hot-reload";
const DEBOUNCE_MS = 100;
const POLL_MS = 250;

const args = process.argv.slice(2);
const takeover = args.includes("--takeover");
const debug = args.includes("--debug");
const modArgument = valueAfter("--mod");
const once = args.includes("--once");

if (!modArgument) {
  console.error("Usage: node scripts/dev/mod-dev.mjs --mod <mod> [--takeover] [--once]");
  process.exit(2);
}

const modDirName = resolveModDirectory(modArgument);
const modDir = join(MODS_ROOT, modDirName);
const manifestPath = join(modDir, "modinfo.json");
const sourcePath = join(modDir, "src", "entry.tsx");
const buildDir = join(modDir, "build");
const packageDir = join(buildDir, "package");
const reloadConfigPath = join(modDir, "dev-reload.json");
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
let hotReloadServer = null;
const hotReloadClients = new Set();
let gameChild = null;
let gameRestartTimer = null;
let gameRestarting = false;
let gameOwned = false;
const gameBinary = resolveGameBinary();

console.log(`dev mod: ${modId}`);
console.log(`source: ${relative(ROOT, modDir)}`);
console.log(`install: ${installDir}`);

startHotReloadServer();
await buildAndInstall("initial build");
if (once) {
  shutdown();
  process.exit(0);
}

await ensureGame();

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

function resolveGameBinary() {
  if (process.env.SANDUSTRY?.trim()) return process.env.SANDUSTRY.trim();
  if (process.platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Steam",
      "steamapps",
      "common",
      "Sandustry",
      "Sandustry.app",
      "Contents",
      "MacOS",
      "Sandustry",
    );
  }
  if (process.platform === "win32") {
    return join(homedir(), "AppData", "Local", "Programs", "Sandustry", "Sandustry.exe");
  }
  return join(homedir(), ".steam", "steam", "steamapps", "common", "Sandustry", "sandustry");
}

function gamePids() {
  if (process.platform === "win32") {
    try {
      const output = execFileSync(
        "tasklist",
        ["/FI", "IMAGENAME eq Sandustry.exe", "/FO", "CSV", "/NH"],
        {
          encoding: "utf8",
          windowsHide: true,
        },
      );
      return output
        .split(/\r?\n/)
        .map((line) => line.match(/"Sandustry\.exe","(\d+)"/i)?.[1])
        .filter(Boolean)
        .map(Number);
    } catch {
      return [];
    }
  }

  try {
    const output = execFileSync("ps", ["-axo", "pid=,comm="], { encoding: "utf8" });
    const binaryName = process.platform === "darwin" ? "sandustry" : "sandustry";
    return output
      .split(/\r?\n/)
      .map((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (!match || !match[2].toLowerCase().endsWith(binaryName)) return null;
        return Number(match[1]);
      })
      .filter((pid) => Number.isInteger(pid));
  } catch {
    return [];
  }
}

async function ensureGame() {
  const existing = gamePids();
  if (existing.length > 0) {
    if (!takeover) {
      console.warn("Sandustry is already running and is not owned by this dev session.");
      console.warn("Use TAKEOVER=1 to let make dev restart and manage it.");
      return;
    }
    await stopGame(existing);
  }
  await launchGame();
}

async function launchGame() {
  if (!existsSync(gameBinary)) {
    console.error(`Sandustry binary not found: ${gameBinary}`);
    console.error("Set SANDUSTRY to the executable path, or start Sandustry manually.");
    return;
  }

  const gameArgs = ["--no-sandbox"];
  if (debug) gameArgs.push("--inspect=9230", "--remote-debugging-port=9222");
  gameChild = spawn(gameBinary, gameArgs, {
    cwd: dirname(gameBinary),
    detached: false,
    env: process.env,
    stdio: "ignore",
  });
  gameOwned = true;
  gameChild.on("exit", (code, signal) => {
    if (gameChild?.pid === undefined) return;
    console.log(`Sandustry exited (${signal ?? code ?? "unknown"})`);
    gameChild = null;
    gameOwned = false;
  });
  console.log(`Launched Sandustry (pid ${gameChild.pid ?? "?"})`);
}

async function stopGame(pids = gamePids()) {
  if (pids.length === 0) return;
  console.log(`Stopping Sandustry (${pids.join(", ")})...`);
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/T", "/PID", String(pids[0])], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // The process may already be exiting.
    }
  } else {
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // The process may already be exiting.
      }
    }
  }

  const deadline = Date.now() + 2000;
  while (Date.now() < deadline && gamePids().length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const remaining = gamePids();
  if (remaining.length === 0) return;
  for (const pid of remaining) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process may already be gone.
    }
  }
}

function scheduleGameRestart(reason) {
  if (gameRestartTimer) clearTimeout(gameRestartTimer);
  gameRestartTimer = setTimeout(() => {
    gameRestartTimer = null;
    void restartGame(reason);
  }, 250);
}

async function restartGame(reason) {
  if (gameRestarting) return;
  if (!gameOwned) {
    console.warn(`Skipping Sandustry restart (${reason}); this dev session does not own the game.`);
    return;
  }
  gameRestarting = true;
  try {
    await stopGame(gameChild?.pid ? [gameChild.pid] : gamePids());
    gameChild = null;
    await launchGame();
  } finally {
    gameRestarting = false;
  }
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

    const entryPath = join(buildDir, "entry.js");
    const bundle = readFileSync(entryPath, "utf8");
    const hmrConfig = {
      modId,
      url: `http://127.0.0.1:${HMR_PORT}${HMR_PATH}`,
      autoContinue: debug,
    };
    writeFileSync(
      entryPath,
      `globalThis.__sandustryDevHmrConfig__ = ${JSON.stringify(hmrConfig)};\n${HMR_RUNTIME}\n${bundle}`,
    );

    await installPackage();
    notifyHotReload();
    if (reason !== "initial build" && reloadMode() === "restart")
      scheduleGameRestart("restart-mode change");
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

function reloadMode() {
  if (!existsSync(reloadConfigPath)) return "restart";
  try {
    const config = JSON.parse(readFileSync(reloadConfigPath, "utf8"));
    return config.mode === "hmr" ? "hmr" : "restart";
  } catch (error) {
    console.error(`invalid ${relative(ROOT, reloadConfigPath)}: ${error.message}`);
    return "restart";
  }
}

async function installPackage() {
  captureInstalledWorkshopId();
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

function captureInstalledWorkshopId() {
  const installedWorkshop = join(installDir, "workshop.json");
  if (!existsSync(installedWorkshop)) return;

  const workshop = readJson(installedWorkshop);
  const publishedFileId = workshop.publishedFileId;
  if (publishedFileId == null || String(publishedFileId).trim() === "") return;

  const registry = existsSync(WORKSHOP_REGISTRY) ? readJson(WORKSHOP_REGISTRY) : {};
  const normalizedId = String(publishedFileId);
  const recordedId = registry[modId];
  if (recordedId != null && String(recordedId) !== normalizedId) {
    throw new Error(
      `publishedFileId mismatch for ${modId}: registry has ${recordedId}, installed workshop.json has ${normalizedId}`,
    );
  }
  if (recordedId != null) return;

  registry[modId] = normalizedId;
  writeFileSync(WORKSHOP_REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(
    `recorded ${modId} publishedFileId=${normalizedId} in ${relative(ROOT, WORKSHOP_REGISTRY)}`,
  );
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
  for (const path of [
    manifestPath,
    reloadConfigPath,
    join(modDir, "preview.png"),
    join(ROOT, "tsconfig.json"),
    HMR_RUNTIME_PATH,
  ]) {
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
  if (gameRestartTimer) clearTimeout(gameRestartTimer);
  for (const response of hotReloadClients) response.end();
  hotReloadClients.clear();
  hotReloadServer?.close();
  if (gameOwned && gameChild?.pid) void stopGame([gameChild.pid]);
  console.log("dev watcher stopped");
}

function startHotReloadServer() {
  hotReloadServer = createServer((request, response) => {
    if (request.method === "POST" && request.url === `${HMR_PATH}/status`) {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        try {
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (payload.modId === modId && payload.status === "failed") {
            scheduleGameRestart("HMR evaluation failure");
          }
        } catch {
          // Ignore malformed development status reports.
        }
        response.writeHead(204, { "Access-Control-Allow-Origin": "*" });
        response.end();
      });
      return;
    }

    if (request.url !== HMR_PATH) {
      response.writeHead(404, { "Access-Control-Allow-Origin": "*" });
      response.end("not found");
      return;
    }

    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    response.write("\n");
    hotReloadClients.add(response);
    request.on("close", () => hotReloadClients.delete(response));
  });
  hotReloadServer.on("error", (error) => {
    console.error(`hot reload server failed: ${error.message}`);
  });
  hotReloadServer.listen(HMR_PORT, "127.0.0.1", () => {
    console.log(`hot reload notify: http://127.0.0.1:${HMR_PORT}${HMR_PATH}`);
  });
}

function notifyHotReload() {
  const chunk = `data: ${JSON.stringify({
    v: 1,
    modId,
    changed: ["entry.js"],
    mode: reloadMode(),
  })}\n\n`;
  for (const response of hotReloadClients) {
    try {
      response.write(chunk);
    } catch {
      hotReloadClients.delete(response);
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
