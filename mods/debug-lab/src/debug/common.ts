export type UnknownRecord = Record<string, any>;

export interface DebugContext {
  api: SandustryApi;
  engine: SandustryEngine;
  sandkit: typeof sandkit;
}

export const LOG_PREFIX = "[Sandustry Debug Lab]";

export function rawEngine(context: DebugContext): UnknownRecord {
  return context.engine as unknown as UnknownRecord;
}

export function dumpNamespace(context: DebugContext, label: string, value: unknown): void {
  const namespace = value && typeof value === "object" ? (value as UnknownRecord) : null;
  const entries = Object.entries(namespace ?? {}).map(([key, entry]) => ({
    key,
    type: typeof entry,
    arity: typeof entry === "function" ? entry.length : null,
  }));

  console.group(`${LOG_PREFIX} ${label} namespace`);
  console.log("namespace value", value);
  console.table(entries);
  logCopyable(label.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), entries);
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
  logCopyable(`${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_READS`, results);
  console.groupEnd();
}

export function rawState(context: DebugContext): UnknownRecord {
  return rawEngine(context).state as UnknownRecord;
}

export function jsonSafe(value: unknown): unknown {
  const seen = new WeakSet<object>();
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === "bigint") return `${item}n`;
      if (typeof item === "function") return `[Function ${item.name || "anonymous"}]`;
      if (item && typeof item === "object") {
        if (seen.has(item)) return "[Circular]";
        seen.add(item);
      }
      return item;
    }),
  );
}

export function inspect(label: string, value: unknown): void {
  console.groupCollapsed(`${LOG_PREFIX} ${label}`);
  console.log(value);
  try {
    console.log("JSON", jsonSafe(value));
  } catch (error) {
    console.warn("Could not JSON serialize value", error);
  }
  console.groupEnd();
}

export function logCopyable(label: string, value: unknown): void {
  try {
    console.log(`${LOG_PREFIX} COPYABLE_${label} ${JSON.stringify(jsonSafe(value))}`);
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not create copyable ${label} JSON`, error);
  }
}

export function toast(context: DebugContext, message: string): void {
  try {
    context.api.ui.toast(`${LOG_PREFIX} ${message}`);
  } catch (error) {
    console.warn(`${LOG_PREFIX} toast failed`, error);
  }
}
