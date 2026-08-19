import { type Blueprint } from "./blueprint";
import { catalogEntry, catalogRender } from "./catalog";
import {
  customShapeFromStructure,
  shapeForStructure,
  createBlueprintRenderModel,
  NATIVE_PIXELS_PER_CELL,
} from "@sandustry/blueprint-core";
import { blueprintCatalog } from "./catalog";
import { readStorageValue } from "./storage";

export const SAVED_MAP_VIEW_KEY = "sandustry.blueprintInspector.mapView";
export const MAP_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4] as const;
export const DISPLAY_PIXELS_PER_BLOCK_AT_100 = 32;
export const BLOCK_COORDINATE_SIZE = NATIVE_PIXELS_PER_CELL;
export const MAP_VIEWPORT_BORDER_SIZE = 2;
export const MAP_VIEWPORT_ASPECT_WIDTH = 16;
export const MAP_VIEWPORT_ASPECT_HEIGHT = 10;
export const MAP_FIT_ZOOM_MIN = 0.25;
export const MAP_FIT_ZOOM_MAX = 2;
export const PAN_COMMIT_DEBOUNCE_MS = 80;
export const MAP_LAYER_ORDER = [
  "background",
  "grid",
  "debugCells",
  "foundationShapes",
  "sprites",
  "signalLinks",
  "selectedHighlight",
  "hoverHighlight",
] as const;

export type MapLayer = (typeof MAP_LAYER_ORDER)[number];
export type MapView = {
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth?: number;
  fit?: boolean;
};
export type StructureShape = number[][];
export type BlueprintMapModel = ReturnType<typeof createBlueprintMapModel>;

export function mapLayerStyle(layer: MapLayer) {
  return { zIndex: MAP_LAYER_ORDER.indexOf(layer) };
}

export function snapMapZoom(value: number) {
  return MAP_ZOOM_LEVELS.reduce((nearest, level) =>
    Math.abs(level - value) < Math.abs(nearest - value) ? level : nearest,
  );
}

export function viewportHeightForWidth(width: number) {
  return (
    width * (MAP_VIEWPORT_ASPECT_HEIGHT / MAP_VIEWPORT_ASPECT_WIDTH) + MAP_VIEWPORT_BORDER_SIZE
  );
}

export function structureFootprint(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const shape = customShapeFromStructure(structure);
  return shape
    ? { width: shape[0].length, height: shape.length }
    : (entry?.footprint ?? { width: 1, height: 1 });
}

export function structureTopY(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const height = structureFootprint(structure).height;
  const anchor = entry?.renderAsset?.anchor;
  const edge = typeof anchor === "string" ? anchor : anchor?.edge;
  return edge === "bottom" ? structure.y - height + 1 : structure.y;
}

export function structureShape(structure: Blueprint["data"][number]): StructureShape | undefined {
  const entry = catalogEntry(structure.type);
  return shapeForStructure(structure, {
    shape: Array.isArray(entry?.shape) ? entry.shape : undefined,
  });
}

export function createBlueprintMapModel(blueprint: Blueprint, padding: number, cell: number) {
  return createBlueprintRenderModel(blueprint, { catalog: blueprintCatalog(), padding, cell });
}

export function readStoredMapView(blueprintKey: string): MapView | null {
  if (typeof window === "undefined" || !blueprintKey) return null;
  const stored = readStorageValue(SAVED_MAP_VIEW_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as {
      blueprint?: unknown;
      zoom?: unknown;
      pan?: { x?: unknown; y?: unknown };
      viewportWidth?: unknown;
      fit?: unknown;
    };
    if (
      value.blueprint !== blueprintKey ||
      typeof value.zoom !== "number" ||
      !Number.isFinite(value.zoom) ||
      typeof value.pan?.x !== "number" ||
      typeof value.pan?.y !== "number" ||
      !Number.isFinite(value.pan.x) ||
      !Number.isFinite(value.pan.y)
    )
      return null;
    return {
      zoom: Math.max(MAP_ZOOM_LEVELS[0], Math.min(4, value.zoom)),
      pan: { x: value.pan.x, y: value.pan.y },
      viewportWidth:
        typeof value.viewportWidth === "number" && Number.isFinite(value.viewportWidth)
          ? value.viewportWidth
          : undefined,
      fit: typeof value.fit === "boolean" ? value.fit : undefined,
    };
  } catch {
    return null;
  }
}
