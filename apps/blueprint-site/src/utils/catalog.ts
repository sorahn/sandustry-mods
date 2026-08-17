import type { BlueprintType } from "@sandustry/blueprint-core";
import generatedCatalog from "../structure-catalog.json";

export type RenderMetadata = {
  imageName?: string;
  size?: unknown;
  ui?: unknown;
  [key: string]: unknown;
};

export type RenderAsset = {
  path: string;
  sourceSize?: { width: number; height: number };
  frame?: { width: number; height: number };
  frameIndex?: number;
  scale?: string;
  clip?: boolean;
  offset?: { x?: number; y?: number };
  rotation?: number;
  anchor?: string;
};

export type CatalogEntry = {
  type: BlueprintType;
  name?: string;
  nameKey?: string;
  category?: string;
  footprint: { width: number; height: number };
  shape?: number[][] | string;
  rotations?: number[];
  buildModes?: unknown;
  variants?: unknown;
  definition?: unknown;
  render?: RenderMetadata | string;
  renderAsset?: RenderAsset;
  source: string;
};

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

export function catalogRender(entry: CatalogEntry): RenderMetadata | undefined {
  return typeof entry.render === "object" && entry.render !== null ? entry.render : undefined;
}

export function catalogRenderSize(render: RenderMetadata) {
  if (!render.size || typeof render.size !== "object") return undefined;
  const size = render.size as { width?: unknown; height?: unknown };
  return typeof size.width === "number" && typeof size.height === "number"
    ? { width: size.width, height: size.height }
    : undefined;
}
