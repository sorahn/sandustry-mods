import { normalizeSaveDocument, type NormalizeSaveOptions } from "./model";

export type SaveGameMetadata = {
  id: string;
  timestamp?: string;
  playTime?: number;
  worldId?: string;
  worldName?: string | null;
  seed?: string | null;
  factoryLevel?: number;
  productionPoints?: number;
  structureCount?: number;
  resources?: Record<string, number>;
  name?: string;
  [key: string]: unknown;
};

export type SaveGameLayer = {
  sections?: unknown[];
  data?: unknown[];
  width?: number;
  height?: number;
  [key: string]: unknown;
};

export type SaveGamePayload = {
  store: Record<string, unknown>;
  matrix: unknown[];
  wall?: SaveGameLayer;
  shadow?: SaveGameLayer;
  authorization?: SaveGameLayer;
  [key: string]: unknown;
};

export type SaveGameDocument = {
  metadata: SaveGameMetadata;
  payload: SaveGamePayload;
  compressedPayloadBytes: number;
  decompressedPayloadBytes: number;
};

export type RunLengthPair<T> = {
  value: T;
  count: number;
};

export type DamagedTerrainValue = {
  cellType: number;
  hp: number;
};

export {
  normalizeSaveDocument,
  createSaveExplorerTileIndex,
  classifySaveExplorerMatrixValue,
  SAVE_EXPLORER_DOCUMENT_VERSION,
  type NormalizeSaveOptions,
  type SaveExplorerDiagnostic,
  type SaveExplorerDocument,
  type SaveExplorerElement,
  type SaveExplorerCellKind,
  type SaveExplorerLayer,
  type SaveExplorerLayerName,
  type SaveExplorerMetadata,
  type SaveExplorerStructure,
  type SaveExplorerTile,
  type SaveExplorerTileIndex,
  type SaveExplorerWorld,
} from "./model";

export {
  createSaveExplorerViewport,
  fitSaveExplorerViewport,
  panSaveExplorerViewport,
  resetSaveExplorerViewport,
  resizeSaveExplorerViewport,
  SAVE_EXPLORER_ZOOM_LEVELS,
  screenToWorld,
  visibleMapRect,
  worldToScreen,
  zoomSaveExplorerViewport,
  type SaveExplorerMapPoint,
  type SaveExplorerViewport,
  type SaveExplorerVisibleRect,
} from "./viewport";

export {
  SAVE_EXPLORER_LAYER_ORDER,
  saveExplorerLayerIndex,
  type SaveExplorerRenderLayer,
} from "./layers";

export { inspectSaveExplorerCell, type SaveExplorerCellInspection } from "./inspection";

export {
  saveExplorerCellName,
  saveExplorerElementName,
  saveExplorerStructureName,
  saveExplorerTerrainName,
} from "./catalog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonObject<T extends object>(text: string, label: string): T {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid ${label} JSON`, { cause: error });
  }
  if (!isRecord(value)) throw new Error(`Expected ${label} to be a JSON object`);
  return value as T;
}

function asBytes(input: ArrayBuffer | Uint8Array) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

async function gunzip(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Gzip decompression is unavailable in this environment");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return new TextEncoder().encode(text);
}

/** Decode the browser-exported save format: metadata JSON, newline, gzip JSON. */
export async function decodeBrowserSave(
  input: ArrayBuffer | Uint8Array,
): Promise<SaveGameDocument> {
  const bytes = asBytes(input);
  const separator = bytes.indexOf(10);
  if (separator <= 0) throw new Error("Invalid save: missing metadata separator");

  const metadata = parseJsonObject<SaveGameMetadata>(
    new TextDecoder().decode(bytes.subarray(0, separator)),
    "save metadata",
  );
  if (typeof metadata.id !== "string" || metadata.id.length === 0)
    throw new Error("Invalid save metadata: missing id");

  const compressed = bytes.subarray(separator + 1);
  if (compressed[0] !== 0x1f || compressed[1] !== 0x8b)
    throw new Error("Unsupported save payload: expected gzip data");
  const decompressed = await gunzip(compressed);
  const payload = parseJsonObject<SaveGamePayload>(
    new TextDecoder().decode(decompressed),
    "save payload",
  );
  if (!Array.isArray(payload.matrix)) throw new Error("Invalid save payload: missing matrix");
  if (!isRecord(payload.store)) throw new Error("Invalid save payload: missing store");

  return {
    metadata,
    payload,
    compressedPayloadBytes: compressed.byteLength,
    decompressedPayloadBytes: decompressed.byteLength,
  };
}

export async function decodeBrowserSaveDocument(
  input: ArrayBuffer | Uint8Array,
  options: NormalizeSaveOptions = {},
) {
  return normalizeSaveDocument(await decodeBrowserSave(input), options);
}

/** Expand the game's alternating value/count representation with validation. */
export function expandRunLengthPairs<T>(encoded: readonly unknown[], expectedLength?: number): T[] {
  if (encoded.length % 2 !== 0)
    throw new Error("Invalid run-length data: incomplete value/count pair");
  const output: T[] = [];
  for (let index = 0; index < encoded.length; index += 2) {
    const count = encoded[index + 1];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Invalid run-length count at pair ${index / 2}`);
    }
    if (expectedLength !== undefined && output.length + count > expectedLength) {
      throw new Error("Run-length data exceeds expected length");
    }
    for (let repeat = 0; repeat < count; repeat++) output.push(encoded[index] as T);
  }
  if (expectedLength !== undefined && output.length !== expectedLength) {
    throw new Error(`Run-length data expanded to ${output.length}; expected ${expectedLength}`);
  }
  return output;
}

/** Decode the game's negative matrix convention for damaged terrain. */
export function decodeDamagedTerrainValue(value: number): DamagedTerrainValue | null {
  if (!Number.isSafeInteger(value) || value >= 0) return null;
  const encoded = -value;
  return {
    cellType: Math.floor(encoded / 10000),
    hp: encoded % 10000,
  };
}

export {
  FOG_COLOR,
  MINIMAP_CELL_SIZE,
  SKY_COLOR,
  renderMinimapRgba,
  type MinimapRaster,
  type MinimapRenderOptions,
  type RgbaColor,
} from "./minimap";
