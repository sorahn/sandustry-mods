import {
  type BlueprintType,
  type CatalogEntry,
  type CatalogRenderAsset,
  type RenderMetadata,
  catalogRender,
  catalogRenderSize,
} from "@sandustry/blueprint-core";
import generatedCatalog from "../structure-catalog.json";

export type { CatalogEntry, CatalogRenderAsset, RenderMetadata };

export const NATIVE_CATALOG_VERSION = generatedCatalog.generatedAt;

const DIRECTIONAL_NAME_ALIASES: Record<string, string> = {
  burnerBeltLeft: "Burner Belt",
  burnerBeltRight: "Burner Belt",
  clearingFrameLeft: "Clearing Frame",
  clearingFrameRight: "Clearing Frame",
  conveyorLeftMk2: "Conveyor Belt Mk.2",
  conveyorRightMk2: "Conveyor Belt Mk.2",
  launcherLeftMk2: "Launcher Mk.2",
  launcherRightMk2: "Launcher Mk.2",
  launcherUpMk2: "Launcher Mk.2",
};

// The runtime debug probes do not expose a complete catalog. Missing entries
// intentionally continue through the renderer's unknown-content fallback.
const MANUAL_CATALOG: CatalogEntry[] = [
  {
    type: 17,
    name: "Filter",
    category: "logistics",
    footprint: { width: 4, height: 4 },
    rotations: [-180, 0, 180],
    source: "runtime definition + English localization",
  },
  {
    type: "sandustryTestBlocksSource",
    name: "Infinite Source",
    category: "misc",
    footprint: { width: 4, height: 4 },
    source: "repository mod definition",
  },
  {
    type: "sandustryTestBlocksTrash",
    name: "Infinite Trash",
    category: "misc",
    footprint: { width: 4, height: 4 },
    source: "repository mod definition",
  },
  {
    type: "signalCounter4",
    name: "[DEPRECATED] Signal Counter",
    category: "logic",
    footprint: { width: 4, height: 4 },
    renderAsset: {
      path: "catalog/mods__signalCounter4.png",
      sourceSize: { width: 32, height: 16 },
      frame: { width: 16, height: 16 },
      clip: true,
    },
    source: "extracted sprite asset; runtime definition not captured",
  },
];

const runtimeCatalog: CatalogEntry[] = generatedCatalog.entries.map((entry) => ({
  ...entry,
  name:
    (typeof entry.type === "string" ? DIRECTIONAL_NAME_ALIASES[entry.type] : undefined) ??
    (entry.name && !/^\[NO (KEY|NAME)\]$/.test(entry.name) ? entry.name : undefined),
  footprint: entry.shape ? entry.footprint : { width: 4, height: 4 },
}));

const mergedCatalog = new Map<BlueprintType, CatalogEntry>();
for (const entry of runtimeCatalog) mergedCatalog.set(entry.type, entry);
for (const entry of MANUAL_CATALOG) {
  const generated = mergedCatalog.get(entry.type);
  if (!generated || !generated.name) mergedCatalog.set(entry.type, { ...generated, ...entry });
}
export const CATALOG = [...mergedCatalog.values()];
const byType = new Map(CATALOG.map((entry) => [entry.type, entry]));

export function catalogEntry(type: BlueprintType): CatalogEntry | undefined {
  return byType.get(type);
}

export function blueprintCatalog() {
  return {
    get: (type: BlueprintType) => {
      const entry = catalogEntry(type);
      if (!entry) return undefined;
      const render = catalogRender(entry);
      const runtimeOffset =
        render?.offset && typeof render.offset === "object"
          ? (render.offset as { x?: unknown; y?: unknown })
          : undefined;
      const renderAsset = entry.renderAsset
        ? {
            ...entry.renderAsset,
            renderOffset:
              runtimeOffset &&
              (typeof runtimeOffset.x === "number" || typeof runtimeOffset.y === "number")
                ? {
                    x: typeof runtimeOffset.x === "number" ? runtimeOffset.x : undefined,
                    y: typeof runtimeOffset.y === "number" ? runtimeOffset.y : undefined,
                  }
                : undefined,
            renderSize: catalogRenderSize(render),
          }
        : undefined;
      return {
        name: entry.name,
        footprint: entry.footprint,
        shape: Array.isArray(entry.shape) ? entry.shape : undefined,
        rawShape: entry.rawShape,
        signalPoints: entry.signalPoints,
        z: typeof render?.z === "number" ? render.z : undefined,
        renderAsset,
      };
    },
  };
}

export { catalogRender, catalogRenderSize };
