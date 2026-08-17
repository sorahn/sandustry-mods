import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Button, Checkbox, Panel, Select, TextArea } from "@sandustry/ui/react";
import {
  decodeBlueprint,
  emptyBlueprint,
  encodeBlueprint,
  type Blueprint,
} from "../utils/blueprint";
import { catalogEntry, catalogRender, catalogRenderSize } from "../utils/catalog";
import { debugComponent } from "../components/DebugComponentWrapper";
import { catalogVisualFixture } from "../visual-fixtures/catalog";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
            SANDUSTRY / BLUEPRINT TOOLS
          </Link>
          <nav className="flex gap-4 font-mono text-xs text-slate-400">
            <Link to="/" activeProps={{ className: "text-yellow-300" }}>
              Home
            </Link>
            {debugComponent(Link, {
              to: "/inspect",
              activeProps: { className: "text-yellow-300" },
              children: "Inspect",
            })}
            <Link to="/codec" activeProps={{ className: "text-yellow-300" }}>
              Encode / Decode
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function HomePage() {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-2xl p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-yellow-300/80">
          Sandustry blueprint tools
        </p>
        <h1 className="text-3xl font-bold text-white">Read and convert your blueprints.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          Paste a Sandustry blueprint string to inspect its contents, or turn readable JSON back
          into a string. Everything runs locally in your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/codec" className="sd-button sd-button--accent">
            Open the codec
          </Link>
        </div>
        <div className="mt-8 grid gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:grid-cols-3">
          <span>
            <strong className="text-slate-300">In the browser.</strong>
            <br />
            No upload or account required.
          </span>
          <span>
            <strong className="text-slate-300">Readable data.</strong>
            <br />
            View structures, filters, and links as JSON.
          </span>
          <span>
            <strong className="text-slate-300">Current formats.</strong>
            <br />
            Supports v2 binary, v2 text, and v1 strings.
          </span>
        </div>
      </Panel>
    </section>
  );
}

export function BlueprintCodecPage() {
  const [encoded, setEncoded] = useState("");
  const [json, setJson] = useState(JSON.stringify(emptyBlueprint, null, 2));
  const [message, setMessage] = useState("Paste a blueprint string or edit the normalized JSON.");
  const [format, setFormat] = useState<"binary" | "text" | "legacy">("binary");
  const decode = () => {
    try {
      const value = decodeBlueprint(encoded);
      setJson(JSON.stringify(value, null, 2));
      setMessage(`Decoded ${value.data.length} structure(s) from ${value.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to decode blueprint.");
    }
  };
  const encode = () => {
    try {
      const value = JSON.parse(json) as Blueprint;
      setEncoded(encodeBlueprint(value, format));
      setMessage(
        format === "legacy"
          ? `Encoded ${value.data.length} structure(s) as legacy v1. Legacy v1 is for browser conversion only.`
          : `Encoded ${value.data.length} structure(s) as ${format === "binary" ? "v2 binary" : "v2 text"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to encode JSON.");
    }
  };
  return (
    <section className="space-y-6">
      <div>
        <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Blueprint encode / decode</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Convert locally in your browser. Nothing is uploaded. The normalized JSON preserves
          structure IDs, filters, arbitrary structure data, and v4 signal links.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Blueprint string">
          <div className="space-y-4 p-4">
            <TextArea
              value={encoded}
              onChange={(event) => setEncoded(event.target.value)}
              placeholder="SAND:BP:v2:..."
              spellCheck={false}
              className="placeholder:text-slate-600"
            />
            <div className="flex flex-wrap gap-3">
              <Button accent onClick={decode}>
                Decode to JSON
              </Button>
              <Button onClick={() => navigator.clipboard?.writeText(encoded)}>Copy string</Button>
            </div>
          </div>
        </Panel>
        <Panel title="Normalized JSON">
          <div className="space-y-4 p-4">
            <TextArea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="font-mono text-xs text-slate-400">
                Format{" "}
                <Select
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as "binary" | "text" | "legacy")
                  }
                  className="ml-2"
                >
                  <option value="binary">v2 binary</option>
                  <option value="text">v2 text</option>
                  <option value="legacy">legacy v1 (conversion only)</option>
                </Select>
              </label>
              <Button accent onClick={encode}>
                Encode string
              </Button>
              <Button onClick={() => navigator.clipboard?.writeText(json)}>Copy JSON</Button>
            </div>
          </div>
        </Panel>
      </div>
      <p
        role="status"
        className="border-l-2 border-yellow-300/60 bg-black/40 px-3 py-2 font-mono text-xs text-slate-400"
      >
        {message}
      </p>
    </section>
  );
}

type BlueprintSummary = {
  format: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  types: number;
  numericTypes: number;
  stringTypes: number;
  filters: number;
  dataRecords: number;
  links: number;
};

function summarizeBlueprint(input: string, blueprint: Blueprint): BlueprintSummary {
  const xs = blueprint.data.length ? blueprint.data.map(({ x }) => x) : [0];
  const ys = blueprint.data.length ? blueprint.data.map(({ y }) => y) : [0];
  const types = new Set(blueprint.data.map(({ type }) => type));
  const numericTypes = [...types].filter((type) => typeof type === "number").length;
  return {
    format: input.trim().startsWith("SAND:BP:v2t:") ? "v2 text" : "v2 binary",
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    types: types.size,
    numericTypes,
    stringTypes: types.size - numericTypes,
    filters: blueprint.data.filter(({ filter }) => filter !== undefined).length,
    dataRecords: blueprint.data.filter(({ data }) => data !== undefined).length,
    links: blueprint.signalLinks?.length ?? 0,
  };
}

function structureLabel(type: Blueprint["data"][number]["type"]) {
  return typeof type === "number" ? `native ${type}` : type;
}

function wrapLabel(label: string, maxCharacters: number) {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (word.length > maxCharacters && !line) {
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [label];
}

function tileColor(type: Blueprint["data"][number]["type"]) {
  if (typeof type === "number") return "#314158";
  let hash = 0;
  for (const character of type) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return ["#4b3c62", "#315a5e", "#66522f", "#563d46"][Math.abs(hash) % 4];
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
    const [red, green, blue] = value as number[];
    const normalized = [red, green, blue].every((part) => part >= 0 && part <= 1);
    const channels = normalized
      ? [red, green, blue].map((part) => Math.round(part * 255))
      : [red, green, blue];
    return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
  }
  if (Array.isArray(value)) {
    for (const nestedValue of value) {
      const nested = colorValue(nestedValue);
      if (nested) return nested;
    }
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (
      [record.r, record.g, record.b].every(
        (part) => typeof part === "number" && part >= 0 && part <= 255,
      )
    ) {
      return colorValue([record.r, record.g, record.b]);
    }
    for (const key of ["color", "colour", "lightColor", "colorHex", "hex", "value"]) {
      const nested = colorValue(record[key]);
      if (nested) return nested;
    }
  }
  if (typeof value !== "string") return undefined;
  try {
    if (value.trim().startsWith("{")) return colorValue(JSON.parse(value));
  } catch {
    // Continue with CSS color parsing below.
  }
  return /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgba?\([^)]*\)$/i.test(value) ||
    /^hsla?\([^)]*\)$/i.test(value)
    ? value
    : undefined;
}

function lightColor(data: unknown): string | undefined {
  if (typeof data === "string" || Array.isArray(data)) return colorValue(data);
  if (typeof data !== "object" || data === null) return undefined;

  const record = data as Record<string, unknown>;
  for (const key of ["color", "colour", "lightColor", "colorHex", "hex"]) {
    const direct = colorValue(record[key]);
    if (direct) return direct;
  }
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase().includes("color")) {
      const direct = colorValue(value);
      if (direct) return direct;
    }
  }
  for (const key of ["data", "customData", "state", "properties", "config", "value"]) {
    const nested = lightColor(record[key]);
    if (nested) return nested;
  }
  return undefined;
}

const REMEMBER_BLUEPRINT_KEY = "sandustry.blueprintInspector.remember";
const SAVED_BLUEPRINT_KEY = "sandustry.blueprintInspector.string";
const SAVED_MAP_VIEW_KEY = "sandustry.blueprintInspector.mapView";
const SHOW_DEBUG_CELLS_KEY = "sandustry.blueprintInspector.showDebugCells";
const SHOW_NAMES_KEY = "sandustry.blueprintInspector.showNames";
const SHOW_GRID_KEY = "sandustry.blueprintInspector.showGrid";
const SHOW_MAP_SIDEBAR_KEY = "sandustry.blueprintInspector.showMapSidebar";
const SHOW_PNG_BACKGROUND_KEY = "sandustry.blueprintInspector.showPngBackground";
const MAP_ZOOM_LEVELS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4] as const;
const NATIVE_PIXELS_PER_CELL = 4;
const DISPLAY_PIXELS_PER_BLOCK_AT_100 = 32;
const KINETIC_PRESS_SCALE = 4;
const KINETIC_PRESS_EXPECTED_HEIGHT = 468;
const KINETIC_PRESS_ANCHOR_OFFSET_CELLS = 3;

function snapMapZoom(value: number) {
  return MAP_ZOOM_LEVELS.reduce((nearest, level) =>
    Math.abs(level - value) < Math.abs(nearest - value) ? level : nearest,
  );
}

function readLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const stored = readLocalValue(key);
  return stored === null ? fallback : stored !== "false";
}

function writeLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

function removeLocalValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

type MapView = {
  zoom: number;
  pan: { x: number; y: number };
};

function readStoredMapView(blueprintKey: string): MapView | null {
  if (typeof window === "undefined" || !blueprintKey) return null;
  const stored = readLocalValue(SAVED_MAP_VIEW_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as {
      blueprint?: unknown;
      zoom?: unknown;
      pan?: { x?: unknown; y?: unknown };
    };
    if (
      value.blueprint !== blueprintKey ||
      typeof value.zoom !== "number" ||
      !Number.isFinite(value.zoom) ||
      typeof value.pan?.x !== "number" ||
      typeof value.pan?.y !== "number" ||
      !Number.isFinite(value.pan.x) ||
      !Number.isFinite(value.pan.y)
    ) {
      return null;
    }
    return {
      zoom: Math.max(0.75, Math.min(4, value.zoom)),
      pan: { x: value.pan.x, y: value.pan.y },
    };
  } catch {
    return null;
  }
}

function structureTopY(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const height = structureFootprint(structure).height;
  return entry?.positionAnchor === "bottom" ? structure.y - height + 1 : structure.y;
}

type StructureShape = number[][];

function customStructureShape(structure: Blueprint["data"][number]): StructureShape | undefined {
  if (typeof structure.data !== "object" || structure.data === null) return undefined;
  const data = structure.data as Record<string, unknown>;
  const blueprint = data.__prefabulatorBlueprint;
  if (typeof blueprint !== "object" || blueprint === null) return undefined;
  const definition = (blueprint as Record<string, unknown>).definition;
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
  return shape.every((row) => row.length === width) ? (shape as StructureShape) : undefined;
}

function structureShape(structure: Blueprint["data"][number]): StructureShape | undefined {
  return (
    customStructureShape(structure) ??
    (() => {
      const shape = catalogEntry(structure.type)?.shape;
      return Array.isArray(shape) ? shape : undefined;
    })()
  );
}

function structureFootprint(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const shape = customStructureShape(structure);
  return shape
    ? { width: shape[0].length, height: shape.length }
    : (entry?.footprint ?? { width: 1, height: 1 });
}

function structureVisualTopY(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const topY = structureTopY(structure);
  const assetOffsetY = (entry?.assetOffset?.y ?? 0) / 4;
  if (entry?.assetScale !== "cell" || entry.positionAnchor !== "bottom") {
    return topY + assetOffsetY;
  }
  const frameHeight = entry.assetFrame?.width ?? 1;
  const sourceHeight = entry.assetSize?.height ?? frameHeight;
  const scale = structure.type === 20 ? KINETIC_PRESS_SCALE : 1;
  return (
    structure.y +
    1 -
    (sourceHeight / frameHeight) * scale +
    (structure.type === 20 ? KINETIC_PRESS_ANCHOR_OFFSET_CELLS : 0) +
    assetOffsetY
  );
}

function renderPixelScale(cell: number) {
  return cell / NATIVE_PIXELS_PER_CELL;
}

function foundationOutlinePath(
  structures: Blueprint["data"],
  minX: number,
  minY: number,
  padding: number,
  cell: number,
  cornerRadius: number,
) {
  const occupied = new Set<string>();
  for (const structure of structures) {
    const isNativeFoundation =
      typeof structure.type === "number" && structure.type >= 11 && structure.type <= 15;
    if (!isNativeFoundation && customStructureShape(structure) === undefined) {
      continue;
    }
    const shape = structureShape(structure) ?? [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ];
    const topY = structureTopY(structure);
    shape.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value !== 0) occupied.add(`${structure.x + columnIndex},${topY + rowIndex}`);
      });
    });
  }

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
      const next = outgoing.get(currentEdge.to.join(","))?.find((index) => !visited.has(index));
      if (next === undefined) break;
      currentIndex = next;
    }
    if (points.length > 1) points.pop();
    const transformed = points.map(([x, y]) => [
      (x - minX + padding) * cell,
      (y - minY + padding) * cell,
    ]);
    const rounded: string[] = [];
    transformed.forEach((current, index) => {
      const previous = transformed[(index + transformed.length - 1) % transformed.length];
      const next = transformed[(index + 1) % transformed.length];
      const previousLength = Math.hypot(current[0] - previous[0], current[1] - previous[1]);
      const nextLength = Math.hypot(next[0] - current[0], next[1] - current[1]);
      const radius = Math.min(cornerRadius, previousLength / 2, nextLength / 2);
      const entry = [
        current[0] + ((previous[0] - current[0]) / previousLength) * radius,
        current[1] + ((previous[1] - current[1]) / previousLength) * radius,
      ];
      const exit = [
        current[0] + ((next[0] - current[0]) / nextLength) * radius,
        current[1] + ((next[1] - current[1]) / nextLength) * radius,
      ];
      rounded.push(
        `${index === 0 ? `M ${entry[0]} ${entry[1]}` : `L ${entry[0]} ${entry[1]}`} Q ${current[0]} ${current[1]} ${exit[0]} ${exit[1]}`,
      );
    });
    contours.push(`${rounded.join(" ")} Z`);
  });
  return contours.join(" ");
}

type CollectorSprite = { frameIndex: number; rotation: number };

function collectorSprites(
  structures: Blueprint["data"],
  entries: Array<{ structure: Blueprint["data"][number]; index: number }>,
) {
  const collectors = entries.filter(({ structure }) => structure.type === 16);
  const byPosition = new Map(
    collectors.map(({ structure, index }) => [`${structure.x},${structure.y}`, index]),
  );
  const result = new Map<number, CollectorSprite>();
  const visited = new Set<number>();

  for (const { structure: start, index: startIndex } of collectors) {
    if (visited.has(startIndex)) continue;
    const component: number[] = [];
    const queue = [startIndex];
    visited.add(startIndex);
    while (queue.length) {
      const index = queue.shift()!;
      component.push(index);
      const structure = structures[index];
      for (const [dx, dy] of [
        [4, 0],
        [-4, 0],
        [0, 4],
        [0, -4],
      ]) {
        const neighbor = byPosition.get(`${structure.x + dx},${structure.y + dy}`);
        if (neighbor !== undefined && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const bounds = component.reduce(
      (value, index) => {
        const structure = structures[index];
        return {
          minX: Math.min(value.minX, structure.x),
          maxX: Math.max(value.maxX, structure.x),
          minY: Math.min(value.minY, structure.y),
          maxY: Math.max(value.maxY, structure.y),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    for (const index of component) {
      const structure = structures[index];
      const atLeft = structure.x === bounds.minX;
      const atRight = structure.x === bounds.maxX;
      const atTop = structure.y === bounds.minY;
      const atBottom = structure.y === bounds.maxY;
      let frameIndex = 2;
      let rotation = 0;
      if ((atTop || atBottom) && (atLeft || atRight)) {
        frameIndex = 0;
      } else if (atTop || atBottom) {
        frameIndex = 3;
      } else if (atLeft || atRight) {
        frameIndex = 3;
        rotation = 90;
      }
      result.set(index, { frameIndex, rotation });
    }
  }
  return result;
}

function BlueprintMap({
  blueprint,
  remember,
  blueprintKey,
  showSidebar,
  showGrid,
  showPngBackground,
}: {
  blueprint: Blueprint;
  remember: boolean;
  blueprintKey: string;
  showSidebar: boolean;
  showGrid: boolean;
  showPngBackground: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDebugCells, setShowDebugCells] = useState(() =>
    readStoredBoolean(SHOW_DEBUG_CELLS_KEY, false),
  );
  const [showNames, setShowNames] = useState(() => readStoredBoolean(SHOW_NAMES_KEY, false));
  const [zoom, setZoom] = useState(() => snapMapZoom(readStoredMapView(blueprintKey)?.zoom ?? 1));
  const [pan, setPan] = useState(() => readStoredMapView(blueprintKey)?.pan ?? { x: 0, y: 0 });
  const [mapSizeReady, setMapSizeReady] = useState(() => readStoredMapView(blueprintKey) !== null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const padding = 6;
  // Blueprint coordinates are cell-sized units. Four native sprite pixels
  // make one cell, and four cells make one blueprint block. At 100% four
  // blueprint coordinates therefore render at 32 display pixels.
  const cell = DISPLAY_PIXELS_PER_BLOCK_AT_100 / NATIVE_PIXELS_PER_CELL;
  const xs = blueprint.data.length
    ? blueprint.data.flatMap((structure) => {
        const entry = catalogEntry(structure.type);
        const width = structureFootprint(structure).width;
        const assetOffsetX = (entry?.assetOffset?.x ?? 0) / 4;
        return [structure.x + assetOffsetX, structure.x + width - 1 + assetOffsetX];
      })
    : [0];
  const ys = blueprint.data.length
    ? blueprint.data.flatMap((structure) => {
        const topY = structureTopY(structure);
        const visualTopY = structureVisualTopY(structure);
        const height = structureFootprint(structure).height;
        return [visualTopY, topY + height - 1];
      })
    : [0];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = (maxX - minX + padding * 2 + 1) * cell;
  const height = (maxY - minY + padding * 2 + 1) * cell;
  const viewWidth = zoom <= 1 ? width : width / zoom;
  const viewHeight = zoom <= 1 ? height : height / zoom;
  const centeredViewX = (width - viewWidth) / 2;
  const centeredViewY = (height - viewHeight) / 2;
  const maxPanX = zoom <= 1 ? 0 : Math.abs(centeredViewX);
  const maxPanY = zoom <= 1 ? 0 : Math.abs(centeredViewY);
  const viewX = centeredViewX + pan.x;
  const viewY = centeredViewY + pan.y;
  const gridOriginX = (padding - minX) * cell;
  const gridOriginY = (padding - minY) * cell;
  const point = (x: number, y: number) => ({
    x: (x - minX + padding + 0.5) * cell,
    y: (y - minY + padding + 0.5) * cell,
  });
  const selected = selectedIndex === null ? null : blueprint.data[selectedIndex];
  const renderStructures = blueprint.data
    .map((structure, index) => {
      const entry = catalogEntry(structure.type);
      const render = entry ? catalogRender(entry) : undefined;
      const z = typeof render?.z === "number" ? render.z : 0.5;
      return { structure, index, z };
    })
    .sort(
      (left, right) =>
        left.z - right.z ||
        left.structure.y - right.structure.y ||
        left.structure.x - right.structure.x ||
        left.index - right.index,
    );
  const collectorSpriteMap = collectorSprites(blueprint.data, renderStructures);
  const debugCellsToggle = debugComponent(Checkbox, {
    boxed: true,
    checked: showDebugCells,
    label: "debug cells",
    size: "small",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      setShowDebugCells(nextValue);
      writeLocalValue(SHOW_DEBUG_CELLS_KEY, String(nextValue));
    },
  });
  const debugNamesToggle = debugComponent(Checkbox, {
    boxed: true,
    checked: showNames,
    label: "show names",
    size: "small",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      setShowNames(nextValue);
      writeLocalValue(SHOW_NAMES_KEY, String(nextValue));
    },
  });
  useEffect(() => {
    const stored = remember ? readStoredMapView(blueprintKey) : null;
    const restoredZoom = snapMapZoom(stored?.zoom ?? 1);
    const restoredMaxPanX = restoredZoom <= 1 ? 0 : Math.abs((width - width / restoredZoom) / 2);
    const restoredMaxPanY = restoredZoom <= 1 ? 0 : Math.abs((height - height / restoredZoom) / 2);
    setZoom(restoredZoom);
    setPan({
      x: Math.max(-restoredMaxPanX, Math.min(restoredMaxPanX, stored?.pan.x ?? 0)),
      y: Math.max(-restoredMaxPanY, Math.min(restoredMaxPanY, stored?.pan.y ?? 0)),
    });
    setSelectedIndex(null);
    setMapSizeReady(stored !== null);
  }, [blueprint, blueprintKey, height, remember, width]);
  useEffect(() => {
    const stored = remember ? readStoredMapView(blueprintKey) : null;
    if (stored) return;
    setMapSizeReady(false);
    const fitToViewport = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const fitZoom = MAP_ZOOM_LEVELS.filter((level) => level <= 1)
        .reverse()
        .find((level) => width * level <= availableWidth && height * level <= availableHeight);
      setZoom(fitZoom ?? MAP_ZOOM_LEVELS[0]);
      setPan({ x: 0, y: 0 });
      setMapSizeReady(true);
    };
    const frame = requestAnimationFrame(fitToViewport);
    return () => cancelAnimationFrame(frame);
  }, [blueprintKey, height, remember, width]);
  useEffect(() => {
    if (!remember || !blueprintKey) return;
    writeLocalValue(SAVED_MAP_VIEW_KEY, JSON.stringify({ blueprint: blueprintKey, zoom, pan }));
  }, [blueprintKey, pan, remember, zoom]);
  const setMapZoom = (nextZoom: number) => {
    const snappedZoom = snapMapZoom(nextZoom);
    const nextViewWidth = width / snappedZoom;
    const nextViewHeight = height / snappedZoom;
    const nextCenteredViewX = (width - nextViewWidth) / 2;
    const nextCenteredViewY = (height - nextViewHeight) / 2;
    const nextMaxPanX = snappedZoom <= 1 ? 0 : Math.abs(nextCenteredViewX);
    const nextMaxPanY = snappedZoom <= 1 ? 0 : Math.abs(nextCenteredViewY);
    const centerX = viewX + viewWidth / 2;
    const centerY = viewY + viewHeight / 2;
    setZoom(snappedZoom);
    setPan({
      x: Math.max(
        -nextMaxPanX,
        Math.min(nextMaxPanX, centerX - nextViewWidth / 2 - nextCenteredViewX),
      ),
      y: Math.max(
        -nextMaxPanY,
        Math.min(nextMaxPanY, centerY - nextViewHeight / 2 - nextCenteredViewY),
      ),
    });
  };
  const exportPng = async () => {
    const source = svgRef.current;
    if (!source) return;
    const svg = source.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("xmlns:dc", "http://purl.org/dc/elements/1.1/");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const exportScale = 1 / renderPixelScale(cell);
    svg.setAttribute("width", String(width * exportScale));
    svg.setAttribute("height", String(height * exportScale));
    svg.removeAttribute("class");
    svg.removeAttribute("style");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = blueprint.name || "Sandustry blueprint";
    const description = document.createElementNS("http://www.w3.org/2000/svg", "desc");
    description.textContent = "Rendered Sandustry blueprint map";
    svg.prepend(description, title);
    if (!showPngBackground) {
      svg.querySelectorAll('rect[fill="#33a8ff"]').forEach((background) => background.remove());
    }
    await Promise.all(
      Array.from(svg.querySelectorAll("image")).map(async (image) => {
        const href = image.getAttribute("href") ?? image.getAttribute("xlink:href");
        if (!href || href.startsWith("data:")) return;
        try {
          const response = await fetch(new URL(href, document.baseURI));
          if (!response.ok) return;
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          image.setAttribute("href", dataUrl);
          image.removeAttribute("xlink:href");
        } catch {
          // Keep the original reference if an asset cannot be embedded.
        }
      }),
    );
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to render blueprint SVG"));
      image.src = svgUrl;
    });
    URL.revokeObjectURL(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * exportScale));
    canvas.height = Math.max(1, Math.round(height * exportScale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${blueprint.name.trim().replace(/[^a-z0-9._-]+/gi, "-") || "blueprint"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div
      className={
        showSidebar
          ? "grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"
          : "grid items-stretch"
      }
    >
      <div
        ref={viewportRef}
        className="blueprint-map__viewport relative min-h-[32rem] overflow-hidden rounded border border-slate-800 bg-[#33a8ff]"
        translate="no"
        style={
          mapSizeReady
            ? { height: `${Math.max(512, Math.ceil(height * Math.min(1, zoom)))}px` }
            : undefined
        }
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded border border-slate-700/80 bg-slate-950/60 p-2 font-mono text-xs text-slate-300 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            className="sd-button sd-button--compact sd-button--no-shift"
            onClick={exportPng}
          >
            Export PNG
          </button>
          <span className="mr-1">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="sd-button sd-button--compact sd-button--no-shift"
            onClick={() => {
              const index = MAP_ZOOM_LEVELS.indexOf(snapMapZoom(zoom));
              setMapZoom(MAP_ZOOM_LEVELS[Math.max(0, index - 1)]);
            }}
            disabled={zoom <= MAP_ZOOM_LEVELS[0]}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="sd-button sd-button--compact sd-button--no-shift"
            onClick={() => setMapZoom(1)}
            disabled={zoom === 1}
          >
            Fit
          </button>
          <button
            type="button"
            className="sd-button sd-button--compact sd-button--no-shift"
            onClick={() => {
              const index = MAP_ZOOM_LEVELS.indexOf(snapMapZoom(zoom));
              setMapZoom(MAP_ZOOM_LEVELS[Math.min(MAP_ZOOM_LEVELS.length - 1, index + 1)]);
            }}
            disabled={zoom >= MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1]}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={`${blueprint.name} structure map`}
          preserveAspectRatio="xMidYMid meet"
          className={
            zoom <= 1
              ? "blueprint-map__canvas absolute max-w-none"
              : "blueprint-map__canvas absolute inset-0 h-full w-full"
          }
          style={{
            ...(zoom <= 1
              ? {
                  width: `${width * zoom}px`,
                  height: `${height * zoom}px`,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }
              : {}),
            cursor: dragRef.current ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            dragRef.current = {
              pointerId: event.pointerId,
              lastX: event.clientX,
              lastY: event.clientY,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.lastX;
            const dy = event.clientY - drag.lastY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              drag.moved = true;
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }
            const rect = event.currentTarget.getBoundingClientRect();
            setPan((current) => ({
              x: Math.max(-maxPanX, Math.min(maxPanX, current.x - (dx / rect.width) * viewWidth)),
              y: Math.max(-maxPanY, Math.min(maxPanY, current.y - (dy / rect.height) * viewHeight)),
            }));
            drag.lastX = event.clientX;
            drag.lastY = event.clientY;
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            suppressClickRef.current = drag.moved;
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <defs>
            <pattern
              id="blueprint-block-grid"
              x={gridOriginX}
              y={gridOriginY}
              width={cell}
              height={cell}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${cell} 0 L 0 0 0 ${cell} M ${cell} 0 L ${cell} ${cell} M 0 ${cell} L ${cell} ${cell}`}
                fill="none"
                stroke="#718096"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="blueprint-cell-grid"
              x={gridOriginX}
              y={gridOriginY}
              width={cell * NATIVE_PIXELS_PER_CELL}
              height={cell * NATIVE_PIXELS_PER_CELL}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${cell * NATIVE_PIXELS_PER_CELL} 0 L 0 0 0 ${cell * NATIVE_PIXELS_PER_CELL} M ${cell * NATIVE_PIXELS_PER_CELL} 0 L ${cell * NATIVE_PIXELS_PER_CELL} ${cell * NATIVE_PIXELS_PER_CELL} M 0 ${cell * NATIVE_PIXELS_PER_CELL} L ${cell * NATIVE_PIXELS_PER_CELL} ${cell * NATIVE_PIXELS_PER_CELL}`}
                fill="none"
                stroke="#17202c"
                strokeWidth="1.25"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="#33a8ff" />
          {showGrid ? (
            <g opacity="0.25">
              <rect width={width} height={height} fill="url(#blueprint-block-grid)" />
              <rect width={width} height={height} fill="url(#blueprint-cell-grid)" />
            </g>
          ) : null}
          {(blueprint.signalLinks ?? []).map((link, index) => {
            const from = point(link.from.x, link.from.y);
            const to = point(link.to.x, link.to.y);
            return (
              <line
                key={`link-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={link.on ? "#ffe700" : "#657082"}
                strokeDasharray={link.on ? undefined : "5 4"}
                strokeWidth="3"
                opacity=".8"
              />
            );
          })}
          {renderStructures.map(({ structure, index }) => {
            const entry = catalogEntry(structure.type);
            const footprint = structureFootprint(structure);
            const shape = structureShape(structure);
            const isCustomShape = shape !== undefined;
            const position = point(structure.x, structure.y);
            const topY = structureTopY(structure);
            const left = (structure.x - minX + padding) * cell;
            const top = (topY - minY + padding) * cell;
            const tileWidth = footprint.width * cell;
            const tileHeight = footprint.height * cell;
            // Prefabulator blueprints carry their shape in data even for known
            // structures. Preserve a known catalog sprite and use the generic
            // block asset only for genuinely unknown custom structures.
            const assetEntry = isCustomShape && !entry?.assetPath ? catalogEntry(11) : entry;
            const labelX = left + tileWidth / 2;
            const label = String(
              entry?.name ??
                (typeof structure.type === "number" ? structure.type : structure.type.slice(0, 8)),
            );
            const labelFontSize = 36;
            const labelLineHeight = 42;
            const labelLines = wrapLabel(
              label,
              Math.max(3, Math.floor(tileWidth / (labelFontSize * 0.6))),
            );
            const labelY =
              top + tileHeight / 2 - ((labelLines.length - 1) * labelLineHeight) / 2 + 12;
            const isSelected = selectedIndex === index;
            return (
              <g
                key={`${index}-${structure.x}-${structure.y}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${structureLabel(structure.type)} at ${structure.x}, ${structure.y}`}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  setSelectedIndex(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedIndex(index);
                }}
                className="cursor-pointer"
                data-render-image={entry ? catalogRender(entry)?.imageName : undefined}
              >
                <rect
                  x={left}
                  y={top}
                  width={tileWidth}
                  height={tileHeight}
                  rx="5"
                  fill={
                    isCustomShape || (entry?.assetPath && !showDebugCells)
                      ? "transparent"
                      : tileColor(structure.type)
                  }
                  // Sprites own their visible shape. A generic footprint border
                  // leaks through the transparent corners of triangle foundations.
                  stroke={
                    isSelected ? "#ffe700" : isCustomShape || entry?.assetPath ? "none" : "#8491a3"
                  }
                  strokeWidth={isSelected ? "4" : "1.5"}
                />
                {isCustomShape
                  ? shape.map((row, rowIndex) =>
                      row.map((value, columnIndex) =>
                        value === 0 ? null : (
                          <rect
                            key={`custom-cell-${rowIndex}-${columnIndex}`}
                            x={left + columnIndex * cell}
                            y={top + rowIndex * cell}
                            width={cell}
                            height={cell}
                            rx="2"
                            fill="#a47a45"
                            stroke={showDebugCells ? (isSelected ? "#ffe700" : "#6e4c2c") : "none"}
                            strokeWidth={isSelected ? "2" : "1"}
                            pointerEvents="none"
                          />
                        ),
                      ),
                    )
                  : null}
                {assetEntry?.assetPath
                  ? (() => {
                      const assetEntry =
                        isCustomShape && !entry?.assetPath ? catalogEntry(11)! : entry!;
                      const frame = assetEntry.assetFrame;
                      const source = assetEntry.assetSize;
                      const sourceWidth = source?.width ?? frame?.width ?? 1;
                      const sourceHeight = source?.height ?? frame?.height ?? 1;
                      const runtimeRender = catalogRender(assetEntry);
                      const runtimeSize = runtimeRender
                        ? catalogRenderSize(runtimeRender)
                        : undefined;
                      const frameWidth = frame?.width ?? runtimeSize?.width ?? sourceWidth;
                      const frameHeight = frame?.height ?? runtimeSize?.height ?? sourceHeight;
                      const assetScaleFactor = assetEntry.assetScaleFactor ?? 1;
                      const collectorSprite = collectorSpriteMap.get(index);
                      const frameIndex =
                        collectorSprite?.frameIndex ?? assetEntry.assetFrameIndex ?? 0;
                      const spriteRotation = collectorSprite?.rotation ?? assetEntry.assetRotation;
                      const customLightColor =
                        structure.type === 26
                          ? (lightColor(structure) ??
                            lightColor(structure.data) ??
                            lightColor(structure.filter))
                          : undefined;
                      const useNativeAssetSize =
                        runtimeSize !== undefined ||
                        assetEntry.assetScaleFactor !== undefined ||
                        (frame !== undefined && assetEntry.assetScale !== "cell");
                      const needsFrameClip = assetEntry.assetClip ?? sourceWidth > frameWidth;
                      const pixelScale = renderPixelScale(cell);
                      const visualWidth = useNativeAssetSize
                        ? frameWidth * pixelScale * assetScaleFactor
                        : assetEntry.assetScale === "cell"
                          ? cell * (structure.type === 20 ? KINETIC_PRESS_SCALE : 1)
                          : tileWidth;
                      const visualHeight = useNativeAssetSize
                        ? frameHeight * pixelScale * assetScaleFactor
                        : frame
                          ? visualWidth * (sourceHeight / frameWidth)
                          : tileHeight;
                      const renderOffset = runtimeRender?.offset;
                      const offset =
                        renderOffset && typeof renderOffset === "object"
                          ? (renderOffset as { x?: unknown; y?: unknown })
                          : undefined;
                      const offsetX =
                        (typeof offset?.x === "number" ? offset.x : 0) +
                        (assetEntry.assetOffset?.x ?? 0);
                      const offsetY =
                        (typeof offset?.y === "number" ? offset.y : 0) +
                        (assetEntry.assetOffset?.y ?? 0);
                      const imageX = left + offsetX * pixelScale;
                      const sourceImageX = imageX - frameIndex * visualWidth;
                      const imageY =
                        assetEntry.positionAnchor === "bottom"
                          ? top +
                            tileHeight -
                            visualHeight +
                            (structure.type === 20 ? KINETIC_PRESS_ANCHOR_OFFSET_CELLS * cell : 0) +
                            offsetY * pixelScale
                          : top + offsetY * pixelScale;
                      return (
                        <>
                          {isCustomShape ? (
                            <defs>
                              <mask
                                id={`custom-shape-mask-${index}`}
                                maskUnits="userSpaceOnUse"
                                x={left}
                                y={top}
                                width={tileWidth}
                                height={tileHeight}
                              >
                                <rect
                                  x={left}
                                  y={top}
                                  width={tileWidth}
                                  height={tileHeight}
                                  fill="black"
                                />
                                {shape.map((row, rowIndex) =>
                                  row.map((value, columnIndex) =>
                                    value === 0 ? null : (
                                      <rect
                                        key={`custom-mask-cell-${rowIndex}-${columnIndex}`}
                                        x={left + columnIndex * cell}
                                        y={top + rowIndex * cell}
                                        width={cell}
                                        height={cell}
                                        fill="white"
                                      />
                                    ),
                                  ),
                                )}
                              </mask>
                            </defs>
                          ) : null}
                          <clipPath id={`asset-clip-${index}`}>
                            <rect x={imageX} y="0" width={visualWidth} height={height} />
                          </clipPath>
                          <image
                            href={`${import.meta.env.BASE_URL}${assetEntry.assetPath}`}
                            x={sourceImageX}
                            y={imageY}
                            width={visualWidth * (sourceWidth / frameWidth)}
                            height={visualHeight}
                            preserveAspectRatio="none"
                            clipPath={needsFrameClip ? `url(#asset-clip-${index})` : undefined}
                            mask={
                              isCustomShape && !entry?.assetPath
                                ? `url(#custom-shape-mask-${index})`
                                : undefined
                            }
                            transform={
                              spriteRotation
                                ? `rotate(${spriteRotation} ${left + tileWidth / 2} ${top + tileHeight / 2})`
                                : undefined
                            }
                            style={{ imageRendering: "pixelated", pointerEvents: "none" }}
                          />
                          {customLightColor
                            ? [4, 7, 10].map((bar) => (
                                <rect
                                  key={`light-color-${index}-${bar}`}
                                  x={imageX + visualWidth * (bar / 16)}
                                  y={imageY + visualHeight * 0.25}
                                  width={visualWidth * (2 / 16)}
                                  height={visualHeight * 0.5}
                                  fill={customLightColor}
                                  pointerEvents="none"
                                  transform={
                                    spriteRotation
                                      ? `rotate(${spriteRotation} ${left + tileWidth / 2} ${top + tileHeight / 2})`
                                      : undefined
                                  }
                                />
                              ))
                            : null}
                          {showDebugCells && structure.type === 20 ? (
                            <rect
                              x={imageX}
                              y={
                                top +
                                tileHeight +
                                KINETIC_PRESS_ANCHOR_OFFSET_CELLS * cell -
                                visualWidth * (KINETIC_PRESS_EXPECTED_HEIGHT / (frame?.width ?? 1))
                              }
                              width={visualWidth}
                              height={
                                visualWidth * (KINETIC_PRESS_EXPECTED_HEIGHT / (frame?.width ?? 1))
                              }
                              fill="none"
                              stroke="#00ff66"
                              strokeWidth="0.5"
                              vectorEffect="non-scaling-stroke"
                              pointerEvents="none"
                            />
                          ) : null}
                        </>
                      );
                    })()
                  : null}
                {showNames ? (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={labelFontSize}
                    fontWeight="700"
                    fontFamily="ui-monospace, monospace"
                  >
                    {labelLines.map((line, lineIndex) => (
                      <tspan
                        key={`${line}-${lineIndex}`}
                        x={labelX}
                        y={labelY + lineIndex * labelLineHeight}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : null}
              </g>
            );
          })}
          {foundationOutlinePath(
            blueprint.data,
            minX,
            minY,
            padding,
            cell,
            renderPixelScale(cell) / 2,
          ) ? (
            <path
              d={foundationOutlinePath(
                blueprint.data,
                minX,
                minY,
                padding,
                cell,
                renderPixelScale(cell) / 2,
              )}
              fill="none"
              stroke="#000000"
              strokeWidth={renderPixelScale(cell) / 2}
              pointerEvents="none"
            />
          ) : null}
        </svg>
      </div>
      {showSidebar ? (
        <aside className="flex flex-col border-l border-slate-800 pl-4 text-xs text-slate-400">
          <p className="font-mono uppercase tracking-[0.18em] text-slate-500">Selected record</p>
          {selected ? (
            <div className="mt-3 space-y-3">
              {(() => {
                const entry = catalogEntry(selected.type);
                const render = entry ? catalogRender(entry) : undefined;
                const renderSize = render ? catalogRenderSize(render) : undefined;
                return (
                  <>
                    <p className="break-all font-mono text-yellow-200">
                      {entry?.name ?? structureLabel(selected.type)}
                    </p>
                    {entry ? (
                      <>
                        <p>
                          Catalog footprint{" "}
                          <strong className="text-white">
                            {structureFootprint(selected).width}×
                            {structureFootprint(selected).height}
                          </strong>
                        </p>
                        {entry.category ? (
                          <p>
                            Category <strong className="text-white">{entry.category}</strong>
                          </p>
                        ) : null}
                        {entry.buildModes ? (
                          <p className="break-all">
                            Build modes {JSON.stringify(entry.buildModes)}
                          </p>
                        ) : null}
                        {entry.variants ? (
                          <p className="break-all">Variants {JSON.stringify(entry.variants)}</p>
                        ) : null}
                        {render?.imageName ? (
                          <p className="break-all">
                            Render asset <strong className="text-white">{render.imageName}</strong>
                            {renderSize ? ` · ${renderSize.width}×${renderSize.height}px` : ""}
                          </p>
                        ) : null}
                        <details className="rounded border border-slate-800 bg-black/30 p-2">
                          <summary className="cursor-pointer text-slate-300">
                            Runtime definition
                          </summary>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-slate-500">
                            {JSON.stringify(entry.definition ?? entry, null, 2)}
                          </pre>
                        </details>
                      </>
                    ) : null}
                    <p>
                      Position{" "}
                      <strong className="text-white">
                        {selected.x}, {selected.y}
                      </strong>
                    </p>
                    <p className="break-all whitespace-pre-wrap">
                      {selected.filter
                        ? `filter ${JSON.stringify(selected.filter, null, 2)}`
                        : "No filter"}
                    </p>
                    <p className="break-all whitespace-pre-wrap">
                      {selected.data !== undefined
                        ? `data ${JSON.stringify(selected.data, null, 2)}`
                        : "No structure data"}
                    </p>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="mt-3 leading-6">Choose a tile to inspect its raw blueprint record.</p>
          )}
          {debugCellsToggle || debugNamesToggle ? (
            <div className="mt-auto flex flex-col items-end gap-2 pt-4">
              {debugNamesToggle}
              {debugCellsToggle}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function BlueprintInspectorEditorPage() {
  const [remember, setRemember] = useState(
    () => typeof window !== "undefined" && readLocalValue(REMEMBER_BLUEPRINT_KEY) === "true",
  );
  const [encoded, setEncoded] = useState(() => {
    if (typeof window === "undefined" || readLocalValue(REMEMBER_BLUEPRINT_KEY) !== "true") {
      return "";
    }
    return readLocalValue(SAVED_BLUEPRINT_KEY) ?? "";
  });
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [showMapSidebar, setShowMapSidebar] = useState(() =>
    readStoredBoolean(SHOW_MAP_SIDEBAR_KEY, false),
  );
  const [showGrid, setShowGrid] = useState(() => readStoredBoolean(SHOW_GRID_KEY, true));
  const [showPngBackground, setShowPngBackground] = useState(() =>
    readStoredBoolean(SHOW_PNG_BACKGROUND_KEY, false),
  );
  const [inspectedBlueprintKey, setInspectedBlueprintKey] = useState("");
  const [summary, setSummary] = useState<BlueprintSummary | null>(null);
  const [message, setMessage] = useState("Paste a v2 blueprint string to inspect it.");
  const inspect = () => {
    const value = encoded.trim();
    if (value.startsWith("SAND:BP:v1:") || value.startsWith("SAND:BACKUP:v1:")) {
      setBlueprint(null);
      setSummary(null);
      setMessage(
        "Legacy v1 strings are available in the codec, but are not supported by the renderer inspector.",
      );
      return;
    }
    try {
      const decoded = decodeBlueprint(value);
      setBlueprint(decoded);
      setInspectedBlueprintKey(value);
      setSummary(summarizeBlueprint(value, decoded));
      setMessage(`Inspected ${decoded.data.length} structure(s) from ${decoded.name}.`);
    } catch (error) {
      setBlueprint(null);
      setSummary(null);
      setMessage(error instanceof Error ? error.message : "Unable to inspect blueprint.");
    }
  };
  useEffect(() => {
    if (remember && encoded.trim()) inspect();
    // The initial remembered value should be inspected once after the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rememberHeader = debugComponent(Checkbox, {
    boxed: true,
    checked: remember,
    label: "remember",
    size: "small",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextRemember = event.target.checked;
      setRemember(nextRemember);
      writeLocalValue(REMEMBER_BLUEPRINT_KEY, String(nextRemember));
      if (nextRemember) writeLocalValue(SAVED_BLUEPRINT_KEY, encoded);
      else {
        removeLocalValue(SAVED_BLUEPRINT_KEY);
        removeLocalValue(SAVED_MAP_VIEW_KEY);
      }
    },
  });
  return (
    <section className="space-y-6">
      <div>
        <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Blueprint inspector</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Inspect the decoded v2 records with a catalog-independent map. Unknown IDs remain visible
          instead of being discarded, and can be selected for their raw details.
        </p>
      </div>
      <Panel title="Blueprint string" header={rememberHeader}>
        <div className="space-y-4 p-4">
          <TextArea
            value={encoded}
            onChange={(event) => {
              const value = event.target.value;
              setEncoded(value);
              if (remember) writeLocalValue(SAVED_BLUEPRINT_KEY, value);
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                inspect();
              }
            }}
            placeholder="SAND:BP:v2:..."
            spellCheck={false}
            className="min-h-48 placeholder:text-slate-600"
          />
          <Button onClick={inspect}>Inspect blueprint</Button>
        </div>
      </Panel>
      <p
        role="status"
        className="border-l-2 border-yellow-300/60 bg-black/40 px-3 py-2 font-mono text-xs text-slate-400"
      >
        {message}
      </p>
      {blueprint && summary ? (
        <>
          <Panel title={`${blueprint.name} · ${summary.format}`}>
            <div className="grid gap-3 p-4 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <span>
                Structures <strong className="text-white">{blueprint.data.length}</strong>
              </span>
              <span>
                Types <strong className="text-white">{summary.types}</strong> (
                {summary.numericTypes} native / {summary.stringTypes} string)
              </span>
              <span>
                Bounds{" "}
                <strong className="text-white">
                  {summary.minX},{summary.minY}
                </strong>{" "}
                →{" "}
                <strong className="text-white">
                  {summary.maxX},{summary.maxY}
                </strong>
              </span>
              <span>
                Links <strong className="text-white">{summary.links}</strong> · Filters{" "}
                <strong className="text-white">{summary.filters}</strong> · Data{" "}
                <strong className="text-white">{summary.dataRecords}</strong>
              </span>
            </div>
          </Panel>
          <Panel
            title="Blueprint map"
            header={
              <div className="flex gap-2">
                <button
                  type="button"
                  className="sd-button sd-button--compact sd-button--no-shift"
                  onClick={() =>
                    setShowGrid((visible) => {
                      const nextValue = !visible;
                      writeLocalValue(SHOW_GRID_KEY, String(nextValue));
                      return nextValue;
                    })
                  }
                  aria-pressed={showGrid}
                >
                  {showGrid ? "Hide grid" : "Show grid"}
                </button>
                <button
                  type="button"
                  className="sd-button sd-button--compact sd-button--no-shift"
                  onClick={() =>
                    setShowPngBackground((visible) => {
                      const nextValue = !visible;
                      writeLocalValue(SHOW_PNG_BACKGROUND_KEY, String(nextValue));
                      return nextValue;
                    })
                  }
                  aria-pressed={showPngBackground}
                >
                  {showPngBackground ? "PNG: blue" : "PNG: transparent"}
                </button>
                <button
                  type="button"
                  className="sd-button sd-button--compact sd-button--no-shift"
                  onClick={() => {
                    setShowMapSidebar((visible) => {
                      const nextValue = !visible;
                      writeLocalValue(SHOW_MAP_SIDEBAR_KEY, String(nextValue));
                      return nextValue;
                    });
                  }}
                  aria-expanded={showMapSidebar}
                >
                  {showMapSidebar ? "Hide sidebar" : "Show sidebar"}
                </button>
              </div>
            }
          >
            <div className="p-4">
              <BlueprintMap
                blueprint={blueprint}
                remember={remember}
                blueprintKey={inspectedBlueprintKey}
                showSidebar={showMapSidebar}
                showGrid={showGrid}
                showPngBackground={showPngBackground}
              />
              <p className="mt-4 text-xs text-slate-500">
                The captured native runtime catalog supplies names and footprints. Other content
                remains visible through the unknown-ID fallback.
              </p>
            </div>
          </Panel>
          <Panel title="Structures" collapsible defaultCollapsed>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left font-mono text-xs">
                <thead className="border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">type</th>
                    <th className="px-4 py-3">position</th>
                    <th className="px-4 py-3">details</th>
                  </tr>
                </thead>
                <tbody>
                  {blueprint.data.map((structure, index) => (
                    <tr
                      key={`${index}-${structure.x}-${structure.y}`}
                      className="border-b border-slate-900 align-top text-slate-300"
                    >
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 break-all text-yellow-200">
                        {structureLabel(structure.type)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {structure.x}, {structure.y}
                      </td>
                      <td className="max-w-xl whitespace-pre-wrap break-all px-4 py-3 text-slate-500">
                        {structure.filter ? `filter ${JSON.stringify(structure.filter)}` : ""}
                        {structure.filter && structure.data !== undefined ? " · " : ""}
                        {structure.data !== undefined
                          ? `data ${JSON.stringify(structure.data)}`
                          : ""}
                        {structure.filter === undefined && structure.data === undefined ? "—" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </section>
  );
}

export function BlueprintInspectorPage() {
  const visualParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const visualFixture = visualParams?.get("visualFixture");
  const visualBlueprintInput = visualParams?.get("visualBlueprint");
  let visualBlueprint = visualFixture === "catalog" ? catalogVisualFixture : null;
  if (visualBlueprintInput) {
    try {
      visualBlueprint = decodeBlueprint(visualBlueprintInput);
    } catch (error) {
      return (
        <pre className="blueprint-visual-test-error">
          {error instanceof Error ? error.message : "Unable to decode visual blueprint."}
        </pre>
      );
    }
  }
  if (visualBlueprint) {
    return (
      <div className="blueprint-visual-test">
        <BlueprintMap
          blueprint={visualBlueprint}
          remember={false}
          blueprintKey={`visual-${visualBlueprint.name}`}
          showSidebar={false}
          showGrid={true}
          showPngBackground={true}
        />
      </div>
    );
  }
  return <BlueprintInspectorEditorPage />;
}
