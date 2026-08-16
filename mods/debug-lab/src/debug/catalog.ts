import {
  DebugContext,
  LOG_PREFIX,
  UnknownRecord,
  dumpNamespace,
  jsonSafe,
  logCopyable,
  probeReadOnlyNamespace,
  rawEngine,
  toast,
} from "./common";

type StructureType = string | number;

function isStructureLikePath(path: string[]): boolean {
  return path.some((part) => /structure|building|block/i.test(part));
}

function collectEnumCandidates(
  value: unknown,
  path: string[],
  candidates: Set<StructureType>,
  seen: WeakSet<object>,
): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value as UnknownRecord)) {
    const childPath = [...path, key];
    if (
      isStructureLikePath(childPath) &&
      (typeof child === "string" || typeof child === "number")
    ) {
      candidates.add(child);
    }
    collectEnumCandidates(child, childPath, candidates, seen);
  }
}

function addIterableCandidates(value: unknown, candidates: Set<StructureType>): void {
  if (!(value instanceof Set) && !(value instanceof Map) && !Array.isArray(value)) return;
  for (const item of value instanceof Map ? value.keys() : value instanceof Set ? value : value) {
    if (typeof item === "string" || typeof item === "number") candidates.add(item);
  }
}

function getStructureName(context: DebugContext, definition: UnknownRecord): string | undefined {
  if (typeof definition.name === "string") return definition.name;
  const i18n = context.api.i18n as unknown as UnknownRecord;
  if (typeof i18n.getName === "function") {
    try {
      const name = i18n.getName(definition);
      if (typeof name === "string" && name && name !== definition.nameKey) return name;
    } catch {
      // Some internal definitions are not accepted by the i18n helper.
    }
  }
  if (typeof definition.nameKey === "string" && typeof i18n.t === "function") {
    try {
      const name = i18n.t(definition.nameKey);
      if (typeof name === "string") return name;
    } catch {
      // Keep the key when no localized value is available.
    }
  }
  return undefined;
}

function normalizeStructureEntry(context: DebugContext, type: StructureType, definition: unknown) {
  if (!definition || typeof definition !== "object") return null;
  const record = definition as UnknownRecord;
  const shape = Array.isArray(record.shape) ? record.shape : undefined;
  return {
    type,
    name: getStructureName(context, record),
    nameKey: typeof record.nameKey === "string" ? record.nameKey : undefined,
    descriptionKey: typeof record.descriptionKey === "string" ? record.descriptionKey : undefined,
    category: typeof record.categoryKey === "string" ? record.categoryKey : undefined,
    footprint: {
      // Native definitions commonly omit shape; the structure registry then
      // uses its default solid 4x4 footprint.
      width: Array.isArray(shape?.[0]) ? shape[0].length : 4,
      height: shape?.length ?? 4,
    },
    footprintSource: shape ? "explicit shape" : "native default 4x4",
    shape,
    buildModes: record.buildModes,
    variants: record.variants,
    render: record.render,
    tooltipHover: record.tooltipHover,
    definition: jsonSafe(record),
    source: "runtime structure definition",
  };
}

export function copyStructureCatalog(context: DebugContext): void {
  const structures = context.api.structures as unknown as UnknownRecord;
  const candidates = new Set<StructureType>();
  const enums = (context.sandkit as unknown as UnknownRecord).enums;
  collectEnumCandidates(enums, [], candidates, new WeakSet<object>());

  if (typeof structures.getUnlockedTypes === "function") {
    try {
      addIterableCandidates(structures.getUnlockedTypes.call(structures), candidates);
    } catch {
      // Candidate discovery is best effort; definitions below remain authoritative.
    }
  }

  const entries = [...candidates]
    .sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }))
    .map((type) => {
      try {
        return normalizeStructureEntry(
          context,
          type,
          structures.getDefinitionByType?.call(structures, type),
        );
      } catch {
        return null;
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const catalog = {
    format: 1,
    generatedAt: new Date().toISOString(),
    locale:
      typeof (context.api.i18n as unknown as UnknownRecord).getLocale === "function"
        ? (context.api.i18n as unknown as UnknownRecord).getLocale.call(context.api.i18n)
        : null,
    entries,
  };
  console.group(`${LOG_PREFIX} structure catalog`);
  console.log(
    `discovered ${entries.length} structure definition(s) from ${candidates.size} candidate value(s)`,
  );
  logCopyable("STRUCTURE_CATALOG", catalog);
  console.groupEnd();
  toast(context, `copied ${entries.length} structure definitions to the console`);
}

export function dumpCatalogNamespaces(context: DebugContext): void {
  const engineApi = rawEngine(context).api as UnknownRecord | undefined;
  dumpNamespace(context, "public structures", context.api.structures);
  dumpNamespace(context, "public elements", context.api.elements);
  dumpNamespace(context, "engine structures", engineApi?.structures);
  dumpNamespace(context, "engine elements", engineApi?.elements);
  toast(context, "catalog namespaces dumped to the console");
}

export function probeCatalogReads(context: DebugContext): void {
  const engineApi = rawEngine(context).api as UnknownRecord | undefined;
  const targets: Array<[string, unknown]> = [
    ["public structures", context.api.structures],
    ["public elements", context.api.elements],
    ["engine structures", engineApi?.structures],
    ["engine elements", engineApi?.elements],
  ];
  const methods = [
    "getAll",
    "getRegisteredTypes",
    "getAllDefinitions",
    "getDefinitions",
    "getRegistered",
    "getTypes",
    "getCatalog",
    "list",
  ];
  console.group(`${LOG_PREFIX} catalog read probes`);
  for (const [label, value] of targets) {
    probeReadOnlyNamespace(context, label, value, methods);
  }
  console.groupEnd();
  toast(context, "catalog read probes dumped to the console");
}

export function probeKnownStructureDefinitions(context: DebugContext): void {
  const structures = context.api.structures as unknown as UnknownRecord;
  const method = structures.getDefinitionByType;
  const types: Array<string | number> = [25, 11, 17, "filterWall"];
  const results: UnknownRecord = {};
  for (const type of types) {
    if (typeof method !== "function") {
      results[String(type)] = { available: false };
      continue;
    }
    try {
      results[String(type)] = { available: true, definition: method(type) };
    } catch (error) {
      results[String(type)] = {
        available: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  console.group(`${LOG_PREFIX} known structure definitions`);
  console.log(results);
  logCopyable("KNOWN_STRUCTURE_DEFINITIONS", results);
  console.groupEnd();
  toast(context, "known structure definitions dumped to the console");
}
