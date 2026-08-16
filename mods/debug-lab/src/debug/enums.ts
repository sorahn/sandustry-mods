import { DebugContext, UnknownRecord, logCopyable } from "./common";

export function dumpEnums(context: DebugContext): void {
  const enums = (context.sandkit as unknown as UnknownRecord).enums;
  const summary =
    enums && typeof enums === "object"
      ? Object.fromEntries(
          Object.entries(enums as UnknownRecord).map(([key, value]) => [
            key,
            value && typeof value === "object" ? Object.keys(value) : typeof value,
          ]),
        )
      : { available: false };

  console.group("[Sandustry Debug Lab] runtime enums");
  console.log("enum object", enums);
  console.log("enum summary", summary);
  logCopyable("ENUMS", summary);
  console.groupEnd();
}
