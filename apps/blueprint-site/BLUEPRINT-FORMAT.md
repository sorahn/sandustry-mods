# Supported blueprint formats

The renderer and shared `@sandustry/blueprint-core` package accept the current
v2 blueprint prefixes:

- `SAND:BP:v2:` contains base64-encoded binary data.
- `SAND:BP:v2t:` contains the same binary data as comma-separated byte values.

The first binary byte is the internal format version. The current decoder
accepts versions 2, 3, and 4. Version 4 may include signal links after the
structure records; versions 2 and 3 do not have that section.

The binary payload contains, in order:

1. Blueprint name.
2. A dictionary of up to 64 numeric native IDs or string mod IDs.
3. Structure records containing dictionary index, coordinates, optional filter,
   and optional arbitrary JSON data.
4. For version 4, signal links containing source and target coordinates and an
   enabled flag.

Unknown numeric and string IDs are valid and must survive decode/re-encode.
The normalized model is:

```ts
type Blueprint = {
  name: string;
  data: Array<{
    type: string | number;
    x: number;
    y: number;
    filter?: Record<string, unknown>;
    data?: unknown;
  }>;
  signalLinks: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    on: boolean;
  }> | null;
};
```

Legacy `SAND:BACKUP:v1:` strings are not renderer input. The browser conversion
tool supports them through a separate compatibility adapter and can explicitly
encode normalized JSON back to v1. The older `SAND:BP:v1:` spelling is accepted
as a decode-only alias. Worker and Discord renderer integrations must reject v1
rather than silently converting it.

Malformed or truncated payloads, invalid base64, invalid text bytes, unknown
prefixes, unsupported binary versions, invalid type indexes, and invalid JSON
fields are reported as decode errors.
