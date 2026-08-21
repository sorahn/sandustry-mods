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
  name?: string;
  footprint?: { width: number; height: number };
  shape?: number[][];
  rawShape?: boolean;
  signalPoints?: SignalPoints;
  z?: number;
  renderAsset?: RenderAsset;
};

export type RenderAsset = {
  path?: string;
  renderSize?: { width: number; height: number };
  renderOffset?: { x?: number; y?: number };
  sourceSize?: { width: number; height: number };
  sourceCrop?: { x: number; y: number; width: number; height: number };
  frame?: { width: number; height: number };
  frameIndex?: number;
  scale?: string | { mode: string; factor?: number };
  clip?: boolean;
  offset?: { x?: number; y?: number };
  rotation?: number;
  anchor?: string | { edge: string; offsetCells?: number };
  lightColor?: string;
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
  [key: string]: unknown;
};

export type PreparedStructure = {
  structure: BlueprintStructure;
  index: number;
  spriteIndex?: number;
  lightColor?: string;
  customShape?: number[][];
  shape?: number[][];
  rawShape?: boolean;
  footprint: { width: number; height: number };
  topY: number;
  visualTopY: number;
  z: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  sprite?: PreparedSprite;
};

export type UnderlyingCell = { x: number; y: number };

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

function anchorEdge(anchor: RenderAsset["anchor"]) {
  return typeof anchor === "object" && anchor !== null ? anchor.edge : anchor;
}

function anchorOffsetCells(anchor: RenderAsset["anchor"]) {
  return typeof anchor === "object" && anchor !== null ? (anchor.offsetCells ?? 0) : 0;
}

function scaleMode(scale: RenderAsset["scale"]) {
  return typeof scale === "object" && scale !== null ? scale.mode : scale;
}

function scaleFactor(scale: RenderAsset["scale"]) {
  return typeof scale === "object" && scale !== null ? (scale.factor ?? 1) : 1;
}

export function structureTopY(
  structure: BlueprintStructure,
  footprint: { width: number; height: number },
  renderAsset?: RenderAsset,
) {
  return anchorEdge(renderAsset?.anchor) === "bottom"
    ? structure.y - footprint.height + 1
    : structure.y;
}

export function structureVisualTopY(
  structure: BlueprintStructure,
  footprint: { width: number; height: number },
  renderAsset?: RenderAsset,
) {
  const topY = structureTopY(structure, footprint, renderAsset);
  const assetOffsetY = (renderAsset?.offset?.y ?? 0) / 4;
  if (scaleMode(renderAsset?.scale) !== "cell" || anchorEdge(renderAsset?.anchor) !== "bottom") {
    return topY + assetOffsetY;
  }
  if (!renderAsset) return topY + assetOffsetY;
  const frameHeight = renderAsset.frame?.width ?? 1;
  const sourceHeight =
    renderAsset.sourceCrop?.height ?? renderAsset.sourceSize?.height ?? frameHeight;
  const scale = scaleFactor(renderAsset.scale);
  return (
    structure.y +
    1 -
    (sourceHeight / frameHeight) * scale +
    anchorOffsetCells(renderAsset.anchor) +
    assetOffsetY
  );
}

const NATIVE_RAW_SHAPE_TYPES = new Set<BlueprintType>([1, 2, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20]);
const BELT_TYPES = new Set<BlueprintType>([
  1,
  2,
  "conveyorLeftMk2",
  "conveyorRightMk2",
  "burnerBeltLeft",
  "burnerBeltRight",
]);

export function contributesUnderlyingCells(prepared: PreparedStructure) {
  return (
    prepared.customShape !== undefined ||
    prepared.rawShape === true ||
    NATIVE_RAW_SHAPE_TYPES.has(prepared.structure.type) ||
    BELT_TYPES.has(prepared.structure.type)
  );
}

export function isBeltType(type: BlueprintType) {
  return BELT_TYPES.has(type);
}

export function underlyingCellCoordinates(structures: PreparedStructure[]): UnderlyingCell[] {
  return structures.flatMap((prepared) => {
    if (!contributesUnderlyingCells(prepared)) return [];
    const shape =
      prepared.shape ??
      Array.from({ length: prepared.footprint.height }, () =>
        Array.from({ length: prepared.footprint.width }, () => 1),
      );
    return shape.flatMap((row, rowIndex) =>
      row.flatMap((value, columnIndex) =>
        value === 0 ? [] : [{ x: prepared.structure.x + columnIndex, y: prepared.topY + rowIndex }],
      ),
    );
  });
}

export function foundationOutlinePath(
  structures: PreparedStructure[],
  minX: number,
  minY: number,
  padding: number,
  cell: number,
) {
  const outlineOffset = 0.5 / 4;
  const occupied = new Set(underlyingCellCoordinates(structures).map(({ x, y }) => `${x},${y}`));

  const edges: Array<{ from: [number, number]; to: [number, number] }> = [];
  const edge = (x: number, y: number, nextX: number, nextY: number) => {
    edges.push({ from: [x, y], to: [nextX, nextY] });
  };
  for (const key of occupied) {
    const [x, y] = key.split(",").map(Number);
    if (!occupied.has(`${x - 1},${y}`)) edge(x, y, x, y + 1);
    if (!occupied.has(`${x + 1},${y}`)) edge(x + 1, y + 1, x + 1, y);
    if (!occupied.has(`${x},${y - 1}`)) edge(x + 1, y, x, y);
    if (!occupied.has(`${x},${y + 1}`)) edge(x, y + 1, x + 1, y + 1);
  }
  const outgoing = new Map<string, number[]>();
  edges.forEach((currentEdge, index) => {
    const key = currentEdge.from.join(",");
    outgoing.set(key, [...(outgoing.get(key) ?? []), index]);
  });
  const nextBoundaryEdge = (currentIndex: number, candidates: number[]) => {
    if (candidates.length < 2) return candidates[0];
    const current = edges[currentIndex];
    const [x, y] = current.to;
    const northwest = occupied.has(`${x - 1},${y - 1}`);
    const northeast = occupied.has(`${x},${y - 1}`);
    const southwest = occupied.has(`${x - 1},${y}`);
    const southeast = occupied.has(`${x},${y}`);
    const diagonalTouch =
      (northwest && southeast && !northeast && !southwest) ||
      (northeast && southwest && !northwest && !southeast);
    if (!diagonalTouch) return candidates[0];
    const incomingAngle = Math.atan2(
      current.to[1] - current.from[1],
      current.to[0] - current.from[0],
    );
    return candidates.reduce((best, candidate) => {
      const next = edges[candidate];
      const outgoingAngle = Math.atan2(next.to[1] - next.from[1], next.to[0] - next.from[0]);
      const bestEdge = edges[best];
      const bestAngle = Math.atan2(
        bestEdge.to[1] - bestEdge.from[1],
        bestEdge.to[0] - bestEdge.from[0],
      );
      const turn = (outgoingAngle - incomingAngle + Math.PI * 2) % (Math.PI * 2);
      const bestTurn = (bestAngle - incomingAngle + Math.PI * 2) % (Math.PI * 2);
      return turn < bestTurn ? candidate : best;
    }, candidates[0]);
  };
  const visited = new Set<number>();
  const contours: string[] = [];
  edges.forEach((startEdge, startIndex) => {
    if (visited.has(startIndex)) return;
    const start = startEdge.from;
    let currentIndex = startIndex;
    const points: Array<[number, number]> = [start];
    while (!visited.has(currentIndex)) {
      visited.add(currentIndex);
      const currentEdge = edges[currentIndex];
      points.push(currentEdge.to);
      if (currentEdge.to[0] === start[0] && currentEdge.to[1] === start[1]) break;
      const next = nextBoundaryEdge(
        currentIndex,
        outgoing.get(currentEdge.to.join(","))?.filter((index) => !visited.has(index)) ?? [],
      );
      if (next === undefined) break;
      currentIndex = next;
    }
    if (points.length > 1) points.pop();
    const contourPoints = points.filter((current, index) => {
      const previous = points[(index + points.length - 1) % points.length];
      const next = points[(index + 1) % points.length];
      return (
        (current[0] - previous[0]) * (next[1] - current[1]) -
          (current[1] - previous[1]) * (next[0] - current[0]) !==
        0
      );
    });
    const area = contourPoints.reduce((sum, current, index) => {
      const next = contourPoints[(index + 1) % contourPoints.length];
      return sum + current[0] * next[1] - next[0] * current[1];
    }, 0);
    const offsetPoint = (
      previous: [number, number],
      current: [number, number],
      next: [number, number],
    ) => {
      const offsetLine = (from: [number, number], to: [number, number]) => {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const length = Math.hypot(dx, dy);
        const normal = area > 0 ? [dy / length, -dx / length] : [-dy / length, dx / length];
        return {
          from: [from[0] + normal[0] * outlineOffset, from[1] + normal[1] * outlineOffset],
          to: [to[0] + normal[0] * outlineOffset, to[1] + normal[1] * outlineOffset],
        };
      };
      const incoming = offsetLine(previous, current);
      const outgoing = offsetLine(current, next);
      const denominator =
        (incoming.from[0] - incoming.to[0]) * (outgoing.from[1] - outgoing.to[1]) -
        (incoming.from[1] - incoming.to[1]) * (outgoing.from[0] - outgoing.to[0]);
      if (denominator === 0) return current;
      const factor =
        ((incoming.from[0] - outgoing.from[0]) * (outgoing.from[1] - outgoing.to[1]) -
          (incoming.from[1] - outgoing.from[1]) * (outgoing.from[0] - outgoing.to[0])) /
        denominator;
      return [
        incoming.from[0] + factor * (incoming.to[0] - incoming.from[0]),
        incoming.from[1] + factor * (incoming.to[1] - incoming.from[1]),
      ];
    };
    const transformed = contourPoints.map((current, index) => {
      const previous = contourPoints[(index + contourPoints.length - 1) % contourPoints.length];
      const next = contourPoints[(index + 1) % contourPoints.length];
      const offset = offsetPoint(previous, current, next);
      return [(offset[0] - minX + padding) * cell, (offset[1] - minY + padding) * cell];
    });
    const contour = transformed.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`);
    contours.push(`${contour.join(" ")} Z`);
  });
  return contours.join(" ");
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
    const topY = structureTopY(structure, footprint, renderAsset);
    const visualTopY = structureVisualTopY(structure, footprint, renderAsset);
    return {
      structure,
      index,
      spriteIndex: spriteIndexFor(structure),
      lightColor: lightColorFor(structure),
      customShape,
      shape,
      rawShape: catalogEntry?.rawShape,
      footprint,
      topY,
      visualTopY,
      z: catalogEntry?.z ?? 0.5,
      bounds: {
        minX: structure.x,
        minY: topY,
        maxX: structure.x + footprint.width - 1,
        maxY: topY + footprint.height - 1,
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
