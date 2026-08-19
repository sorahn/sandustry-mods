import type { Blueprint, BlueprintStructure, BlueprintType, SignalLink } from "./index";

export type BlueprintCoordinate = { x: number; y: number };

export type SignalPoint = BlueprintCoordinate;

export type SignalPoints = {
  input?: SignalPoint;
  output?: SignalPoint;
  shared?: SignalPoint;
};

export type SignalPointResolver = (type: BlueprintType) => SignalPoints | undefined;

export type StructureCatalogEntry = {
  footprint?: { width: number; height: number };
  shape?: number[][];
  signalPoints?: SignalPoints;
  z?: number;
  renderAsset?: RenderAsset;
};

export type RenderAsset = {
  frameIndex?: number;
  rotation?: number;
  animation?: {
    topology?: string;
    cornerFrame?: number;
    edgeFrame?: number;
    interiorFrame?: number;
    sideRotation?: number;
  };
  [key: string]: unknown;
};

export type PreparedSprite = {
  asset: RenderAsset;
  frameIndex: number;
  rotation: number;
};

export type BlueprintCatalog = {
  get: (type: BlueprintType) => StructureCatalogEntry | undefined;
};

export type PreparedSignalLink = SignalLink & {
  fromStructureIndex: number | null;
  toStructureIndex: number | null;
  fromPoint: BlueprintCoordinate;
  toPoint: BlueprintCoordinate;
  sourceType?: BlueprintType;
  path:
    | { kind: "line"; from: BlueprintCoordinate; to: BlueprintCoordinate }
    | {
        kind: "cubic";
        from: BlueprintCoordinate;
        control1: BlueprintCoordinate;
        control2: BlueprintCoordinate;
        to: BlueprintCoordinate;
      };
};

export type PreparedStructure = {
  structure: BlueprintStructure;
  index: number;
  spriteIndex?: number;
  lightColor?: string;
  customShape?: number[][];
  shape?: number[][];
  footprint: { width: number; height: number };
  z: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  sprite?: PreparedSprite;
};

export type PreparedBlueprint = Blueprint & {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  signalCoordinateOffset: BlueprintCoordinate;
  preparedStructures: PreparedStructure[];
  preparedSignalLinks: PreparedSignalLink[];
};

export type PrepareBlueprintOptions = {
  catalog?: BlueprintCatalog;
  resolveSignalPoints?: SignalPointResolver;
};

const CORNER_INPUT: SignalPoint = { x: 0, y: 0 };
const CORNER_OUTPUT: SignalPoint = { x: 3, y: 3 };
const CENTER: SignalPoint = { x: 1.5, y: 1.5 };
const SENSOR: SignalPoint = { x: 3, y: 3 };
const GATE_TYPES = new Set([
  "signalAnd",
  "signalNand",
  "signalNor",
  "signalNot",
  "signalOr",
  "signalXnor",
  "signalXor",
]);
const INPUT_OUTPUT_TYPES = new Set([
  "signalLamp",
  "signalRepeater",
  "signalSwitch",
  "signalToggle",
]);
const SENSOR_TYPES = new Set(["signalPresenceSensor", "signalPulseSensor", "signalSensor"]);

export function defaultSignalPoints(type: BlueprintType): SignalPoints | undefined {
  if (typeof type !== "string") return undefined;
  if (GATE_TYPES.has(type) || INPUT_OUTPUT_TYPES.has(type)) {
    return { input: CORNER_INPUT, output: CORNER_OUTPUT };
  }
  if (type === "signalButton") return { output: CORNER_OUTPUT };
  if (SENSOR_TYPES.has(type)) return { shared: SENSOR };
  if (type === "signalBuffer") return { shared: CENTER };
  return undefined;
}

function spriteIndexFor(structure: BlueprintStructure) {
  if (structure.type !== "signalLamp" && structure.type !== "signalGate") return undefined;
  if (!structure.data || typeof structure.data !== "object") return undefined;
  const state = structure.data as Record<string, unknown>;
  if (typeof state.spriteIndex === "number" && Number.isInteger(state.spriteIndex)) {
    return state.spriteIndex;
  }
  if (structure.type === "signalGate" && typeof state.desiredOpen === "boolean") {
    return state.desiredOpen ? 1 : 0;
  }
  if (structure.type === "signalLamp") {
    for (const key of ["on", "outputValue"]) {
      if (typeof state[key] === "boolean") return state[key] ? 1 : 0;
    }
  }
  return undefined;
}

function colorValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffff) {
    return `#${value.toString(16).padStart(6, "0")}`;
  }
  if (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every((part) => typeof part === "number" && part >= 0 && part <= 255)
  ) {
    const channels = value.slice(0, 3) as number[];
    const normalized = channels.every((part) => part <= 1);
    return `rgb(${(normalized ? channels.map((part) => Math.round(part * 255)) : channels).join(", ")})`;
  }
  if (typeof value !== "object" || value === null) {
    if (typeof value !== "string") return undefined;
    try {
      if (value.trim().startsWith("{")) return colorValue(JSON.parse(value));
    } catch {
      return undefined;
    }
    return /^#[0-9a-f]{3,8}$/i.test(value) ||
      /^rgba?\([^)]*\)$/i.test(value) ||
      /^hsla?\([^)]*\)$/i.test(value)
      ? value
      : undefined;
  }
  const record = value as Record<string, unknown>;
  if ([record.r, record.g, record.b].every((part) => typeof part === "number")) {
    return colorValue([record.r, record.g, record.b]);
  }
  for (const key of ["color", "colour", "lightColor", "colorHex", "hex", "value"]) {
    const nested = colorValue(record[key]);
    if (nested) return nested;
  }
  for (const [key, nestedValue] of Object.entries(record)) {
    if (key.toLowerCase().includes("color")) {
      const nested = colorValue(nestedValue);
      if (nested) return nested;
    }
  }
  return undefined;
}

function nestedLightColor(value: unknown): string | undefined {
  const direct = colorValue(value);
  if (direct) return direct;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["data", "customData", "state", "properties", "config", "value"]) {
    const nested = nestedLightColor(record[key]);
    if (nested) return nested;
  }
  return undefined;
}

function lightColorFor(structure: BlueprintStructure) {
  return nestedLightColor(structure.data) ?? nestedLightColor(structure.filter);
}

export function customShapeFromStructure(structure: BlueprintStructure) {
  if (typeof structure.data !== "object" || structure.data === null) return undefined;
  const data = structure.data as Record<string, unknown>;
  const prefabulator = data.__prefabulatorBlueprint;
  if (typeof prefabulator !== "object" || prefabulator === null) return undefined;
  const definition = (prefabulator as Record<string, unknown>).definition;
  if (typeof definition !== "object" || definition === null) return undefined;
  const shape = (definition as Record<string, unknown>).shape;
  if (
    !Array.isArray(shape) ||
    shape.length === 0 ||
    !shape.every(
      (row) =>
        Array.isArray(row) &&
        row.length > 0 &&
        row.every((value) => typeof value === "number" && Number.isFinite(value)),
    )
  ) {
    return undefined;
  }
  const width = shape[0].length;
  return shape.every((row) => row.length === width) ? (shape as number[][]) : undefined;
}

export function shapeForStructure(
  structure: BlueprintStructure,
  catalogEntry?: StructureCatalogEntry,
) {
  return customShapeFromStructure(structure) ?? catalogEntry?.shape;
}

function prepareSprites(structures: PreparedStructure[]) {
  const collectors = structures.filter(
    (prepared) => prepared.sprite?.asset.animation?.topology === "collector",
  );
  const byPosition = new Map(
    collectors.map((prepared) => [`${prepared.structure.x},${prepared.structure.y}`, prepared]),
  );
  const visited = new Set<number>();

  for (const start of collectors) {
    if (visited.has(start.index)) continue;
    const component: PreparedStructure[] = [];
    const queue = [start];
    visited.add(start.index);
    while (queue.length) {
      const prepared = queue.shift()!;
      component.push(prepared);
      for (const [dx, dy] of [
        [4, 0],
        [-4, 0],
        [0, 4],
        [0, -4],
      ]) {
        const neighbor = byPosition.get(
          `${prepared.structure.x + dx},${prepared.structure.y + dy}`,
        );
        if (neighbor && !visited.has(neighbor.index)) {
          visited.add(neighbor.index);
          queue.push(neighbor);
        }
      }
    }
    const bounds = component.reduce(
      (value, prepared) => ({
        minX: Math.min(value.minX, prepared.structure.x),
        maxX: Math.max(value.maxX, prepared.structure.x),
        minY: Math.min(value.minY, prepared.structure.y),
        maxY: Math.max(value.maxY, prepared.structure.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );
    for (const prepared of component) {
      const animation = prepared.sprite!.asset.animation!;
      const atLeft = prepared.structure.x === bounds.minX;
      const atRight = prepared.structure.x === bounds.maxX;
      const atTop = prepared.structure.y === bounds.minY;
      const atBottom = prepared.structure.y === bounds.maxY;
      let frameIndex = animation.interiorFrame ?? 2;
      let rotation = 0;
      if ((atTop || atBottom) && (atLeft || atRight)) {
        frameIndex = animation.cornerFrame ?? 0;
      } else if (atTop || atBottom) {
        frameIndex = animation.edgeFrame ?? 3;
      } else if (atLeft || atRight) {
        frameIndex = animation.edgeFrame ?? 3;
        rotation = animation.sideRotation ?? 90;
      }
      prepared.sprite = { ...prepared.sprite!, frameIndex, rotation };
    }
  }
}

function coordinateOffset(blueprint: Blueprint): BlueprintCoordinate {
  const endpoints = (blueprint.signalLinks ?? []).flatMap((link) => [link.from, link.to]);
  if (!endpoints.length || !blueprint.data.length) return { x: 0, y: 0 };
  const candidates = new Map<string, { offset: BlueprintCoordinate; matches: number }>();
  for (const endpoint of endpoints) {
    for (const structure of blueprint.data) {
      const offset = { x: endpoint.x - structure.x, y: endpoint.y - structure.y };
      const key = `${offset.x},${offset.y}`;
      const candidate = candidates.get(key) ?? { offset, matches: 0 };
      candidate.matches += 1;
      candidates.set(key, candidate);
    }
  }
  const best = [...candidates.values()].sort((left, right) => right.matches - left.matches)[0];
  return best?.matches === endpoints.length ? best.offset : { x: 0, y: 0 };
}

function structureIndexAt(structures: BlueprintStructure[], coordinate: BlueprintCoordinate) {
  return structures.findIndex(
    (structure) => structure.x === coordinate.x && structure.y === coordinate.y,
  );
}

function resolveEndpoint(
  structures: BlueprintStructure[],
  raw: BlueprintCoordinate,
  offset: BlueprintCoordinate,
  side: "from" | "to",
  resolveSignalPoints: SignalPointResolver,
) {
  const origin = { x: raw.x - offset.x, y: raw.y - offset.y };
  const structureIndex = structureIndexAt(structures, origin);
  const structure = structureIndex < 0 ? undefined : structures[structureIndex];
  const points = structure ? resolveSignalPoints(structure.type) : undefined;
  const local = points?.shared ?? points?.[side === "from" ? "output" : "input"];
  return {
    structureIndex: structureIndex < 0 ? null : structureIndex,
    point: local && structure ? { x: structure.x + local.x, y: structure.y + local.y } : origin,
  };
}

function wirePath(from: BlueprintCoordinate, to: BlueprintCoordinate, straight: boolean) {
  if (straight) return { kind: "line" as const, from, to };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const curve = Math.min(6, Math.max(1.5, distance * 0.15));
  return {
    kind: "cubic" as const,
    from,
    control1: { x: from.x + dx * 0.25, y: from.y + dy * 0.25 + curve },
    control2: { x: from.x + dx * 0.75, y: from.y + dy * 0.75 + curve },
    to,
  };
}

export function prepareBlueprint(
  blueprint: Blueprint,
  options: PrepareBlueprintOptions = {},
): PreparedBlueprint {
  const resolveSignalPoints =
    options.resolveSignalPoints ??
    ((type: BlueprintType) =>
      options.catalog?.get(type)?.signalPoints ?? defaultSignalPoints(type));
  const preparedStructures = blueprint.data.map((structure, index) => {
    const catalogEntry = options.catalog?.get(structure.type);
    const customShape = customShapeFromStructure(structure);
    const shape = shapeForStructure(structure, catalogEntry);
    const footprint = shape
      ? { width: shape[0].length, height: shape.length }
      : (catalogEntry?.footprint ?? { width: 1, height: 1 });
    const renderAsset = catalogEntry?.renderAsset;
    return {
      structure,
      index,
      spriteIndex: spriteIndexFor(structure),
      lightColor: lightColorFor(structure),
      customShape,
      shape,
      footprint,
      z: catalogEntry?.z ?? 0.5,
      bounds: {
        minX: structure.x,
        minY: structure.y,
        maxX: structure.x + footprint.width - 1,
        maxY: structure.y + footprint.height - 1,
      },
      sprite: renderAsset
        ? {
            asset: renderAsset,
            frameIndex: spriteIndexFor(structure) ?? renderAsset.frameIndex ?? 0,
            rotation: renderAsset.rotation ?? 0,
          }
        : undefined,
    };
  });
  prepareSprites(preparedStructures);
  const bounds = preparedStructures.length
    ? preparedStructures.slice(1).reduce(
        (value, prepared) => ({
          minX: Math.min(value.minX, prepared.bounds.minX),
          minY: Math.min(value.minY, prepared.bounds.minY),
          maxX: Math.max(value.maxX, prepared.bounds.maxX),
          maxY: Math.max(value.maxY, prepared.bounds.maxY),
        }),
        { ...preparedStructures[0].bounds },
      )
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const signalCoordinateOffset = coordinateOffset(blueprint);
  const preparedSignalLinks = (blueprint.signalLinks ?? []).map((link) => {
    const from = resolveEndpoint(
      blueprint.data,
      link.from,
      signalCoordinateOffset,
      "from",
      resolveSignalPoints,
    );
    const to = resolveEndpoint(
      blueprint.data,
      link.to,
      signalCoordinateOffset,
      "to",
      resolveSignalPoints,
    );
    const sourceType =
      from.structureIndex === null ? undefined : blueprint.data[from.structureIndex].type;
    return {
      ...link,
      fromStructureIndex: from.structureIndex,
      toStructureIndex: to.structureIndex,
      fromPoint: from.point,
      toPoint: to.point,
      sourceType,
      path: wirePath(from.point, to.point, sourceType === "signalBuffer"),
    };
  });
  return { ...blueprint, bounds, signalCoordinateOffset, preparedStructures, preparedSignalLinks };
}
