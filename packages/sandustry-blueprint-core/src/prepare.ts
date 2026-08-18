import type { Blueprint, BlueprintStructure, BlueprintType, SignalLink } from "./index";

export type BlueprintCoordinate = { x: number; y: number };

export type SignalPoint = BlueprintCoordinate;

export type SignalPoints = {
  input?: SignalPoint;
  output?: SignalPoint;
  shared?: SignalPoint;
};

export type SignalPointResolver = (type: BlueprintType) => SignalPoints | undefined;

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

export type PreparedBlueprint = Blueprint & {
  signalCoordinateOffset: BlueprintCoordinate;
  preparedSignalLinks: PreparedSignalLink[];
};

export type PrepareBlueprintOptions = {
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
  const resolveSignalPoints = options.resolveSignalPoints ?? defaultSignalPoints;
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
  return { ...blueprint, signalCoordinateOffset, preparedSignalLinks };
}
