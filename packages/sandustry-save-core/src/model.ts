import type { SaveGameDocument, SaveGameLayer } from "./index";

export const SAVE_EXPLORER_DOCUMENT_VERSION = 1 as const;

export type SaveExplorerDiagnosticSeverity = "warning" | "error";

export type SaveExplorerDiagnostic = {
  severity: SaveExplorerDiagnosticSeverity;
  code:
    | "unsupported-version"
    | "malformed-rle"
    | "truncated-section"
    | "unknown-id"
    | "dimension-mismatch"
    | "invalid-structure";
  message: string;
  path?: string;
};

export type SaveExplorerMetadata = {
  saveId: string;
  worldId?: string;
  worldName?: string;
  seed?: string;
  gameVersion?: string;
  createdVersion?: string;
  timestamp?: string;
  playTime?: number;
  tick?: number;
  time?: number;
  factoryLevel?: number;
  structureCount?: number;
};

export type SaveExplorerWorld = {
  width: number;
  height: number;
  playerPosition?: { x: number; y: number };
};

export type SaveExplorerLayerName = "matrix" | "wall" | "shadow" | "authorization";

/** Compact source representation; expansion belongs to the worker/rendering phase. */
export type SaveExplorerLayer = {
  name: SaveExplorerLayerName;
  width: number;
  height: number;
  encoding: "run-length" | "sectioned" | "raw";
  expectedLength: number;
  data: unknown;
};

export type SaveExplorerStructure = {
  type: string | number;
  x: number;
  y: number;
  rotation?: number;
  direction?: number;
  variant?: string | number;
  shape?: number[][];
  footprint?: { width: number; height: number };
  data?: Record<string, unknown>;
};

export type SaveExplorerElement = {
  type: number;
  id?: string;
  name?: string;
  velocity?: { x: number; y: number };
  raw?: unknown;
};

export type SaveExplorerDocument = {
  documentVersion: typeof SAVE_EXPLORER_DOCUMENT_VERSION;
  format: "browser-json-gzip";
  metadata: SaveExplorerMetadata;
  world: SaveExplorerWorld;
  layers: Partial<Record<SaveExplorerLayerName, SaveExplorerLayer>>;
  structures: SaveExplorerStructure[];
  elements: SaveExplorerElement[];
  diagnostics: SaveExplorerDiagnostic[];
  unknown: {
    store: Record<string, unknown>;
    payload: Record<string, unknown>;
  };
};

export type NormalizeSaveOptions = {
  supportedGameVersions?: readonly string[];
};

export type SaveExplorerTile = {
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SaveExplorerTileIndex = {
  tileSize: number;
  columns: number;
  rows: number;
  tileCount: number;
  tileAt(column: number, row: number): SaveExplorerTile | undefined;
  tileForCell(x: number, y: number): SaveExplorerTile | undefined;
};

export function createSaveExplorerTileIndex(
  width: number,
  height: number,
  tileSize = 4,
): SaveExplorerTileIndex {
  if (!positiveInteger(width) || !positiveInteger(height) || !positiveInteger(tileSize))
    throw new Error("Tile index dimensions and tile size must be positive integers");
  const columns = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);
  const tileAt = (column: number, row: number) => {
    if (!Number.isSafeInteger(column) || !Number.isSafeInteger(row) || column < 0 || row < 0)
      return undefined;
    if (column >= columns || row >= rows) return undefined;
    const x = column * tileSize;
    const y = row * tileSize;
    return {
      column,
      row,
      x,
      y,
      width: Math.min(tileSize, width - x),
      height: Math.min(tileSize, height - y),
    };
  };
  return {
    tileSize,
    columns,
    rows,
    tileCount: columns * rows,
    tileAt,
    tileForCell: (x, y) => {
      if (
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height
      )
        return undefined;
      return tileAt(Math.floor(x / tileSize), Math.floor(y / tileSize));
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function layerData(layer: SaveGameLayer | undefined): unknown {
  if (!layer) return undefined;
  const source = isRecord(layer.tiles) ? layer.tiles : layer;
  if (source.data !== undefined) return source.data;
  return source.sections;
}

function layerEncoding(layer: SaveGameLayer | undefined): SaveExplorerLayer["encoding"] {
  if (!layer) return "raw";
  const source = isRecord(layer.tiles) ? layer.tiles : layer;
  return Array.isArray(source.sections)
    ? "sectioned"
    : Array.isArray(source.data)
      ? "run-length"
      : "raw";
}

function addDimensionDiagnostic(
  diagnostics: SaveExplorerDiagnostic[],
  path: string,
  width: unknown,
  height: unknown,
  expectedWidth: number,
  expectedHeight: number,
) {
  if (width === undefined && height === undefined) return;
  if (width !== expectedWidth || height !== expectedHeight) {
    diagnostics.push({
      severity: "error",
      code: "dimension-mismatch",
      path,
      message: `${path} dimensions do not match the world dimensions`,
    });
  }
}

function validateRunLength(
  data: unknown,
  expectedLength: number,
  path: string,
  diagnostics: SaveExplorerDiagnostic[],
) {
  if (!Array.isArray(data) || data.length % 2 !== 0) {
    diagnostics.push({
      severity: "error",
      code: "malformed-rle",
      path,
      message: `${path} is not a complete value/count sequence`,
    });
    return;
  }
  let length = 0;
  for (let index = 1; index < data.length; index += 2) {
    const count = data[index];
    if (!positiveInteger(count) && count !== 0) {
      diagnostics.push({
        severity: "error",
        code: "malformed-rle",
        path,
        message: `${path} has an invalid count at pair ${index / 2}`,
      });
      return;
    }
    length += count as number;
    if (length > expectedLength) {
      diagnostics.push({
        severity: "error",
        code: "truncated-section",
        path,
        message: `${path} exceeds the expected world size`,
      });
      return;
    }
  }
  if (length !== expectedLength)
    diagnostics.push({
      severity: "error",
      code: "truncated-section",
      path,
      message: `${path} expands to ${length} cells; expected ${expectedLength}`,
    });
}

function normalizeStructure(
  value: unknown,
  index: number,
  diagnostics: SaveExplorerDiagnostic[],
): SaveExplorerStructure | undefined {
  if (!isRecord(value) || !("type" in value) || !finiteNumber(value.x) || !finiteNumber(value.y)) {
    diagnostics.push({
      severity: "error",
      code: "invalid-structure",
      path: `store.structures[${index}]`,
      message: "Structure must have a type and finite x/y coordinates",
    });
    return undefined;
  }
  const structure: SaveExplorerStructure = {
    type: value.type as string | number,
    x: value.x,
    y: value.y,
  };
  if (finiteNumber(value.rotation)) structure.rotation = value.rotation;
  if (finiteNumber(value.direction)) structure.direction = value.direction;
  if (typeof value.variant === "string" || finiteNumber(value.variant))
    structure.variant = value.variant;
  if (
    Array.isArray(value.shape) &&
    value.shape.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "number"))
  )
    structure.shape = value.shape as number[][];
  if (
    isRecord(value.footprint) &&
    positiveInteger(value.footprint.width) &&
    positiveInteger(value.footprint.height)
  )
    structure.footprint = { width: value.footprint.width, height: value.footprint.height };
  if (isRecord(value.data)) structure.data = value.data;
  return structure;
}

function normalizeElements(
  store: Record<string, unknown>,
  diagnostics: SaveExplorerDiagnostic[],
): SaveExplorerElement[] {
  const savedElements = store.elements;
  if (Array.isArray(savedElements)) {
    return savedElements.flatMap((value, index) => {
      if (!isRecord(value) || !Number.isSafeInteger(value.type)) {
        diagnostics.push({
          severity: "warning",
          code: "unknown-id",
          path: `store.elements[${index}]`,
          message: "Ignored an element record without a numeric type",
        });
        return [];
      }
      const element: SaveExplorerElement = { type: value.type as number, raw: value };
      if (typeof value.id === "string") element.id = value.id;
      if (typeof value.name === "string") element.name = value.name;
      if (
        isRecord(value.velocity) &&
        finiteNumber(value.velocity.x) &&
        finiteNumber(value.velocity.y)
      )
        element.velocity = { x: value.velocity.x, y: value.velocity.y };
      return [element];
    });
  }
  const discovered = isRecord(store.discoveries) ? store.discoveries.elements : undefined;
  if (discovered === undefined) return [];
  if (!Array.isArray(discovered)) {
    diagnostics.push({
      severity: "warning",
      code: "unknown-id",
      path: "store.discoveries.elements",
      message: "Element discovery data is not an array",
    });
    return [];
  }
  return discovered.flatMap((value) => {
    if (!Number.isSafeInteger(value)) {
      diagnostics.push({
        severity: "warning",
        code: "unknown-id",
        path: "store.discoveries.elements",
        message: "Ignored an element entry without a numeric type",
      });
      return [];
    }
    return [{ type: value as number }];
  });
}

export function normalizeSaveDocument(
  save: SaveGameDocument,
  options: NormalizeSaveOptions = {},
): SaveExplorerDocument {
  const diagnostics: SaveExplorerDiagnostic[] = [];
  const store = save.payload.store;
  const world = isRecord(store.world) ? store.world : {};
  const size = isRecord(world.size) ? world.size : {};
  const width = positiveInteger(size.width) ? size.width : 0;
  const height = positiveInteger(size.height) ? size.height : 0;
  const expectedLength = width * height;
  const meta = isRecord(store.meta) ? store.meta : {};
  const gameVersion = typeof store.version === "string" ? store.version : undefined;
  if (
    options.supportedGameVersions &&
    gameVersion &&
    !options.supportedGameVersions.includes(gameVersion)
  )
    diagnostics.push({
      severity: "warning",
      code: "unsupported-version",
      path: "store.version",
      message: `Game version ${gameVersion} is not in the supported version list`,
    });

  const layers: Partial<Record<SaveExplorerLayerName, SaveExplorerLayer>> = {};
  const matrix = {
    name: "matrix" as const,
    width,
    height,
    encoding: "run-length" as const,
    expectedLength,
    data: save.payload.matrix,
  };
  layers.matrix = matrix;
  validateRunLength(save.payload.matrix, expectedLength, "payload.matrix", diagnostics);
  for (const name of ["wall", "shadow", "authorization"] as const) {
    const source = save.payload[name];
    if (!source) continue;
    addDimensionDiagnostic(
      diagnostics,
      `payload.${name}`,
      source.width,
      source.height,
      width,
      height,
    );
    layers[name] = {
      name,
      width,
      height,
      encoding: layerEncoding(source),
      expectedLength,
      data: layerData(source),
    };
  }

  const rawStructures = store.structures;
  const structures = Array.isArray(rawStructures)
    ? rawStructures.flatMap((value, index) => {
        const normalized = normalizeStructure(value, index, diagnostics);
        return normalized ? [normalized] : [];
      })
    : [];
  if (rawStructures !== undefined && !Array.isArray(rawStructures))
    diagnostics.push({
      severity: "error",
      code: "invalid-structure",
      path: "store.structures",
      message: "Structure data is not an array",
    });

  const player =
    isRecord(store.player) && finiteNumber(store.player.x) && finiteNumber(store.player.y)
      ? { x: store.player.x, y: store.player.y }
      : undefined;
  const metadata = {
    saveId: save.metadata.id,
    worldId: typeof meta.worldId === "string" ? meta.worldId : save.metadata.worldId,
    worldName:
      typeof meta.worldName === "string" ? meta.worldName : (save.metadata.worldName ?? undefined),
    seed: typeof meta.seed === "string" ? meta.seed : (save.metadata.seed ?? undefined),
    gameVersion,
    createdVersion: typeof store.createdVersion === "string" ? store.createdVersion : undefined,
    timestamp: save.metadata.timestamp,
    playTime: finiteNumber(save.metadata.playTime)
      ? save.metadata.playTime
      : finiteNumber(meta.time)
        ? meta.time
        : undefined,
    tick: finiteNumber(meta.tick) ? meta.tick : undefined,
    time: finiteNumber(meta.time) ? meta.time : undefined,
    factoryLevel: finiteNumber(save.metadata.factoryLevel) ? save.metadata.factoryLevel : undefined,
    structureCount: structures.length,
  } satisfies SaveExplorerMetadata;

  return {
    documentVersion: SAVE_EXPLORER_DOCUMENT_VERSION,
    format: "browser-json-gzip",
    metadata,
    world: { width, height, playerPosition: player },
    layers,
    structures,
    elements: normalizeElements(store, diagnostics),
    diagnostics,
    unknown: { store, payload: save.payload },
  };
}
