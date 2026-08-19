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

export {
  defaultSignalPoints,
  prepareBlueprint,
  type BlueprintCatalog,
  type PreparedStructure,
  type BlueprintCoordinate,
  type PreparedBlueprint,
  type PreparedSignalLink,
  type PreparedSprite,
  type PrepareBlueprintOptions,
  type SignalPoint,
  type SignalPoints,
  type SignalPointResolver,
  type StructureCatalogEntry,
  type RenderAsset,
  customShapeFromStructure,
  shapeForStructure,
} from "./prepare";
export {
  catalogRender,
  catalogRenderSize,
  type CatalogEntry,
  type CatalogRenderAsset,
  type RenderMetadata,
} from "./catalog";

const BINARY_PREFIX = "SAND:BP:v2:";
const TEXT_PREFIX = "SAND:BP:v2t:";
const LEGACY_PREFIX = "SAND:BP:v1:";
const LEGACY_BACKUP_PREFIX = "SAND:BACKUP:v1:";

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

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(bytes: Uint8Array) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    result += BASE64_ALPHABET[a >> 2];
    result += BASE64_ALPHABET[((a & 3) << 4) | (b >> 4)];
    result += index + 1 < bytes.length ? BASE64_ALPHABET[((b & 15) << 2) | (c >> 6)] : "=";
    result += index + 2 < bytes.length ? BASE64_ALPHABET[c & 63] : "=";
  }
  return result;
}

function fromBase64(value: string) {
  const clean = value.replace(/\s/g, "");
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean))
    throw new Error("Invalid base64 blueprint data");
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const a = BASE64_ALPHABET.indexOf(clean[index]);
    const b = BASE64_ALPHABET.indexOf(clean[index + 1]);
    const c = clean[index + 2] === "=" ? 0 : BASE64_ALPHABET.indexOf(clean[index + 2]);
    const d = clean[index + 3] === "=" ? 0 : BASE64_ALPHABET.indexOf(clean[index + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error("Invalid base64 blueprint data");
    output.push((a << 2) | (b >> 4));
    if (clean[index + 2] !== "=") output.push(((b & 15) << 4) | (c >> 2));
    if (clean[index + 3] !== "=") output.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(output);
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
  if (types.length > 64) {
    throw new Error("v2 blueprint encoding cannot represent more than 64 structure types");
  }
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
  for (let index = 0; index < typeCount; index++) {
    const kind = bytes[cursor.value++];
    if (kind !== 0 && kind !== 1) throw new Error("Invalid structure type kind");
    types.push(kind === 1 ? readString(bytes, cursor) : readVarInt(bytes, cursor));
  }
  const count = readVarInt(bytes, cursor);
  const data: BlueprintStructure[] = [];
  for (let index = 0; index < count; index++) {
    const flags = bytes[cursor.value++];
    const type = types[flags & 63];
    if (type === undefined) throw new Error("Invalid structure type index");
    const structure: BlueprintStructure = {
      type,
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
  if (value.startsWith(TEXT_PREFIX)) {
    const values = value.slice(TEXT_PREFIX.length).replace(/\s/g, "").split(",").map(Number);
    if (values.some((number) => !Number.isInteger(number) || number < 0 || number > 255))
      throw new Error("Invalid v2 text blueprint data");
    return decodeBytes(Uint8Array.from(values));
  }
  if (value.startsWith(LEGACY_PREFIX) || value.startsWith(LEGACY_BACKUP_PREFIX))
    throw new Error("Legacy v1 blueprint strings are not supported");
  throw new Error("Unsupported blueprint prefix. Expected SAND:BP:v2: or SAND:BP:v2t:");
}

export const emptyBlueprint: Blueprint = {
  name: "Untitled blueprint",
  data: [],
  signalLinks: null,
};
