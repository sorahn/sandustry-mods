import { classifySaveExplorerMatrixValue, type SaveExplorerCellKind } from "./model";
import { expandRunLengthPairs, type SaveGameDocument } from "./index";

export type SaveExplorerCellInspection = {
  mapX: number;
  mapY: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  fogValue: number;
  revealed: boolean;
  kind?: SaveExplorerCellKind;
  type?: number;
  raw?: unknown;
  structures?: Array<{ type: string | number; x: number; y: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function worldSize(save: SaveGameDocument) {
  const world = save.payload.store.world;
  const size = isRecord(world) && isRecord(world.size) ? world.size : undefined;
  if (!size || typeof size.width !== "number" || typeof size.height !== "number")
    throw new Error("Save is missing world dimensions");
  return { width: size.width, height: size.height };
}

function fogValueAt(save: SaveGameDocument, x: number, y: number, width: number, height: number) {
  const map =
    isRecord(save.payload.store.mods) && isRecord(save.payload.store.mods.map)
      ? save.payload.store.mods.map
      : undefined;
  const encoded = map?.fogBuffer;
  if (!Array.isArray(encoded) || map?.fogWidth !== width || map?.fogHeight !== height) return 255;
  const fog = map.fogBufferCompressed
    ? expandRunLengthPairs<number>(encoded, width * height)
    : encoded;
  const value = fog[y * width + x];
  return typeof value === "number" ? value : 0;
}

function matrixValueAt(encoded: unknown[], target: number) {
  let position = 0;
  for (let index = 0; index < encoded.length; index += 2) {
    const count = encoded[index + 1];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
      throw new Error("Invalid matrix count");
    if (target < position + count) return encoded[index];
    position += count;
  }
  return 0;
}

/** Inspect one rendered minimap cell without disclosing unrevealed contents. */
export function inspectSaveExplorerCell(
  save: SaveGameDocument,
  mapX: number,
  mapY: number,
  cellSize = 4,
): SaveExplorerCellInspection | undefined {
  const size = worldSize(save);
  const width = Math.ceil(size.width / cellSize);
  const height = Math.ceil(size.height / cellSize);
  if (mapX < 0 || mapY < 0 || mapX >= width || mapY >= height) return undefined;
  const worldX = mapX * cellSize;
  const worldY = mapY * cellSize;
  const fogValue = fogValueAt(save, mapX, mapY, width, height);
  const inspection: SaveExplorerCellInspection = {
    mapX,
    mapY,
    worldX,
    worldY,
    width: Math.min(cellSize, size.width - worldX),
    height: Math.min(cellSize, size.height - worldY),
    fogValue,
    revealed: fogValue === 255,
  };
  if (!inspection.revealed) return inspection;

  for (let y = worldY; y < worldY + inspection.height; y++) {
    for (let x = worldX; x < worldX + inspection.width; x++) {
      const value = matrixValueAt(save.payload.matrix, y * size.width + x);
      if (value === 0) continue;
      inspection.kind = classifySaveExplorerMatrixValue(value);
      if (isRecord(value) && typeof value.type === "number") inspection.type = value.type;
      inspection.raw = value;
      break;
    }
    if (inspection.raw !== undefined) break;
  }
  if (!inspection.kind) inspection.kind = "empty";

  const structures = save.payload.store.structures;
  if (Array.isArray(structures)) {
    inspection.structures = structures.flatMap((value) => {
      if (!isRecord(value) || (typeof value.type !== "string" && typeof value.type !== "number"))
        return [];
      if (typeof value.x !== "number" || typeof value.y !== "number") return [];
      return Math.floor(value.x / cellSize) === mapX && Math.floor(value.y / cellSize) === mapY
        ? [{ type: value.type, x: value.x, y: value.y }]
        : [];
    });
  }
  return inspection;
}
