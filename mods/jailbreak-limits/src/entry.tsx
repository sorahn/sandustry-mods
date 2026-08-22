/* Sandustry Jailbreak Building Limits Mod */

"use strict";

const api = sandkit.api;
const engineApi = (sandkit as any).engine?.api;
const MOD_ID = "sorahn.sandustry-jailbreak-limits";
const STRATACORE_TYPE = "earthStratacore";
const GLOOM_EMITTER_TYPE = 27;
let internalStratacoreBuild = false;

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
  const uncapAll = getSetting("uncapAll", false);
  if (uncapAll) return true;
  if (idOrType === undefined || idOrType === null) return false;

  const uncapStratacore = getSetting("uncapStratacore", true);
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
    uncapStratacore &&
    (idStr.includes("strata") || idStr.includes("core") || idStr.includes("earth"))
  ) {
    return true;
  }
  if (
    uncapFluxite &&
    (idStr.includes("flux") || idStr.includes("emanator") || idStr.includes("generator"))
  ) {
    return true;
  }
  if (
    uncapVoidSeed &&
    (idStr.includes("void") ||
      idStr.includes("seed") ||
      idStr.includes("spawner") ||
      idStr.includes("voidgrazer") ||
      idStr.includes("converter") ||
      idStr.includes("extractor"))
  ) {
    return true;
  }

  return false;
}

function registerStratacorePlacementBypass(): void {
  const callback = (...hookArgs: any[]) => {
    const context = hookArgs.find(
      (value) => value && typeof value === "object" && "structureId" in value,
    );
    const control = hookArgs.find(
      (value) => value && typeof value === "object" && typeof value.cancel === "function",
    );
    console.log(
      `[${MOD_ID}] building:place observed: ${String(context?.structureId ?? "<missing>")}`,
    );
    if (context?.structureId !== STRATACORE_TYPE) return;

    if (internalStratacoreBuild) {
      // The low-level build API re-enters building:place. Let the native
      // callback continue, but prevent its one-instance callback from
      // cancelling this internal build.
      if (control) control.cancel = () => {};
      internalStratacoreBuild = false;
      console.log(`[${MOD_ID}] Allowed internal Stratacore build through native hook.`);
      return;
    }

    const x = context.x;
    const y = context.y;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;

    control?.cancel?.();
    internalStratacoreBuild = true;
    const build = api.structures?.buildAtCellWhenIdle;
    if (typeof build === "function") {
      try {
        build(x, y, STRATACORE_TYPE, { bypassPlacementChecks: true });
      } catch (err) {
        internalStratacoreBuild = false;
        throw err;
      }
      console.log(`[${MOD_ID}] Bypassed native Stratacore placement guard at ${x},${y}.`);
      return;
    }

    const engineBuild = engineApi?.structures?.build;
    if (typeof engineBuild === "function") {
      try {
        engineBuild({ x, y }, STRATACORE_TYPE, { bypassPlacementChecks: true });
      } catch (err) {
        internalStratacoreBuild = false;
        throw err;
      }
      console.log(`[${MOD_ID}] Used engine Stratacore placement fallback at ${x},${y}.`);
      return;
    }
    internalStratacoreBuild = false;
  };

  try {
    const unregister = api.hooks?.intercept?.("building:place", callback, {
      // Native Stratacore guard uses the default priority (0). Run first so
      // the hook chain does not return before this bypass can handle the
      // second placement.
      priority: -100000,
      modId: MOD_ID,
    });
    console.log(
      `[${MOD_ID}] Registered wildcard building:place interceptor (unregister: ${typeof unregister === "function"}).`,
    );
  } catch (err) {
    console.warn(`[${MOD_ID}] Failed to register Stratacore placement bypass:`, err);
  }
}

function applyEngineEscapeHatch(): void {
  try {
    const unlocked = api.structures?.getUnlockedTypes?.() ?? [];
    let uncappedCount = 0;

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

        uncappedCount += 1;
      }
    }
    console.log(`[${MOD_ID}] Engine escape hatch uncapped ${uncappedCount} structure definitions.`);
  } catch (err) {
    console.warn(`[${MOD_ID}] Error uncapping structure definitions:`, err);
  }
}

function registerHooks(): void {
  registerStratacorePlacementBypass();

  const placementLimitCallback = (...hookArgs: any[]) => {
    const context = hookArgs.find(
      (value) =>
        value &&
        typeof value === "object" &&
        ("maxCount" in value || "currentCount" in value || "structureType" in value),
    );
    const id = context?.structureId ?? context?.structureType ?? context?.type ?? context?.id;
    const isGloomEmitter = id === GLOOM_EMITTER_TYPE || isTargetStructure(id);
    if (context) {
      console.log(
        `[${MOD_ID}] placement-limit observed: type=${String(id)} count=${String(context.currentCount)} max=${String(context.maxCount)}`,
      );
    }
    if (getSetting("uncapAll", false) || (id && isGloomEmitter)) {
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
      console.log(`[${MOD_ID}] Hook 'building:placement-limit' registered via public API.`);
    }
  } catch (err) {
    console.warn(`[${MOD_ID}] Failed to register public 'building:placement-limit' hook:`, err);
  }

  try {
    if (engineApi?.hooks?.modify) {
      engineApi.hooks.modify("building:placement-limit", placementLimitCallback);
      console.log(
        `[${MOD_ID}] Hook 'building:placement-limit' registered via engine API escape hatch.`,
      );
    }
  } catch (_err) {
    // Engine API modify hook fallback
  }

  const costCallback = (baseCost: any, context: any) => {
    const stabilize = getSetting("stabilizeCosts", true);
    if (!stabilize) return baseCost;

    const id = context?.structureId ?? context?.structureType ?? context?.type ?? context?.id;
    if (id && isTargetStructure(id)) {
      if (typeof baseCost === "number") {
        return baseCost;
      }
      if (typeof baseCost === "object" && baseCost !== null) {
        return { ...baseCost, multiplier: 1 };
      }
    }
    return baseCost;
  };

  try {
    if (api.hooks?.modify) {
      api.hooks.modify("progression:cost:prepare", costCallback);
    }
  } catch (_err) {}
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

console.log(`[${MOD_ID}] Jailbreak Building Limits initialized cleanly via engine escape hatch.`);
