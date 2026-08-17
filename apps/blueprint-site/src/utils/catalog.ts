import type { BlueprintType } from "@sandustry/blueprint-core";
import generatedCatalog from "../structure-catalog.json";

export type RenderMetadata = {
  imageName?: string;
  size?: unknown;
  ui?: unknown;
  [key: string]: unknown;
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
  assetPath?: string;
  assetFrame?: { width: number; height: number };
  assetFrameIndex?: number;
  assetSize?: { width: number; height: number };
  assetClip?: boolean;
  assetRotation?: number;
  /** Manual render offset in native sprite pixels. */
  assetOffset?: { x?: number; y?: number };
  /** Fine adjustment for sprites with a one-pixel inset on each side. */
  assetScaleFactor?: number;
  positionAnchor?: string;
  assetScale?: "tile" | "cell" | string;
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

// A few mod sprites need explicit frame metadata because the runtime catalog
// does not describe their exported animation strips consistently. Keep these
// corrections here so regenerated catalog snapshots do not reintroduce
// cropping or stretching in the blueprint map.
const CATALOG_OVERRIDES: Partial<Record<BlueprintType, Partial<CatalogEntry>>> = {
  clearingFrameLeft: {
    assetFrame: { width: 16, height: 20 },
    assetClip: true,
    assetOffset: { y: -4 },
  },
  clearingFrameRight: {
    assetFrame: { width: 16, height: 20 },
    assetClip: true,
    assetOffset: { y: -4 },
  },
  snowmaker: {
    assetFrame: { width: 16, height: 16 },
    assetClip: false,
  },
  aurixiteCrystallizer: {
    assetFrame: { width: 24, height: 24 },
    assetClip: false,
    assetScaleFactor: 14 / 16,
    assetOffset: { x: 1.5, y: 1 },
  },
  launcherLeftMk2: {
    assetScaleFactor: 14 / 16,
    assetOffset: { x: 1, y: 1 },
  },
  launcherRightMk2: {
    assetScaleFactor: 14 / 16,
    assetOffset: { x: 1, y: 1 },
  },
  launcherUpMk2: {
    assetScaleFactor: 14 / 16,
    assetOffset: { x: 1, y: 1 },
  },
  signalGate: {
    assetScaleFactor: 14 / 16,
    assetOffset: { x: 1, y: 1 },
  },
  filterWall: {
    // The exported wall sprite is 18×18 native pixels, but its structure
    // footprint is 16×16. Scale it to the footprint and cancel the runtime
    // render offset that centered the unscaled sprite.
    assetScaleFactor: 16 / 18,
    assetOffset: { x: 1, y: 1 },
  },
  kineticFieldEmitter: {
    assetPath: "catalog/mods__kinetic_field_emitter.png",
    assetSize: { width: 23, height: 16 },
    assetFrame: { width: 23, height: 16 },
    assetClip: false,
    assetScaleFactor: 14 / 14,
    assetOffset: { x: -16 },
    assetRotation: 0,
  },
  kineticFieldEmitterDown: {
    assetPath: "catalog/mods__kinetic_field_emitter.png",
    assetSize: { width: 23, height: 16 },
    assetFrame: { width: 23, height: 16 },
    assetClip: false,
    assetScaleFactor: 14 / 14,
    assetOffset: { x: -16 },
    assetRotation: 90,
  },
  kineticFieldEmitterLeft: {
    assetPath: "catalog/mods__kinetic_field_emitter.png",
    assetSize: { width: 23, height: 16 },
    assetFrame: { width: 23, height: 16 },
    assetClip: false,
    assetScaleFactor: 14 / 14,
    assetOffset: { x: -16 },
    assetRotation: 180,
  },
  kineticFieldEmitterUp: {
    assetPath: "catalog/mods__kinetic_field_emitter.png",
    assetSize: { width: 23, height: 16 },
    assetFrame: { width: 23, height: 16 },
    assetClip: false,
    assetScaleFactor: 14 / 14,
    assetOffset: { x: -16 },
    assetRotation: 270,
  },
  kineticFieldEmitterDownRight: {
    assetPath: "catalog/mods__kinetic_field_emitter_diagonal.png",
    assetSize: { width: 15, height: 15 },
    assetFrame: { width: 15, height: 15 },
    assetClip: false,
    assetOffset: { x: -8, y: 8 },
    assetRotation: 90,
  },
  kineticFieldEmitterDownLeft: {
    assetPath: "catalog/mods__kinetic_field_emitter_diagonal.png",
    assetSize: { width: 15, height: 15 },
    assetFrame: { width: 15, height: 15 },
    assetClip: false,
    assetOffset: { x: -8, y: 8 },
    assetRotation: 180,
  },
  kineticFieldEmitterUpLeft: {
    assetPath: "catalog/mods__kinetic_field_emitter_diagonal.png",
    assetSize: { width: 15, height: 15 },
    assetFrame: { width: 15, height: 15 },
    assetClip: false,
    assetOffset: { x: -8, y: 8 },
    assetRotation: 270,
  },
  kineticFieldEmitterUpRight: {
    assetPath: "catalog/mods__kinetic_field_emitter_diagonal.png",
    assetSize: { width: 15, height: 15 },
    assetFrame: { width: 15, height: 15 },
    assetClip: false,
    assetOffset: { x: -8, y: 8 },
    assetRotation: 0,
  },
};

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
for (const [type, override] of Object.entries(CATALOG_OVERRIDES) as [
  BlueprintType,
  Partial<CatalogEntry>,
][]) {
  const entry = mergedCatalog.get(type);
  if (entry) mergedCatalog.set(type, { ...entry, ...override });
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
