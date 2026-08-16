import { DebugContext, UnknownRecord, LOG_PREFIX, logCopyable, rawEngine, toast } from "./common";

export function dumpNamespace(context: DebugContext, label: string, value: unknown): void {
  const namespace = value && typeof value === "object" ? (value as UnknownRecord) : null;
  const entries = Object.entries(namespace ?? {}).map(([key, entry]) => ({
    key,
    type: typeof entry,
    arity: typeof entry === "function" ? entry.length : null,
  }));

  console.group(`${LOG_PREFIX} internal ${label} namespace`);
  console.log("namespace value", value);
  console.table(entries);
  logCopyable(label.toUpperCase(), entries);
  console.groupEnd();
  toast(context, `${label} namespace dumped to the console`);
}

export function probeReadOnlyNamespace(
  context: DebugContext,
  label: string,
  value: unknown,
  methodNames: string[],
): void {
  const namespace = value && typeof value === "object" ? (value as UnknownRecord) : null;
  const results: UnknownRecord = {};

  for (const methodName of methodNames) {
    const method = namespace?.[methodName];
    if (typeof method !== "function") {
      results[methodName] = { available: false };
      continue;
    }

    try {
      results[methodName] = { available: true, result: method.call(namespace) };
    } catch (error) {
      results[methodName] = {
        available: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  console.group(`${LOG_PREFIX} read-only ${label} probe`);
  for (const [methodName, result] of Object.entries(results)) console.log(methodName, result);
  logCopyable(`${label.toUpperCase()}_READS`, results);
  console.groupEnd();
}

export function dumpBlueprintNamespace(context: DebugContext): void {
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  dumpNamespace(context, "blueprints", rawApi?.blueprints);
}

export function probeBlueprintReads(context: DebugContext): void {
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  probeReadOnlyNamespace(context, "blueprints", rawApi?.blueprints, ["getAll", "exportAllString"]);
}

export function dumpClipboardNamespace(context: DebugContext): void {
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  dumpNamespace(context, "clipboard", rawApi?.clipboard);
}

export function probeClipboardReads(context: DebugContext): void {
  const rawApi = rawEngine(context).api as UnknownRecord | undefined;
  probeReadOnlyNamespace(context, "clipboard", rawApi?.clipboard, ["get", "getHistory"]);
}
