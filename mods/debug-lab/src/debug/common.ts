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
