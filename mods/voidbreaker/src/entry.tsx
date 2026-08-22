/* Sandustry Voidbreaker Mod */

"use strict";

const api = sandkit.api;
const engineApi = (sandkit as any).engine?.api;
const MOD_ID = "sorahn.sandustry-voidbreaker";
const GLOOM_EMITTER_TYPE = 27;

function getSetting<T>(key: string, defaultValue: T): T {
  try {
    const value = api.settings?.get?.(`${MOD_ID}.${key}`) ?? api.settings?.get?.(key);
    if (value !== undefined && value !== null) {
      return value as T;
    }
  } catch (_err) {
    // Fall back to default if setting lookup fails
  }
  return defaultValue;
}

function isTargetStructure(idOrType: unknown): boolean {
  if (idOrType === undefined || idOrType === null) return false;

  const uncapFluxite = getSetting("uncapFluxiteGenerator", true);
  const uncapVoidSeed = getSetting("uncapVoidSeedSpawner", true);

  if (typeof idOrType === "number") {
    try {
      const typeName = api.structures?.getTypeFromId?.(idOrType);
      if (typeName) return isTargetStructure(typeName);
    } catch (_err) {
      // Ignore
    }
    return false;
  }

  const idStr = String(idOrType).toLowerCase();

  if (
    uncapFluxite &&
    (idStr.includes("flux") || idStr.includes("emanator") || idStr.includes("generator"))
  ) {
    return true;
  }
  if (uncapVoidSeed && idStr.includes("void")) {
    return true;
  }

  return false;
}

function applyEngineEscapeHatch(): void {
  try {
    const unlocked = api.structures?.getUnlockedTypes?.() ?? [];

    for (const type of unlocked) {
      if (isTargetStructure(type)) {
        // 1. Update via public API
        api.structures?.updateDefinition?.(type, {
          placementLimit: Number.POSITIVE_INFINITY,
          maxCount: Number.POSITIVE_INFINITY,
          limit: Number.POSITIVE_INFINITY,
        });

        // 2. Unversioned engine API escape hatch (sandkit.engine.api)
        try {
          const config = engineApi?.structures?.getConfig?.(type);
          if (config && typeof config === "object") {
            config.placementLimit = Number.POSITIVE_INFINITY;
            config.maxCount = Number.POSITIVE_INFINITY;
            config.limit = Number.POSITIVE_INFINITY;
            if ("single" in config) config.single = false;
            if ("unique" in config) config.unique = false;
          }
        } catch (_err) {
          // Ignore internal escape hatch fallback errors
        }
      }
    }
  } catch (_err) {
    // Ignore escape hatch failures when the runtime is unavailable.
  }
}

function registerHooks(): void {
  const placementLimitCallback = (...hookArgs: any[]) => {
    const context = hookArgs.find(
      (value) =>
        value &&
        typeof value === "object" &&
        ("maxCount" in value || "currentCount" in value || "structureType" in value),
    );
    const id = context?.structureId ?? context?.structureType ?? context?.type ?? context?.id;
    const isGloomEmitter = id === GLOOM_EMITTER_TYPE || isTargetStructure(id);
    if (id && isGloomEmitter) {
      if (context) {
        // The native placement code treats non-finite values as the default
        // cap of 1. Its explicit unlimited sentinel is null.
        context.maxCount = null;
        context.placementLimit = null;
        context.limit = null;
      }
      return;
    }
  };

  try {
    if (api.hooks?.modify) {
      api.hooks.modify("building:placement-limit", placementLimitCallback);
    }
  } catch (_err) {
    // Ignore unavailable public hooks.
  }

  try {
    if (engineApi?.hooks?.modify) {
      engineApi.hooks.modify("building:placement-limit", placementLimitCallback);
    }
  } catch (_err) {
    // Engine API modify hook fallback
  }
}

// Initialize
registerHooks();
applyEngineEscapeHatch();

if (api.events?.on) {
  api.events.on("game:ready", () => {
    applyEngineEscapeHatch();
  });
}

if (api.settings?.onChange) {
  api.settings.onChange(() => {
    applyEngineEscapeHatch();
  });
}
