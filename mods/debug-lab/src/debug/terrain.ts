import {
  DebugContext,
  LOG_PREFIX,
  UnknownRecord,
  jsonSafe,
  logCopyable,
  rawEngine,
  toast,
} from "./common";
import { getStructureCatalog } from "./catalog";

const READ_METHODS = [
  "getAll",
  "getDefinitions",
  "getAllDefinitions",
  "getRegistry",
  "getCatalog",
  "getTypes",
  "list",
] as const;

const REGISTRY_KEYS = [
  "definitions",
  "registry",
  "types",
  "data",
  "terrainTypes",
  "terrainData",
  "cellTypes",
  "_definitions",
  "_registry",
] as const;

// Names used by the shipped terrain definitions. The runtime exposes the
// name-to-cell-type lookup even though it does not expose the definition map.
const KNOWN_TERRAIN_NAMES = [
  "stone",
  "dirt",
  "grass",
  "moss",
  "sporeMound",
  "frostbed",
  "fluxite",
  "ice",
  "redsoil",
  "scoria",
  "crackstone",
  "glassTerrain",
  "solidite",
  "voidFlowerSoil",
  "spreadingTerrain",
  "sand2",
  "earth",
  "gameOfLifeRandom",
  "golGrow",
  "crystal",
  "gameOfLifeStrict",
  "dune",
  "limestone",
  "copper",
  "auraliteCrystal",
  "vine",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function looksLikeTerrainDefinition(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) return false;
  return [
    "id",
    "name",
    "nameKey",
    "colorHSL",
    "colorGradient",
    "colorPattern",
    "materialId",
    "metaColor",
    "hp",
  ].some((key) => value[key] !== undefined);
}

function collectDefinitions(value: unknown, source: string, entries: UnknownRecord[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (looksLikeTerrainDefinition(item)) entries.push({ source, key: index, definition: item });
    });
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (looksLikeTerrainDefinition(item)) entries.push({ source, key, definition: item });
  }
}

function inspectCandidate(
  value: unknown,
  source: string,
  entries: UnknownRecord[],
  diagnostics: UnknownRecord[],
): void {
  if (!isRecord(value)) {
    diagnostics.push({ source, kind: typeof value });
    return;
  }

  diagnostics.push({
    source,
    keys: Object.keys(value),
    methods: READ_METHODS.filter((method) => typeof value[method] === "function"),
  });

  for (const key of REGISTRY_KEYS) collectDefinitions(value[key], `${source}.${key}`, entries);
  for (const method of READ_METHODS) {
    if (typeof value[method] !== "function") continue;
    try {
      collectDefinitions(value[method](), `${source}.${method}()`, entries);
    } catch (error) {
      diagnostics.push({
        source: `${source}.${method}()`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/** Export only the runtime terrain definitions needed to reproduce minimap colors. */
export function copyTerrainCatalog(context: DebugContext): void {
  const engine = rawEngine(context);
  const engineApi = isRecord(engine.api) ? engine.api : undefined;
  const candidates: Array<[string, unknown]> = [
    ["public api.terrains", context.api.terrains],
    ["engine api.terrains", engineApi?.terrains],
    ["engine terrains", engine.terrains],
  ];
  const entries: UnknownRecord[] = [];
  const diagnostics: UnknownRecord[] = [];
  for (const [source, value] of candidates) inspectCandidate(value, source, entries, diagnostics);

  const terrainApi = context.api.terrains as unknown as UnknownRecord;
  const terrainIds: number[] = [];
  if (typeof terrainApi.isCellIdTerrain === "function") {
    for (let id = 1; id <= 1000; id++) {
      try {
        if (terrainApi.isCellIdTerrain(id)) terrainIds.push(id);
      } catch {
        break;
      }
    }
  }
  const namedIds = KNOWN_TERRAIN_NAMES.flatMap((name) => {
    try {
      const type = terrainApi.getTypeFromId?.(name);
      return typeof type === "number" ? [{ name, type }] : [];
    } catch {
      return [];
    }
  });
  const structureCatalog = getStructureCatalog(context);

  const exportData = {
    format: 2,
    generatedAt: new Date().toISOString(),
    purpose: "save-explorer terrain and structure palette resolution",
    entries,
    terrainIds,
    namedIds,
    structures: structureCatalog.entries,
    diagnostics,
  };
  const safe = jsonSafe(exportData);
  console.group(`${LOG_PREFIX} terrain palette`);
  console.log(
    `found ${entries.length} terrain definition candidate(s) and ${structureCatalog.entries.length} structure definition(s)`,
  );
  logCopyable("TERRAIN_PALETTE", safe);
  console.log(safe);
  console.groupEnd();
  const text = JSON.stringify(safe, null, 2);
  void navigator.clipboard
    ?.writeText(text)
    .then(() =>
      toast(
        context,
        `copied terrain and ${structureCatalog.entries.length} structure palette definitions`,
      ),
    )
    .catch(() => toast(context, "terrain palette logged; clipboard access failed"));
}
