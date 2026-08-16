import {
  decodeBlueprint as decodeV2Blueprint,
  emptyBlueprint,
  encodeBlueprint as encodeV2Blueprint,
  type Blueprint,
  type BlueprintStructure,
  type BlueprintType,
  type SignalLink,
} from "@sandustry/blueprint-core";

export type { Blueprint, BlueprintStructure, BlueprintType, SignalLink };
export { emptyBlueprint };

const LEGACY_PREFIX = "SAND:BACKUP:v1:";
const LEGACY_ALIASES = [LEGACY_PREFIX, "SAND:BP:v1:"];

function encodeLegacyBlueprint(blueprint: Blueprint) {
  const json = JSON.stringify({ n: blueprint.name, d: blueprint.data });
  const binary = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return LEGACY_PREFIX + btoa(binary);
}

function decodeLegacyBlueprint(value: string): Blueprint {
  const prefix = LEGACY_ALIASES.find((candidate) => value.startsWith(candidate));
  if (!prefix) throw new Error("Unsupported legacy blueprint prefix");
  const binary = atob(value.slice(prefix.length));
  const encoded = Array.from(
    binary,
    (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
  ).join("");
  const legacy = JSON.parse(decodeURIComponent(encoded)) as {
    n?: string;
    d?: BlueprintStructure[];
  };
  if (!Array.isArray(legacy.d)) throw new Error("Invalid v1 blueprint structure data");
  return { name: legacy.n || "Imported blueprint", data: legacy.d, signalLinks: null };
}

export function encodeBlueprint(
  blueprint: Blueprint,
  format: "binary" | "text" | "legacy" = "binary",
) {
  return format === "legacy"
    ? encodeLegacyBlueprint(blueprint)
    : encodeV2Blueprint(blueprint, format);
}

export function decodeBlueprint(input: string): Blueprint {
  const value = input.trim();
  return LEGACY_ALIASES.some((prefix) => value.startsWith(prefix))
    ? decodeLegacyBlueprint(value)
    : decodeV2Blueprint(value);
}
