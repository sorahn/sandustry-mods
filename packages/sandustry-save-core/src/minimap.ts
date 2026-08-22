import {
  decodeDamagedTerrainValue,
  expandRunLengthPairs,
  type SaveGameDocument,
  type SaveGamePayload,
} from "./index";
import { SAVE_EXPLORER_LAYER_ORDER, type SaveExplorerRenderLayer } from "./layers";

export const MINIMAP_CELL_SIZE = 4;
export const SKY_COLOR: RgbaColor = [72, 200, 255, 255];
export const FOG_COLOR: RgbaColor = [0, 0, 0, 255];
const ELEMENT_MATRIX_MIN = 101;

export type RgbaColor = readonly [red: number, green: number, blue: number, alpha: number];

export type MinimapRaster = {
  width: number;
  height: number;
  /** Row-major RGBA pixels, suitable for ImageData or a Canvas ImageData-compatible buffer. */
  pixels: Uint8ClampedArray;
};

export type MinimapRenderOptions = {
  cellSize?: number;
  drawTerrain?: boolean;
  drawSettledElements?: boolean;
  drawElements?: boolean;
  drawParticles?: boolean;
  drawFog?: boolean;
  drawStructures?: boolean;
  drawWalls?: boolean;
  palette?: Readonly<Record<number, RgbaColor>>;
  structureColor?: RgbaColor;
  structurePalette?: Readonly<Record<string, RgbaColor>>;
  wallColor?: RgbaColor;
};

const DEFAULT_STRUCTURE_PALETTE: Readonly<Record<string, RgbaColor>> = {
  // Representative colors for common catalog structures; unknown types use
  // the configured fallback marker color.
  "11": [165, 165, 165, 255], // Foundation
  "16": [101, 240, 0, 255], // Collector (#65f000 in the game minimap)
};

const DEFAULT_PALETTE: Readonly<Record<number, RgbaColor>> = {
  // CellType values from the captured Sandustry enum.
  1: [186, 186, 186, 255], // Element fallback
  2: [105, 76, 43, 255], // Dirt
  3: [90, 73, 53, 255], // Spore soil
  4: [20, 25, 30, 255], // Fog fallback
  5: [45, 56, 63, 255], // Fog jetpack block
  6: [72, 178, 214, 255], // Fog water
  7: [195, 225, 240, 255], // Freezing ice soil
  8: [100, 100, 100, 255], // Divider
  9: [83, 158, 54, 255], // Grass
  10: [66, 118, 62, 255], // Moss
  11: [176, 139, 59, 255], // Gold soil
  14: [75, 162, 193, 255], // Fluxite
  15: [126, 126, 126, 255], // Block
  16: [150, 150, 150, 255], // Sliding block
  17: [150, 150, 150, 255], // Sliding block left
  18: [150, 150, 150, 255], // Sliding block right
  19: [229, 159, 24, 255], // Conveyor left
  20: [229, 159, 24, 255], // Conveyor right
  23: [112, 112, 112, 255], // Stone
  24: [90, 90, 100, 255], // Velocity soaker
  25: [197, 232, 245, 255], // Ice
  26: [104, 168, 75, 255], // Grower
  27: [101, 181, 209, 255], // Nascent water
  28: [117, 84, 44, 255], // Sandium soil
  29: [67, 67, 76, 255], // Obsidian
  30: [90, 86, 80, 255], // Crackstone
  40: [240, 219, 117, 255], // Dune (terrain id resolved by Debug Lab)
  41: [255, 223, 0, 255], // Pyramid terrain core (#ffdf00 in the game minimap)
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
  115: [133, 197, 83, 255], // Seed
  116: [116, 178, 72, 255], // Wet seed
  117: [91, 198, 93, 255], // Seedling
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

function structureColorFor(
  type: unknown,
  fallback: RgbaColor,
  palette: Readonly<Record<string, RgbaColor>>,
) {
  return palette[String(type)] || fallback;
}

function parseStructureColor(value: unknown): RgbaColor | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^#([0-9a-f]{6})(?:([0-9a-f]{2}))?$/i.exec(value);
  if (!match) return undefined;
  const rgb = Number.parseInt(match[1], 16);
  const alpha = match[2] ? Number.parseInt(match[2], 16) : 255;
  return [(rgb >>> 16) & 255, (rgb >>> 8) & 255, rgb & 255, alpha];
}

function colorForValue(
  value: number,
  palette: Readonly<Record<number, RgbaColor>>,
  unknownFallback?: RgbaColor,
) {
  const damaged = decodeDamagedTerrainValue(value);
  const color =
    palette[damaged?.cellType ?? value] ||
    (value >= 100 ? (unknownFallback ?? [210, 210, 210, 255]) : [105, 105, 105, 255]);
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

function wallPaletteColor(payload: SaveGamePayload, paletteIndex: number, fallback: RgbaColor) {
  const wall = payload.wall as Record<string, unknown> | undefined;
  const palette =
    wall && typeof wall.palette === "object" && wall.palette !== null
      ? (wall.palette as Record<string, unknown>)
      : undefined;
  const data = palette?.data;
  if (!Array.isArray(data)) return fallback;
  const offset = paletteIndex * 4;
  if (offset < 0 || offset + 3 >= data.length) return fallback;
  const values = data.slice(offset, offset + 4);
  if (values.some((value) => typeof value !== "number")) return fallback;
  return values as unknown as RgbaColor;
}

function wallBufferFor(payload: SaveGamePayload, width: number, height: number, cellSize: number) {
  const wall = payload.wall as Record<string, unknown> | undefined;
  const tiles =
    wall && typeof wall.tiles === "object" && wall.tiles !== null
      ? (wall.tiles as Record<string, unknown>)
      : undefined;
  const sections = tiles?.sections;
  const encoded = tiles?.data;
  const tileWidth = tiles?.width;
  const tileHeight = tiles?.height;
  if (
    !Array.isArray(sections) ||
    !Array.isArray(encoded) ||
    typeof tileWidth !== "number" ||
    typeof tileHeight !== "number" ||
    tileWidth <= 0 ||
    tileHeight <= 0
  )
    return new Uint8Array(width * height);
  const blockSize = 16;
  const blockColumns = Math.ceil(tileWidth / blockSize);
  const blockRows = Math.ceil(tileHeight / blockSize);
  const sectionIndexes = expandRunLengthPairs<number>(encoded, blockColumns * blockRows);
  const output = new Uint8Array(width * height);
  for (let block = 0; block < sectionIndexes.length; block++) {
    const section = sections[sectionIndexes[block]];
    if (!Array.isArray(section)) continue;
    const blockX = (block % blockColumns) * blockSize;
    const blockY = Math.floor(block / blockColumns) * blockSize;
    for (let local = 0; local < Math.min(section.length, blockSize * blockSize); local++) {
      const value = section[local];
      if (typeof value !== "number" || value === 0) continue;
      const worldX = blockX + (local % blockSize);
      const worldY = blockY + Math.floor(local / blockSize);
      if (worldX >= tileWidth || worldY >= tileHeight) continue;
      const outputIndex = Math.floor(worldY / cellSize) * width + Math.floor(worldX / cellSize);
      if (output[outputIndex] === 0) output[outputIndex] = value;
    }
  }
  return output;
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
  const terrainValues = new Int32Array(width * height);
  const settledElementValues = new Int32Array(width * height);
  const elementValues = new Int32Array(width * height);
  const particleValues = new Int32Array(width * height);
  let position = 0;
  const encoded = document.payload.matrix;
  if (encoded.length % 2 !== 0) throw new Error("Invalid matrix: incomplete value/count pair");
  for (let index = 0; index < encoded.length; index += 2) {
    const rawValue = encoded[index];
    const value = matrixValueCode(rawValue);
    const kind =
      typeof rawValue === "number"
        ? rawValue >= ELEMENT_MATRIX_MIN
          ? 2
          : 1
        : typeof rawValue === "object" &&
            rawValue !== null &&
            (rawValue as Record<string, unknown>).particle === true
          ? 3
          : typeof rawValue === "object" && rawValue !== null
            ? (() => {
                const velocity = (rawValue as Record<string, unknown>).velocity;
                if (
                  typeof velocity === "object" &&
                  velocity !== null &&
                  typeof (velocity as Record<string, unknown>).x === "number" &&
                  typeof (velocity as Record<string, unknown>).y === "number" &&
                  ((velocity as Record<string, unknown>).x !== 0 ||
                    (velocity as Record<string, unknown>).y !== 0)
                )
                  return 4;
                return 2;
              })()
            : 2;
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
        const target =
          kind === 1
            ? terrainValues
            : kind === 2
              ? settledElementValues
              : kind === 3
                ? particleValues
                : elementValues;
        if (target[outputIndex] === 0) target[outputIndex] = value;
      }
    }
    position = end;
  }
  if (position !== worldWidth * worldHeight)
    throw new Error(`Matrix expanded to ${position}; expected ${worldWidth * worldHeight}`);

  const fog = fogBufferFor(document.payload, width, height);
  const walls =
    options.drawWalls === false
      ? new Uint8Array(width * height)
      : wallBufferFor(document.payload, width, height, cellSize);
  const palette = options.palette || DEFAULT_PALETTE;
  const wallFallback = options.wallColor || [166, 166, 166, 255];
  const pixels = new Uint8ClampedArray(width * height * 4);
  const structureColor = options.structureColor || [208, 152, 30, 255];
  const structurePalette = options.structurePalette || DEFAULT_STRUCTURE_PALETTE;
  const renderLayers: Partial<Record<SaveExplorerRenderLayer, () => void>> = {
    background: () => {
      for (let index = 0; index < terrainValues.length; index++)
        copyColor(pixels, index * 4, SKY_COLOR);
    },
    matrix: () => {
      for (let index = 0; index < terrainValues.length; index++) {
        const terrain = options.drawTerrain !== false;
        const settledElement = options.drawSettledElements !== false;
        const element = options.drawElements !== false;
        const particle = options.drawParticles !== false;
        if (terrain && terrainValues[index] !== 0)
          copyColor(pixels, index * 4, colorForValue(terrainValues[index], palette));
        if (settledElement && settledElementValues[index] !== 0)
          copyColor(
            pixels,
            index * 4,
            colorForValue(settledElementValues[index], palette, [210, 210, 210, 255]),
          );
        if (element && elementValues[index] !== 0)
          copyColor(
            pixels,
            index * 4,
            colorForValue(elementValues[index], palette, [180, 220, 255, 255]),
          );
        if (particle && particleValues[index] !== 0)
          copyColor(
            pixels,
            index * 4,
            colorForValue(particleValues[index], palette, [255, 96, 192, 255]),
          );
      }
    },
    wall: () => {
      if (options.drawWalls === false) return;
      for (let index = 0; index < walls.length; index++) {
        if (walls[index] !== 0)
          copyColor(
            pixels,
            index * 4,
            wallPaletteColor(document.payload, walls[index], wallFallback),
          );
      }
    },
    structures: () => {
      if (options.drawStructures === false) return;
      const structures = storeValue(document.payload, ["structures"]);
      if (Array.isArray(structures)) {
        for (const structure of structures) {
          if (typeof structure !== "object" || structure === null) continue;
          const record = structure as Record<string, unknown>;
          if (typeof record.x !== "number" || typeof record.y !== "number") continue;
          const x = Math.floor(record.x / cellSize);
          const y = Math.floor(record.y / cellSize);
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          copyColor(
            pixels,
            (y * width + x) * 4,
            parseStructureColor(record.color) ||
              structureColorFor(record.type, structureColor, structurePalette),
          );
        }
      }
    },
    fog: () => {
      if (options.drawFog === false) return;
      for (let index = 0; index < fog.length; index++) {
        if (fog[index] !== 255) copyColor(pixels, index * 4, FOG_COLOR);
      }
    },
  };
  for (const layer of SAVE_EXPLORER_LAYER_ORDER) renderLayers[layer]?.();
  return { width, height, pixels };
}
