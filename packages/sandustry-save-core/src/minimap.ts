import {
  decodeDamagedTerrainValue,
  expandRunLengthPairs,
  type SaveGameDocument,
  type SaveGamePayload,
} from "./index";

export const MINIMAP_CELL_SIZE = 4;
export const SKY_COLOR: RgbaColor = [72, 200, 255, 255];
export const FOG_COLOR: RgbaColor = [0, 0, 0, 255];

export type RgbaColor = readonly [red: number, green: number, blue: number, alpha: number];

export type MinimapRaster = {
  width: number;
  height: number;
  /** Row-major RGBA pixels, suitable for ImageData or a Canvas ImageData-compatible buffer. */
  pixels: Uint8ClampedArray;
};

export type MinimapRenderOptions = {
  cellSize?: number;
  drawStructures?: boolean;
  palette?: Readonly<Record<number, RgbaColor>>;
  structureColor?: RgbaColor;
};

const DEFAULT_PALETTE: Readonly<Record<number, RgbaColor>> = {
  // CellType values from the captured Sandustry enum.
  1: [186, 186, 186, 255], // Element fallback
  2: [105, 76, 43, 255], // Dirt
  3: [90, 73, 53, 255], // Spore soil
  7: [195, 225, 240, 255], // Freezing ice soil
  9: [83, 158, 54, 255], // Grass
  10: [66, 118, 62, 255], // Moss
  11: [176, 139, 59, 255], // Gold soil
  14: [75, 162, 193, 255], // Fluxite
  15: [126, 126, 126, 255], // Block
  19: [229, 159, 24, 255], // Conveyor left
  20: [229, 159, 24, 255], // Conveyor right
  23: [112, 112, 112, 255], // Stone
  25: [197, 232, 245, 255], // Ice
  28: [117, 84, 44, 255], // Sandium soil
  29: [67, 67, 76, 255], // Obsidian
  30: [90, 86, 80, 255], // Crackstone
  // ElementType values are represented in the saved matrix as type + 100.
  101: [222, 190, 122, 255], // Sand
  102: [188, 188, 188, 255], // Particle
  103: [80, 190, 255, 255], // Water
  104: [177, 142, 104, 255], // Wet sand
  105: [204, 65, 48, 255], // Sandium
  106: [123, 101, 83, 255], // Residue
  107: [255, 207, 54, 255], // Gold
  108: [142, 32, 188, 255], // Gloom
  109: [194, 194, 194, 255], // Shake
  110: [221, 221, 238, 255], // Steam
  111: [255, 91, 28, 255], // Fire
  112: [199, 235, 255, 255], // Freezing ice
  113: [255, 125, 46, 255], // Flame
  114: [92, 63, 48, 255], // Burnt residue
  118: [240, 107, 187, 255], // Petalium
  119: [255, 90, 54, 255], // Lava
  120: [92, 92, 102, 255], // Basalt
};

function storeValue(payload: SaveGamePayload, path: string[]) {
  let value: unknown = payload.store;
  for (const key of path) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function worldDimensions(payload: SaveGamePayload) {
  const size = storeValue(payload, ["world", "size"]);
  if (typeof size !== "object" || size === null)
    throw new Error("Save is missing world dimensions");
  const width = (size as Record<string, unknown>).width;
  const height = (size as Record<string, unknown>).height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Save has invalid world dimensions");
  }
  return { width, height };
}

function matrixValueCode(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "object" || value === null) return 0;
  const record = value as Record<string, unknown>;
  const type = record.type;
  return typeof type === "number" ? type + 100 : 1;
}

function copyColor(target: Uint8ClampedArray, offset: number, color: RgbaColor) {
  target[offset] = color[0];
  target[offset + 1] = color[1];
  target[offset + 2] = color[2];
  target[offset + 3] = color[3];
}

function colorForValue(value: number, palette: Readonly<Record<number, RgbaColor>>) {
  const damaged = decodeDamagedTerrainValue(value);
  const color =
    palette[damaged?.cellType ?? value] ||
    (value >= 100 ? [210, 210, 210, 255] : [105, 105, 105, 255]);
  return color;
}

function fogBufferFor(payload: SaveGamePayload, width: number, height: number) {
  const map = storeValue(payload, ["mods", "map"]);
  if (typeof map !== "object" || map === null) return new Uint8Array(width * height).fill(255);
  const record = map as Record<string, unknown>;
  const encoded = record.fogBuffer;
  const fogWidth = record.fogWidth;
  const fogHeight = record.fogHeight;
  if (!Array.isArray(encoded) || fogWidth !== width || fogHeight !== height)
    return new Uint8Array(width * height).fill(255);
  if (record.fogBufferCompressed)
    return Uint8Array.from(expandRunLengthPairs<number>(encoded, width * height));
  if (encoded.length !== width * height) throw new Error("Invalid uncompressed fog buffer length");
  return Uint8Array.from(encoded, (value) => (typeof value === "number" ? value : 0));
}

/** Build the native-style one-pixel-per-4×4-cell minimap raster. */
export function renderMinimapRgba(
  document: SaveGameDocument,
  options: MinimapRenderOptions = {},
): MinimapRaster {
  const { width: worldWidth, height: worldHeight } = worldDimensions(document.payload);
  const cellSize = options.cellSize ?? MINIMAP_CELL_SIZE;
  if (!Number.isSafeInteger(cellSize) || cellSize <= 0)
    throw new Error("Minimap cell size must be a positive integer");
  const width = Math.ceil(worldWidth / cellSize);
  const height = Math.ceil(worldHeight / cellSize);
  const values = new Int32Array(width * height);
  let position = 0;
  const encoded = document.payload.matrix;
  if (encoded.length % 2 !== 0) throw new Error("Invalid matrix: incomplete value/count pair");
  for (let index = 0; index < encoded.length; index += 2) {
    const value = matrixValueCode(encoded[index]);
    const count = encoded[index + 1];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
      throw new Error(`Invalid matrix count at pair ${index / 2}`);
    const end = position + count;
    if (end > worldWidth * worldHeight) throw new Error("Matrix exceeds world dimensions");
    if (value !== 0) {
      for (let cursor = position; cursor < end; cursor++) {
        const x = Math.floor((cursor % worldWidth) / cellSize);
        const y = Math.floor(Math.floor(cursor / worldWidth) / cellSize);
        const outputIndex = y * width + x;
        if (values[outputIndex] === 0) values[outputIndex] = value;
      }
    }
    position = end;
  }
  if (position !== worldWidth * worldHeight)
    throw new Error(`Matrix expanded to ${position}; expected ${worldWidth * worldHeight}`);

  const fog = fogBufferFor(document.payload, width, height);
  const palette = options.palette || DEFAULT_PALETTE;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < values.length; index++) {
    const offset = index * 4;
    if (fog[index] !== 255) copyColor(pixels, offset, FOG_COLOR);
    else if (values[index] === 0) copyColor(pixels, offset, SKY_COLOR);
    else copyColor(pixels, offset, colorForValue(values[index], palette));
  }

  if (options.drawStructures !== false) {
    const structures = storeValue(document.payload, ["structures"]);
    const structureColor = options.structureColor || [208, 152, 30, 255];
    if (Array.isArray(structures)) {
      for (const structure of structures) {
        if (typeof structure !== "object" || structure === null) continue;
        const record = structure as Record<string, unknown>;
        if (typeof record.x !== "number" || typeof record.y !== "number") continue;
        const x = Math.floor(record.x / cellSize);
        const y = Math.floor(record.y / cellSize);
        if (x < 0 || x >= width || y < 0 || y >= height || fog[y * width + x] !== 255) continue;
        copyColor(pixels, (y * width + x) * 4, structureColor);
      }
    }
  }
  return { width, height, pixels };
}
