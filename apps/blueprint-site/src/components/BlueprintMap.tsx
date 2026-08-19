import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import {
  customShapeFromStructure,
  foundationOutlinePath as coreFoundationOutlinePath,
} from "@sandustry/blueprint-core";
import { type Blueprint } from "../utils/blueprint";
import { catalogEntry, catalogRender, catalogRenderSize } from "../utils/catalog";
import { debugComponent } from "./DebugComponentWrapper";
import { MapDebugOptions } from "./MapDebugOptions";
import { BlueprintMapSidebar } from "./BlueprintMapSidebar";
import {
  BLOCK_COORDINATE_SIZE,
  DISPLAY_PIXELS_PER_BLOCK_AT_100,
  MAP_ZOOM_LEVELS,
  MAP_VIEWPORT_BORDER_SIZE,
  NATIVE_PIXELS_PER_CELL,
  PAN_COMMIT_DEBOUNCE_MS,
  SAVED_MAP_VIEW_KEY,
  mapLayerStyle,
  renderAnchorEdge,
  renderAnchorOffsetCells,
  renderPixelScale,
  renderScaleFactor,
  renderScaleMode,
  readStoredMapView,
  snapMapZoom,
  structureLabel,
  structureShape,
  structureTopY,
  tileColor,
  viewportHeightForWidth,
  writeLocalValue,
  wrapLabel,
  createBlueprintMapModel,
} from "../utils/blueprint-map";

const MAP_FIT_ZOOM_MIN = 0.25;
const MAP_FIT_ZOOM_MAX = 2;

const BELT_TYPES = new Set<Blueprint["data"][number]["type"]>([
  1,
  2,
  "conveyorLeftMk2",
  "conveyorRightMk2",
  "burnerBeltLeft",
  "burnerBeltRight",
]);

function _foundationOutlinePath(
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
    if (
      !isNativeFoundation &&
      !BELT_TYPES.has(structure.type) &&
      customShapeFromStructure(structure) === undefined
    ) {
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
  const [showSprites, setShowSprites] = useState(true);
  const [showCustomShapes, setShowCustomShapes] = useState(false);
  const [showFoundationOutlines, setShowFoundationOutlines] = useState(true);
  const [showSignalLinks, setShowSignalLinks] = useState(true);
  // Sprite hiding is a local renderer debugging aid. Keep the production
  // render path hard-wired to sprites regardless of persisted debug state.
  const spritesVisible = import.meta.env.PROD || showSprites;
  const foundationOutlinesVisible = import.meta.env.PROD || showFoundationOutlines;
  const signalLinksVisible = import.meta.env.PROD || showSignalLinks;
  const [zoom, setZoom] = useState(() =>
    captureOnly ? 1 : snapMapZoom(readStoredMapView(blueprintKey)?.zoom ?? 1),
  );
  const [pan, setPan] = useState(() =>
    captureOnly ? { x: 0, y: 0 } : (readStoredMapView(blueprintKey)?.pan ?? { x: 0, y: 0 }),
  );
  const [mapSizeReady, setMapSizeReady] = useState(
    () => captureOnly || readStoredMapView(blueprintKey) !== null,
  );
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
  const fitModeRef = useRef(captureOnly ? true : (readStoredMapView(blueprintKey)?.fit ?? true));
  const padding = 6;
  // Blueprint coordinates are cell-sized units. Four native sprite pixels
  // make one cell, and four cells make one blueprint block. At 100% four
  // blueprint coordinates therefore render at 32 display pixels.
  const cell = DISPLAY_PIXELS_PER_BLOCK_AT_100 / NATIVE_PIXELS_PER_CELL;
  const mapModel = createBlueprintMapModel(blueprint, padding, cell);
  const { preparedBlueprint, minX, minY, width, height, blueprintWidth, blueprintHeight } =
    mapModel;
  const viewportWidth = viewportSize.width || width;
  const defaultViewportHeight = viewportHeightForWidth(viewportWidth);
  const blueprintFitsDefaultViewport =
    blueprintWidth <= viewportWidth && blueprintHeight <= defaultViewportHeight;
  const blueprintAspectViewportHeight = viewportWidth * (height / width) + MAP_VIEWPORT_BORDER_SIZE;
  const aspectRatioViewportHeight = blueprintFitsDefaultViewport
    ? defaultViewportHeight
    : Math.max(defaultViewportHeight, blueprintAspectViewportHeight);
  const maxPanX = Math.max(0, (width * zoom - (viewportSize.width || width)) / (2 * zoom));
  const maxPanY = Math.max(0, (height * zoom - (viewportSize.height || height)) / (2 * zoom));
  const fitZoomForViewport = (availableWidth: number, availableHeight: number) => {
    const blueprintFits = blueprintWidth <= availableWidth && blueprintHeight <= availableHeight;
    if (blueprintFits) {
      // Keep the whole blueprint visible while using the zoom to trim the
      // generous renderer padding around small blueprints.
      const maxZoom = Math.min(
        MAP_FIT_ZOOM_MAX,
        availableWidth / blueprintWidth,
        availableHeight / blueprintHeight,
      );
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
  const { renderStructures } = mapModel;
  const debugOptions = debugComponent(MapDebugOptions, {
    showDebugCells,
    onShowDebugCellsChange: setShowDebugCells,
    showNames,
    onShowNamesChange: setShowNames,
    showSprites,
    onShowSpritesChange: setShowSprites,
    showCustomShapes,
    onShowCustomShapesChange: setShowCustomShapes,
    showFoundationOutlines,
    onShowFoundationOutlinesChange: setShowFoundationOutlines,
    showSignalLinks,
    onShowSignalLinksChange: setShowSignalLinks,
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
    const stored = remember && !captureOnly ? readStoredMapView(blueprintKey) : null;
    fitModeRef.current = stored?.fit ?? true;
    const restoredZoom = captureOnly ? 1 : snapMapZoom(stored?.zoom ?? 1);
    const restoredMaxPanX = Math.max(
      0,
      (width * restoredZoom - (viewportSize.width || width)) / (2 * restoredZoom),
    );
    const restoredMaxPanY = Math.max(
      0,
      (height * restoredZoom - (viewportSize.height || height)) / (2 * restoredZoom),
    );
    setZoom(restoredZoom);
    setPan(
      captureOnly
        ? { x: 0, y: 0 }
        : {
            x: Math.max(-restoredMaxPanX, Math.min(restoredMaxPanX, stored?.pan.x ?? 0)),
            y: Math.max(-restoredMaxPanY, Math.min(restoredMaxPanY, stored?.pan.y ?? 0)),
          },
    );
    setSelectedIndex(null);
    setMapSizeReady(
      captureOnly || (stored?.viewportWidth === viewportSize.width && viewportSize.width > 0),
    );
  }, [blueprint, blueprintKey, captureOnly, remember]);
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
    if (captureOnly) return;
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
  }, [blueprintKey, captureOnly, remember, viewportSize.height, viewportSize.width, width]);
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
                const prepared = preparedBlueprint.preparedStructures[structureIndex];
                const footprint = prepared.footprint;
                const shape =
                  prepared.shape ??
                  Array.from({ length: footprint.height }, () =>
                    Array.from({ length: footprint.width }, () => 1),
                  );
                const topY = prepared.topY;
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
          {signalLinksVisible
            ? preparedBlueprint.preparedSignalLinks.map((link, index) => {
                const wire = link.path;
                const from = point(wire.from.x, wire.from.y);
                const to = point(wire.to.x, wire.to.y);
                const d =
                  wire.kind === "line"
                    ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
                    : (() => {
                        const control1 = point(wire.control1.x, wire.control1.y);
                        const control2 = point(wire.control2.x, wire.control2.y);
                        return `M ${from.x} ${from.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${to.x} ${to.y}`;
                      })();
                return (
                  <path
                    key={`link-${index}`}
                    d={d}
                    stroke={link.on ? "#00ff99" : "#ff3333"}
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth="3"
                    opacity=".7"
                    style={mapLayerStyle("signalLinks")}
                  />
                );
              })
            : null}
          {(() => {
            const isFoundationShape = ({ structure, index }: (typeof renderStructures)[number]) => {
              const prepared = preparedBlueprint.preparedStructures[index];
              const entry = catalogEntry(structure.type);
              return (
                (typeof structure.type === "number" &&
                  structure.type >= 11 &&
                  structure.type <= 15) ||
                prepared.customShape !== undefined ||
                (prepared.shape !== undefined && !entry?.renderAsset)
              );
            };
            const renderStructure = ({ structure, index }: (typeof renderStructures)[number]) => {
              const entry = catalogEntry(structure.type);
              const prepared = preparedBlueprint.preparedStructures[index];
              const footprint = prepared.footprint;
              const preparedShape = prepared.shape;
              const shape =
                preparedShape ??
                Array.from({ length: footprint.height }, () =>
                  Array.from({ length: footprint.width }, () => 1),
                );
              const isCustomShape =
                prepared.customShape !== undefined ||
                (preparedShape !== undefined && !entry?.renderAsset);
              const topY = prepared.topY;
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
                  (typeof structure.type === "number"
                    ? structure.type
                    : structure.type.slice(0, 8)),
              );
              // Labels live in the same display-pixel coordinate space as the
              // map. Keep them proportional to a cell so they remain useful at
              // the renderer's native scale instead of overwhelming sprites.
              const labelFontSize = Math.max(8, cell * 0.9);
              const labelLineHeight = labelFontSize * 1.15;
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
                >
                  <rect
                    x={left}
                    y={top}
                    width={tileWidth}
                    height={tileHeight}
                    rx="5"
                    fill={
                      !spritesVisible || isCustomShape || entry?.renderAsset
                        ? "transparent"
                        : tileColor(structure.type)
                    }
                    // Sprites own their visible shape. A generic footprint border
                    // leaks through the transparent corners of triangle foundations.
                    stroke={
                      !spritesVisible || isCustomShape || entry?.renderAsset ? "none" : "#8491a3"
                    }
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
                  {spritesVisible && assetEntry?.renderAsset
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
                        const frameIndex =
                          preparedBlueprint.preparedStructures[index].sprite?.frameIndex ??
                          renderAsset.frameIndex ??
                          0;
                        const spriteRotation =
                          preparedBlueprint.preparedStructures[index].sprite?.rotation ??
                          renderAsset.rotation;
                        const customLightColor =
                          renderAsset.lightColor ??
                          preparedBlueprint.preparedStructures[index].lightColor;
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
            };
            return (
              <>
                <g style={mapLayerStyle("foundationShapes")}>
                  {renderStructures.filter(isFoundationShape).map(renderStructure)}
                </g>
                <g style={mapLayerStyle("sprites")}>
                  {renderStructures.filter((item) => !isFoundationShape(item)).map(renderStructure)}
                </g>
              </>
            );
          })()}
          {foundationOutlinesVisible &&
          coreFoundationOutlinePath(
            preparedBlueprint.preparedStructures,
            minX,
            minY,
            padding,
            cell,
          ) ? (
            <path
              d={coreFoundationOutlinePath(
                preparedBlueprint.preparedStructures,
                minX,
                minY,
                padding,
                cell,
              )}
              fill="none"
              stroke="#000000"
              strokeWidth={renderPixelScale(cell)}
              pointerEvents="none"
              style={mapLayerStyle("foundationShapes")}
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
      {showSidebar ? <BlueprintMapSidebar selected={selected} debugOptions={debugOptions} /> : null}
    </div>
  );
}
