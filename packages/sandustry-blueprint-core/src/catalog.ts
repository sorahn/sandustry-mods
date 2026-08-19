import type { BlueprintType, SignalPoints } from "./index";
import type { RenderAsset } from "./prepare";

export type RenderMetadata = {
  imageName?: string;
  size?: unknown;
  ui?: unknown;
  [key: string]: unknown;
};

export type CatalogRenderAsset = RenderAsset & {
  path: string;
  sourceSize?: { width: number; height: number };
  sourceCrop?: { x: number; y: number; width: number; height: number };
  frame?: { width: number; height: number };
  frameIndex?: number;
  scale?: string | { mode: string; factor?: number };
  clip?: boolean;
  offset?: { x?: number; y?: number };
  rotation?: number;
  anchor?: string | { edge: string; offsetCells?: number };
  debug?: { height?: number };
  lightColor?: string;
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
  renderAsset?: CatalogRenderAsset;
  signalPoints?: SignalPoints;
  source: string;
};

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
