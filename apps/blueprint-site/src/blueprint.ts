export type BlueprintType = string | number;

export type SignalLink = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  on: boolean;
};

export type BlueprintStructure = {
  type: BlueprintType;
  x: number;
  y: number;
  filter?: Record<string, unknown>;
  data?: unknown;
};

export type Blueprint = {
  name: string;
  data: BlueprintStructure[];
  signalLinks: SignalLink[] | null;
};

const BINARY_PREFIX = "SAND:BP:v2:";
const TEXT_PREFIX = "SAND:BP:v2t:";
const LEGACY_PREFIX = "SAND:BP:v1:";

function writeVarInt(value: number, output: number[]) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Expected a non-negative integer, got ${value}`);
  do {
    const byte = value % 128;
    value = Math.floor(value / 128);
    output.push(byte | (value ? 128 : 0));
  } while (value);
}

function readVarInt(bytes: Uint8Array, cursor: { value: number }) {
  let result = 0;
  let shift = 0;
  while (true) {
    if (cursor.value >= bytes.length || shift > 49) throw new Error("Invalid or truncated varint");
    const byte = bytes[cursor.value++];
    result += (byte & 127) * 2 ** shift;
    if (!(byte & 128)) return result;
    shift += 7;
  }
}

function writeString(value: string, output: number[]) {
  const bytes = new TextEncoder().encode(value);
  writeVarInt(bytes.length, output);
  output.push(...bytes);
}

function readString(bytes: Uint8Array, cursor: { value: number }) {
  const length = readVarInt(bytes, cursor);
  const end = cursor.value + length;
  if (end > bytes.length) throw new Error("Invalid or truncated string");
  const value = new TextDecoder().decode(bytes.subarray(cursor.value, end));
  cursor.value = end;
  return value;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBytes(blueprint: Blueprint) {
  const output: number[] = [4];
  writeString(blueprint.name, output);
  const types: BlueprintType[] = [];
  const indexes = new Map<BlueprintType, number>();
  for (const structure of blueprint.data)
    if (!indexes.has(structure.type)) {
      indexes.set(structure.type, types.length);
      types.push(structure.type);
    }
  if (types.length > 64) throw new Error("A blueprint cannot contain more than 64 structure types");
  writeVarInt(types.length, output);
  for (const type of types) {
    if (typeof type === "string") {
      output.push(1);
      writeString(type, output);
    } else {
      output.push(0);
      writeVarInt(type, output);
    }
  }
  writeVarInt(blueprint.data.length, output);
  for (const structure of blueprint.data) {
    const index = indexes.get(structure.type)!;
    let flags = index;
    if (structure.filter) flags |= 64;
    if (structure.data !== undefined) flags |= 128;
    output.push(flags);
    writeVarInt(structure.x, output);
    writeVarInt(structure.y, output);
    if (structure.filter) {
      const filter = structure.filter;
      const compact =
        !Array.isArray(filter.elementType) &&
        Number.isInteger(filter.density) &&
        !filter.affectsLiquid &&
        !filter.affectsGas;
      let filterFlags = filter.mode === "block" ? 1 : 0;
      if (filter.density !== undefined) filterFlags |= 2;
      if (filter.elementType !== undefined) filterFlags |= 4;
      if (!compact) filterFlags |= 8;
      output.push(filterFlags);
      if (compact) {
        if (filter.density !== undefined) writeVarInt(Number(filter.density), output);
        if (filter.elementType !== undefined) writeVarInt(Number(filter.elementType), output);
      } else writeString(JSON.stringify(filter), output);
    }
    if (structure.data !== undefined) writeString(JSON.stringify(structure.data), output);
  }
  const links = blueprint.signalLinks || [];
  writeVarInt(links.length, output);
  for (const link of links) {
    writeVarInt(link.from.x, output);
    writeVarInt(link.from.y, output);
    writeVarInt(link.to.x, output);
    writeVarInt(link.to.y, output);
    output.push(link.on ? 1 : 0);
  }
  return new Uint8Array(output);
}

function decodeBytes(bytes: Uint8Array): Blueprint {
  const cursor = { value: 0 };
  const version = bytes[cursor.value++];
  if (![2, 3, 4].includes(version))
    throw new Error(`Unsupported blueprint binary version: ${version}`);
  const name = readString(bytes, cursor);
  const typeCount = readVarInt(bytes, cursor);
  const types: BlueprintType[] = [];
  for (let index = 0; index < typeCount; index++)
    types.push(bytes[cursor.value++] === 1 ? readString(bytes, cursor) : readVarInt(bytes, cursor));
  const count = readVarInt(bytes, cursor);
  const data: BlueprintStructure[] = [];
  for (let index = 0; index < count; index++) {
    const flags = bytes[cursor.value++];
    const structure: BlueprintStructure = {
      type: types[flags & 63],
      x: readVarInt(bytes, cursor),
      y: readVarInt(bytes, cursor),
    };
    if (flags & 64) {
      const filterFlags = bytes[cursor.value++];
      if (filterFlags & 8) structure.filter = JSON.parse(readString(bytes, cursor));
      else {
        structure.filter = { mode: filterFlags & 1 ? "block" : "allow" };
        if (filterFlags & 2) structure.filter.density = readVarInt(bytes, cursor);
        if (filterFlags & 4) structure.filter.elementType = readVarInt(bytes, cursor);
      }
    }
    if (flags & 128) structure.data = JSON.parse(readString(bytes, cursor));
    data.push(structure);
  }
  let signalLinks: SignalLink[] | null = null;
  if (version >= 4 && cursor.value < bytes.length) {
    const count = readVarInt(bytes, cursor);
    signalLinks = [];
    for (let index = 0; index < count; index++)
      signalLinks.push({
        from: { x: readVarInt(bytes, cursor), y: readVarInt(bytes, cursor) },
        to: { x: readVarInt(bytes, cursor), y: readVarInt(bytes, cursor) },
        on: bytes[cursor.value++] === 1,
      });
  }
  return { name, data, signalLinks };
}

export function encodeBlueprint(blueprint: Blueprint, format: "binary" | "text" = "binary") {
  const bytes = encodeBytes(blueprint);
  return format === "text" ? TEXT_PREFIX + [...bytes].join(",") : BINARY_PREFIX + toBase64(bytes);
}

export function decodeBlueprint(input: string): Blueprint {
  const value = input.trim();
  if (value.startsWith(BINARY_PREFIX))
    return decodeBytes(fromBase64(value.slice(BINARY_PREFIX.length)));
  if (value.startsWith(TEXT_PREFIX))
    return decodeBytes(
      Uint8Array.from(value.slice(TEXT_PREFIX.length).replace(/\s/g, "").split(",").map(Number)),
    );
  if (value.startsWith(LEGACY_PREFIX)) {
    const legacy = JSON.parse(decodeURIComponent(escape(atob(value.slice(LEGACY_PREFIX.length)))));
    return { name: legacy.n || "Imported blueprint", data: legacy.d, signalLinks: null };
  }
  throw new Error(
    "Unsupported blueprint prefix. Expected SAND:BP:v2:, SAND:BP:v2t:, or SAND:BP:v1:",
  );
}

export const emptyBlueprint: Blueprint = {
  name: "Untitled blueprint",
  data: [],
  signalLinks: null,
};
