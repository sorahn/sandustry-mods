import {
  DebugContext,
  LOG_PREFIX,
  UnknownRecord,
  dumpNamespace,
  logCopyable,
  probeReadOnlyNamespace,
  rawEngine,
  toast,
} from "./common";

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
