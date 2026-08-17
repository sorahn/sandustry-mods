import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { type Blueprint } from "../utils/blueprint";
import {
  catalogEntry,
  catalogRender,
  catalogRenderSize,
  type CatalogEntry,
} from "../utils/catalog";
import { debugComponent } from "./DebugComponentWrapper";
import { MapDebugOptions } from "./MapDebugOptions";

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

const SAVED_MAP_VIEW_KEY = "sandustry.blueprintInspector.mapView";
const MAP_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4] as const;
const NATIVE_PIXELS_PER_CELL = 4;
const DISPLAY_PIXELS_PER_BLOCK_AT_100 = 32;
const BLOCK_COORDINATE_SIZE = NATIVE_PIXELS_PER_CELL;
const MAP_VIEWPORT_BORDER_SIZE = 2;
const MAP_VIEWPORT_ASPECT_WIDTH = 16;
const MAP_VIEWPORT_ASPECT_HEIGHT = 10;
const MAP_FIT_ZOOM_MIN = 0.25;
const MAP_FIT_ZOOM_MAX = 2;
const PAN_COMMIT_DEBOUNCE_MS = 80;
const MAP_LAYER_ORDER = [
  "background",
  "grid",
  "debugCells",
  "sprites",
  "foundationOutlines",
  "signalLinks",
  "selectedHighlight",
  "hoverHighlight",
] as const;

type MapLayer = (typeof MAP_LAYER_ORDER)[number];

function mapLayerStyle(layer: MapLayer) {
  return { zIndex: MAP_LAYER_ORDER.indexOf(layer) };
}

function snapMapZoom(value: number) {
  return MAP_ZOOM_LEVELS.reduce((nearest, level) =>
    Math.abs(level - value) < Math.abs(nearest - value) ? level : nearest,
  );
}

function viewportHeightForWidth(width: number) {
  return (
    width * (MAP_VIEWPORT_ASPECT_HEIGHT / MAP_VIEWPORT_ASPECT_WIDTH) + MAP_VIEWPORT_BORDER_SIZE
  );
}

function readLocalValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

type MapView = {
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth?: number;
  fit?: boolean;
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
      viewportWidth?: unknown;
      fit?: unknown;
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
      zoom: Math.max(MAP_ZOOM_LEVELS[0], Math.min(4, value.zoom)),
      pan: { x: value.pan.x, y: value.pan.y },
      viewportWidth:
        typeof value.viewportWidth === "number" && Number.isFinite(value.viewportWidth)
          ? value.viewportWidth
          : undefined,
      fit: typeof value.fit === "boolean" ? value.fit : undefined,
    };
  } catch {
    return null;
  }
}

function structureTopY(structure: Blueprint["data"][number]) {
  const entry = catalogEntry(structure.type);
  const height = structureFootprint(structure).height;
  const anchor = entry?.renderAsset?.anchor;
  const edge = typeof anchor === "string" ? anchor : anchor?.edge;
  return edge === "bottom" ? structure.y - height + 1 : structure.y;
}

function renderScaleMode(scale: NonNullable<CatalogEntry["renderAsset"]>["scale"]) {
  return typeof scale === "object" && scale !== null ? scale.mode : scale;
}

function renderScaleFactor(scale: NonNullable<CatalogEntry["renderAsset"]>["scale"]) {
  return typeof scale === "object" && scale !== null ? (scale.factor ?? 1) : 1;
}

function renderAnchorEdge(anchor: NonNullable<CatalogEntry["renderAsset"]>["anchor"]) {
  return typeof anchor === "object" && anchor !== null ? anchor.edge : anchor;
}

function renderAnchorOffsetCells(anchor: NonNullable<CatalogEntry["renderAsset"]>["anchor"]) {
  return typeof anchor === "object" && anchor !== null ? (anchor.offsetCells ?? 0) : 0;
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
  const renderAsset = entry?.renderAsset;
  const assetOffsetY = (renderAsset?.offset?.y ?? 0) / 4;
  if (
    renderScaleMode(renderAsset?.scale) !== "cell" ||
    renderAnchorEdge(renderAsset?.anchor) !== "bottom"
  ) {
    return topY + assetOffsetY;
  }
  if (!renderAsset) return topY + assetOffsetY;
  const frameHeight = renderAsset.frame?.width ?? 1;
  const sourceHeight =
    renderAsset.sourceCrop?.height ?? renderAsset.sourceSize?.height ?? frameHeight;
  const scale = renderScaleFactor(renderAsset.scale);
  return (
    structure.y +
    1 -
    (sourceHeight / frameHeight) * scale +
    renderAnchorOffsetCells(renderAsset.anchor) +
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
  const collectors = entries.filter(
    ({ structure }) =>
      catalogEntry(structure.type)?.renderAsset?.animation?.topology === "collector",
  );
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
      const animation = catalogEntry(structure.type)?.renderAsset?.animation;
      let frameIndex = animation?.interiorFrame ?? 2;
      let rotation = 0;
      if ((atTop || atBottom) && (atLeft || atRight)) {
        frameIndex = animation?.cornerFrame ?? 0;
      } else if (atTop || atBottom) {
        frameIndex = animation?.edgeFrame ?? 3;
      } else if (atLeft || atRight) {
        frameIndex = animation?.edgeFrame ?? 3;
        rotation = animation?.sideRotation ?? 90;
      }
      result.set(index, { frameIndex, rotation });
    }
  }
  return result;
}

export function BlueprintMap({
  blueprint,
  remember,
  blueprintKey,
  showSidebar,
  showGrid,
  showPngBackground,
  captureOnly,
}: {
  blueprint: Blueprint;
  remember: boolean;
  blueprintKey: string;
  showSidebar: boolean;
  showGrid: boolean;
  showPngBackground: boolean;
  captureOnly?: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDebugCells, setShowDebugCells] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [hideSprites, setHideSprites] = useState(false);
  const [showCustomShapes, setShowCustomShapes] = useState(false);
  const [hideFoundationOutlines, setHideFoundationOutlines] = useState(false);
  const [zoom, setZoom] = useState(() => snapMapZoom(readStoredMapView(blueprintKey)?.zoom ?? 1));
  const [pan, setPan] = useState(() => readStoredMapView(blueprintKey)?.pan ?? { x: 0, y: 0 });
  const [mapSizeReady, setMapSizeReady] = useState(() => readStoredMapView(blueprintKey) !== null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hoverMarkerRef = useRef<SVGRectElement>(null);
  const hoverBlockRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const panCommitTimerRef = useRef<number | null>(null);
  const livePanRef = useRef(pan);
  const fitModeRef = useRef(readStoredMapView(blueprintKey)?.fit ?? true);
  const padding = 6;
  // Blueprint coordinates are cell-sized units. Four native sprite pixels
  // make one cell, and four cells make one blueprint block. At 100% four
  // blueprint coordinates therefore render at 32 display pixels.
  const cell = DISPLAY_PIXELS_PER_BLOCK_AT_100 / NATIVE_PIXELS_PER_CELL;
  const xs = blueprint.data.length
    ? blueprint.data.flatMap((structure) => {
        const entry = catalogEntry(structure.type);
        const width = structureFootprint(structure).width;
        const assetOffsetX = (entry?.renderAsset?.offset?.x ?? 0) / 4;
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
  const blueprintWidth = (maxX - minX + 1) * cell;
  const blueprintHeight = (maxY - minY + 1) * cell;
  const viewportWidth = viewportSize.width || width;
  const defaultViewportHeight = viewportHeightForWidth(viewportWidth);
  const blueprintFitsDefaultViewport =
    blueprintWidth <= viewportWidth && blueprintHeight <= defaultViewportHeight;
  const blueprintAspectViewportHeight = viewportWidth * (height / width) + MAP_VIEWPORT_BORDER_SIZE;
  const aspectRatioViewportHeight = blueprintFitsDefaultViewport
    ? defaultViewportHeight
    : Math.max(defaultViewportHeight, blueprintAspectViewportHeight);
  const viewWidth = zoom <= 1 ? width : width / zoom;
  const viewHeight = zoom <= 1 ? height : height / zoom;
  const centeredViewX = (width - viewWidth) / 2;
  const centeredViewY = (height - viewHeight) / 2;
  const maxPanX = Math.max(0, (width * zoom - (viewportSize.width || width)) / (2 * zoom));
  const maxPanY = Math.max(0, (height * zoom - (viewportSize.height || height)) / (2 * zoom));
  const fitZoomForViewport = (availableWidth: number, availableHeight: number) => {
    const blueprintFits = blueprintWidth <= availableWidth && blueprintHeight <= availableHeight;
    if (blueprintFits) {
      // Keep the whole blueprint visible while using the zoom to trim the
      // generous renderer padding around small blueprints.
      const maxZoom = Math.min(MAP_FIT_ZOOM_MAX, width / blueprintWidth, height / blueprintHeight);
      return (
        MAP_ZOOM_LEVELS.filter(
          (level) => level >= MAP_FIT_ZOOM_MIN && level <= maxZoom,
        ).reverse()[0] ?? MAP_FIT_ZOOM_MIN
      );
    }
    return (
      MAP_ZOOM_LEVELS.filter((level) => level >= MAP_FIT_ZOOM_MIN && level <= 1)
        .reverse()
        .find((level) => width * level <= availableWidth) ?? MAP_FIT_ZOOM_MIN
    );
  };
  const measuredFitZoom = fitZoomForViewport(
    viewportSize.width || width,
    Math.max(viewportSize.height, 512, aspectRatioViewportHeight),
  );
  const applyLivePan = (nextPan: { x: number; y: number }) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.style.transform = `translate(-50%, -50%) translate(${-nextPan.x * zoom}px, ${-nextPan.y * zoom}px)`;
  };
  const schedulePanCommit = () => {
    if (panCommitTimerRef.current !== null) {
      window.clearTimeout(panCommitTimerRef.current);
    }
    panCommitTimerRef.current = window.setTimeout(() => {
      panCommitTimerRef.current = null;
      setPan(livePanRef.current);
    }, PAN_COMMIT_DEBOUNCE_MS);
  };
  const updateHoverBlock = (event: PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const transform = svg.getScreenCTM();
    if (!transform) return;
    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const local = pointer.matrixTransform(transform.inverse());
    const blueprintX = local.x / cell + minX - padding - 0.5;
    const blueprintY = local.y / cell + minY - padding - 0.5;
    const nextBlock = {
      x: Math.floor(blueprintX / BLOCK_COORDINATE_SIZE) * BLOCK_COORDINATE_SIZE,
      y: Math.floor(blueprintY / BLOCK_COORDINATE_SIZE) * BLOCK_COORDINATE_SIZE,
    };
    const previousBlock = hoverBlockRef.current;
    if (previousBlock?.x === nextBlock.x && previousBlock.y === nextBlock.y) return;
    hoverBlockRef.current = nextBlock;
    const marker = hoverMarkerRef.current;
    if (!marker) return;
    marker.setAttribute("x", String((nextBlock.x - minX + padding) * cell));
    marker.setAttribute("y", String((nextBlock.y - minY + padding) * cell));
    marker.setAttribute("visibility", "visible");
  };
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
  const debugOptions = debugComponent(MapDebugOptions, {
    showDebugCells,
    onShowDebugCellsChange: setShowDebugCells,
    showNames,
    onShowNamesChange: setShowNames,
    hideSprites,
    onHideSpritesChange: setHideSprites,
    showCustomShapes,
    onShowCustomShapesChange: setShowCustomShapes,
    hideFoundationOutlines,
    onHideFoundationOutlinesChange: setHideFoundationOutlines,
  });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = () => {
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const stored = remember ? readStoredMapView(blueprintKey) : null;
    fitModeRef.current = stored?.fit ?? true;
    const restoredZoom = snapMapZoom(stored?.zoom ?? 1);
    const restoredMaxPanX = Math.max(
      0,
      (width * restoredZoom - (viewportSize.width || width)) / (2 * restoredZoom),
    );
    const restoredMaxPanY = Math.max(
      0,
      (height * restoredZoom - (viewportSize.height || height)) / (2 * restoredZoom),
    );
    setZoom(restoredZoom);
    setPan({
      x: Math.max(-restoredMaxPanX, Math.min(restoredMaxPanX, stored?.pan.x ?? 0)),
      y: Math.max(-restoredMaxPanY, Math.min(restoredMaxPanY, stored?.pan.y ?? 0)),
    });
    setSelectedIndex(null);
    setMapSizeReady(stored?.viewportWidth === viewportSize.width && viewportSize.width > 0);
  }, [blueprint, blueprintKey, remember]);
  const fitToViewport = () => {
    fitModeRef.current = true;
    const availableWidth = viewportRef.current?.clientWidth || viewportSize.width;
    const availableHeight = Math.max(
      viewportRef.current?.clientHeight || 0,
      viewportSize.height,
      512,
      aspectRatioViewportHeight,
    );
    setZoom(fitZoomForViewport(availableWidth || width, availableHeight));
    setPan({ x: 0, y: 0 });
  };
  useLayoutEffect(() => {
    const stored = remember ? readStoredMapView(blueprintKey) : null;
    if (stored?.viewportWidth === viewportSize.width) return;
    if (!viewportSize.width || !viewportSize.height) return;
    if (!viewportRef.current) return;
    if (!fitModeRef.current) {
      setMapSizeReady(true);
      return;
    }
    fitToViewport();
    setMapSizeReady(true);
  }, [blueprintKey, remember, viewportSize.height, viewportSize.width, width]);
  useEffect(() => {
    if (!remember || !blueprintKey || !mapSizeReady) return;
    writeLocalValue(
      SAVED_MAP_VIEW_KEY,
      JSON.stringify({
        blueprint: blueprintKey,
        viewportWidth: viewportSize.width,
        fit: fitModeRef.current,
        zoom,
        pan,
      }),
    );
  }, [blueprintKey, mapSizeReady, pan, remember, viewportSize.width, zoom]);
  useEffect(() => {
    livePanRef.current = pan;
    return () => {
      if (panCommitTimerRef.current !== null) {
        window.clearTimeout(panCommitTimerRef.current);
      }
    };
  }, [pan]);
  const setMapZoom = (nextZoom: number) => {
    fitModeRef.current = false;
    const snappedZoom = snapMapZoom(nextZoom);
    const nextViewWidth = width / snappedZoom;
    const nextViewHeight = height / snappedZoom;
    const nextCenteredViewX = (width - nextViewWidth) / 2;
    const nextCenteredViewY = (height - nextViewHeight) / 2;
    const nextMaxPanX = Math.max(
      0,
      (width * snappedZoom - (viewportSize.width || width)) / (2 * snappedZoom),
    );
    const nextMaxPanY = Math.max(
      0,
      (height * snappedZoom - (viewportSize.height || height)) / (2 * snappedZoom),
    );
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
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
          captureOnly
            ? { width: `${Math.ceil(width)}px`, height: `${Math.ceil(height)}px` }
            : {
                height: `${Math.max(512, Math.ceil(aspectRatioViewportHeight))}px`,
              }
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
            onClick={fitToViewport}
            disabled={fitModeRef.current && zoom === measuredFitZoom && pan.x === 0 && pan.y === 0}
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
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${blueprint.name} structure map`}
          preserveAspectRatio="xMidYMid meet"
          className="blueprint-map__canvas absolute max-w-none"
          style={{
            width: `${width * zoom}px`,
            height: `${height * zoom}px`,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${-pan.x * zoom}px, ${-pan.y * zoom}px)`,
            cursor: dragRef.current ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (panCommitTimerRef.current !== null) {
              window.clearTimeout(panCommitTimerRef.current);
              panCommitTimerRef.current = null;
              setPan(livePanRef.current);
            } else {
              livePanRef.current = pan;
            }
            dragRef.current = {
              pointerId: event.pointerId,
              lastX: event.clientX,
              lastY: event.clientY,
              moved: false,
            };
            event.currentTarget.style.cursor = "grabbing";
          }}
          onPointerMove={(event) => {
            updateHoverBlock(event);
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.lastX;
            const dy = event.clientY - drag.lastY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              drag.moved = true;
              fitModeRef.current = false;
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const nextPan = {
              x: Math.max(
                -maxPanX,
                Math.min(maxPanX, livePanRef.current.x - (dx / rect.width) * width),
              ),
              y: Math.max(
                -maxPanY,
                Math.min(maxPanY, livePanRef.current.y - (dy / rect.height) * height),
              ),
            };
            livePanRef.current = nextPan;
            applyLivePan(nextPan);
            schedulePanCommit();
            drag.lastX = event.clientX;
            drag.lastY = event.clientY;
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            suppressClickRef.current = drag.moved;
            dragRef.current = null;
            event.currentTarget.style.cursor = "grab";
            if (drag.moved) schedulePanCommit();
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            dragRef.current = null;
            event.currentTarget.style.cursor = "grab";
            schedulePanCommit();
          }}
          onPointerLeave={() => {
            hoverBlockRef.current = null;
            hoverMarkerRef.current?.setAttribute("visibility", "hidden");
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
          <rect width={width} height={height} fill="#33a8ff" style={mapLayerStyle("background")} />
          {showGrid ? (
            <g opacity="0.25" style={mapLayerStyle("grid")}>
              <rect width={width} height={height} fill="url(#blueprint-block-grid)" />
              <rect width={width} height={height} fill="url(#blueprint-cell-grid)" />
            </g>
          ) : null}
          {showDebugCells ? (
            <g opacity="0.8" pointerEvents="none" style={mapLayerStyle("debugCells")}>
              {blueprint.data.flatMap((structure, structureIndex) => {
                const footprint = structureFootprint(structure);
                const shape =
                  structureShape(structure) ??
                  Array.from({ length: footprint.height }, () =>
                    Array.from({ length: footprint.width }, () => 1),
                  );
                const topY = structureTopY(structure);
                const left = (structure.x - minX + padding) * cell;
                const top = (topY - minY + padding) * cell;
                return shape.flatMap((row, rowIndex) =>
                  row.map((value, columnIndex) =>
                    value === 0 ? null : (
                      <rect
                        key={`debug-cell-${structureIndex}-${rowIndex}-${columnIndex}`}
                        x={left + columnIndex * cell}
                        y={top + rowIndex * cell}
                        width={cell}
                        height={cell}
                        rx="2"
                        fill={tileColor(structure.type)}
                      />
                    ),
                  ),
                );
              })}
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
                style={mapLayerStyle("signalLinks")}
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
            const assetEntry = isCustomShape && !entry?.renderAsset ? catalogEntry(11) : entry;
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
                className="blueprint-map__structure cursor-pointer"
                data-render-image={entry ? catalogRender(entry)?.imageName : undefined}
                style={mapLayerStyle("sprites")}
              >
                <rect
                  x={left}
                  y={top}
                  width={tileWidth}
                  height={tileHeight}
                  rx="5"
                  fill={
                    hideSprites || isCustomShape || entry?.renderAsset
                      ? "transparent"
                      : tileColor(structure.type)
                  }
                  // Sprites own their visible shape. A generic footprint border
                  // leaks through the transparent corners of triangle foundations.
                  stroke={hideSprites || isCustomShape || entry?.renderAsset ? "none" : "#8491a3"}
                  strokeWidth="1.5"
                />
                {isCustomShape && showCustomShapes
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
                            stroke="none"
                            strokeWidth="1"
                            pointerEvents="none"
                          />
                        ),
                      ),
                    )
                  : null}
                {!hideSprites && assetEntry?.renderAsset
                  ? (() => {
                      const assetEntry =
                        isCustomShape && !entry?.renderAsset ? catalogEntry(11)! : entry!;
                      const renderAsset = assetEntry.renderAsset!;
                      const frame = renderAsset.frame;
                      const source = renderAsset.sourceSize;
                      const sourceCrop = renderAsset.sourceCrop;
                      const sourceWidth = source?.width ?? frame?.width ?? 1;
                      const sourceHeight = source?.height ?? frame?.height ?? 1;
                      const runtimeRender = catalogRender(assetEntry);
                      const runtimeSize = runtimeRender
                        ? catalogRenderSize(runtimeRender)
                        : undefined;
                      const frameWidth = frame?.width ?? runtimeSize?.width ?? sourceWidth;
                      const frameHeight = frame?.height ?? runtimeSize?.height ?? sourceHeight;
                      const collectorSprite = collectorSpriteMap.get(index);
                      const frameIndex = collectorSprite?.frameIndex ?? renderAsset.frameIndex ?? 0;
                      const spriteRotation = collectorSprite?.rotation ?? renderAsset.rotation;
                      const customLightColor =
                        renderAsset.lightColor ??
                        lightColor(structure) ??
                        lightColor(structure.data) ??
                        lightColor(structure.filter);
                      const useNativeAssetSize =
                        runtimeSize !== undefined ||
                        (frame !== undefined && renderAsset.scale !== "cell");
                      const needsFrameClip = renderAsset.clip ?? sourceWidth > frameWidth;
                      const pixelScale = renderPixelScale(cell);
                      const visualWidth = useNativeAssetSize
                        ? frameWidth * pixelScale
                        : renderScaleMode(renderAsset.scale) === "cell"
                          ? cell * renderScaleFactor(renderAsset.scale)
                          : tileWidth;
                      const visualHeight = useNativeAssetSize
                        ? frameHeight * pixelScale
                        : frame
                          ? visualWidth * ((sourceCrop?.height ?? sourceHeight) / frameWidth)
                          : tileHeight;
                      const sourceScale = visualWidth / frameWidth;
                      const imageHeight = visualWidth * (sourceHeight / frameWidth);
                      const renderOffset = runtimeRender?.offset;
                      const offset =
                        renderOffset && typeof renderOffset === "object"
                          ? (renderOffset as { x?: unknown; y?: unknown })
                          : undefined;
                      const offsetX =
                        (typeof offset?.x === "number" ? offset.x : 0) +
                        (renderAsset.offset?.x ?? 0);
                      const offsetY =
                        (typeof offset?.y === "number" ? offset.y : 0) +
                        (renderAsset.offset?.y ?? 0);
                      const imageX = left + offsetX * pixelScale;
                      const sourceImageX = imageX - frameIndex * visualWidth;
                      const imageY =
                        renderAnchorEdge(renderAsset.anchor) === "bottom"
                          ? top +
                            tileHeight -
                            visualHeight +
                            renderAnchorOffsetCells(renderAsset.anchor) * cell +
                            offsetY * pixelScale
                          : top + offsetY * pixelScale;
                      const imageFrameY = imageY;
                      const sourceImageY = imageFrameY - (sourceCrop?.y ?? 0) * sourceScale;
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
                            <rect
                              x={imageX}
                              y={sourceCrop ? imageFrameY : 0}
                              width={visualWidth}
                              height={sourceCrop ? visualHeight : height}
                            />
                          </clipPath>
                          <image
                            href={`${import.meta.env.BASE_URL}${renderAsset.path}`}
                            x={sourceImageX}
                            y={sourceImageY}
                            width={visualWidth * (sourceWidth / frameWidth)}
                            height={imageHeight}
                            preserveAspectRatio="none"
                            clipPath={needsFrameClip ? `url(#asset-clip-${index})` : undefined}
                            mask={
                              isCustomShape && !entry?.renderAsset
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
          {!hideFoundationOutlines &&
          foundationOutlinePath(
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
              style={mapLayerStyle("foundationOutlines")}
            />
          ) : null}
          {selected ? (
            <rect
              x={(selected.x - minX + padding) * cell}
              y={(selected.y - minY + padding) * cell}
              width={BLOCK_COORDINATE_SIZE * cell}
              height={BLOCK_COORDINATE_SIZE * cell}
              fill="none"
              stroke="#4ade80"
              strokeWidth={renderPixelScale(cell)}
              pointerEvents="none"
              style={mapLayerStyle("selectedHighlight")}
            />
          ) : null}
          <rect
            ref={hoverMarkerRef}
            x="0"
            y="0"
            width={BLOCK_COORDINATE_SIZE * cell}
            height={BLOCK_COORDINATE_SIZE * cell}
            fill="#ffe700"
            fillOpacity="0.08"
            stroke="#ffe700"
            strokeWidth={renderPixelScale(cell) / 2}
            visibility="hidden"
            pointerEvents="none"
            style={mapLayerStyle("hoverHighlight")}
          />
        </svg>
      </div>
      {showSidebar ? (
        <aside className="flex flex-col border-l border-slate-800 pl-4 text-xs text-slate-400">
          {debugOptions}
          <p
            className={`${debugOptions ? "pt-4" : null} font-mono uppercase tracking-[0.18em] text-slate-500`}
          >
            Selected record
          </p>
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
        </aside>
      ) : null}
    </div>
  );
}
