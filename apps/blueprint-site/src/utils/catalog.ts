import type { BlueprintType } from "@sandustry/blueprint-core";
import generatedCatalog from "../structure-catalog.json";

export type CatalogEntry = {
  type: BlueprintType;
  name?: string;
  category?: string;
  footprint: { width: number; height: number };
  rotations?: number[];
  source: string;
};

export const NATIVE_CATALOG_VERSION = generatedCatalog.generatedAt;

// The runtime debug probes do not expose a complete catalog. Missing entries
// intentionally continue through the renderer's unknown-content fallback.
const MANUAL_CATALOG: CatalogEntry[] = [
  {
    type: 11,
    name: "Foundation",
    category: "blocks",
    footprint: { width: 4, height: 4 },
    rotations: [-180, -90, 0, 90, 180],
    source: "bundle structure definition + English localization",
  },
  {
    type: 17,
    name: "Filter",
    category: "logistics",
    footprint: { width: 4, height: 4 },
    rotations: [-180, 0, 180],
    source: "runtime definition + English localization",
  },
  {
    type: 25,
    name: "Liquid Vent",
    category: "fluids",
    footprint: { width: 4, height: 4 },
    rotations: [-180, -90, 0, 90, 180],
    source: "runtime definition + English localization",
  },
  {
    type: "filterWall",
    name: "Filter Wall",
    category: "logistics",
    footprint: { width: 4, height: 4 },
    rotations: [-90, 90],
    source: "runtime definition probe",
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
  name: entry.name && !/^\[NO (KEY|NAME)\]$/.test(entry.name) ? entry.name : undefined,
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
