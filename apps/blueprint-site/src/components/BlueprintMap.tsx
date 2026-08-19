import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  customShapeFromStructure,
  renderBlueprintToSvg,
  renderSvgToPng,
} from "@sandustry/blueprint-core";
import { type Blueprint } from "../utils/blueprint";
import { blueprintCatalog, catalogEntry } from "../utils/catalog";
import { debugComponent } from "./DebugComponentWrapper";
import { createBrowserPngPlatform, createImageResolver } from "../utils/png-platform";
import { MapDebugOptions } from "./MapDebugOptions";
import { BlueprintMapSidebar } from "./BlueprintMapSidebar";
import { BlueprintMapStructure } from "./BlueprintMapStructure";
import { BlueprintMapViewportControls } from "./BlueprintMapViewportControls";
import {
  BlueprintMapFoundationOutlineLayer,
  BlueprintMapGridLayer,
  BlueprintMapSignalLinksLayer,
} from "./BlueprintMapLayers";
import { useBlueprintMapViewport } from "../hooks/useBlueprintMapViewport";
import {
  BLOCK_COORDINATE_SIZE,
  DISPLAY_PIXELS_PER_BLOCK_AT_100,
  MAP_ZOOM_LEVELS,
  MAP_VIEWPORT_BORDER_SIZE,
  NATIVE_PIXELS_PER_CELL,
  PAN_COMMIT_DEBOUNCE_MS,
  SAVED_MAP_VIEW_KEY,
  mapLayerStyle,
  renderPixelScale,
  readStoredMapView,
  snapMapZoom,
  structureShape,
  structureTopY,
  tileColor,
  createBlueprintMapModel,
} from "../utils/blueprint-map";
import { writeStorageValue } from "../utils/storage";

const MAP_FIT_ZOOM_MIN = 0.25;
const MAP_FIT_ZOOM_MAX = 2;
const MAP_FIT_MARGIN_CELLS_TOTAL = 24;

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
  const svgRef = useRef<SVGSVGElement>(null);
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
  const { preparedBlueprint, minX, minY, width, height, blueprintWidth } = mapModel;
  const { viewportRef, viewportSize, hoverMarkerRef, updateHoverBlock, clearHoverBlock } =
    useBlueprintMapViewport({ cell, minX, minY, padding });
  const viewportWidth = viewportSize.width || width;
  const fitWidth = blueprintWidth + MAP_FIT_MARGIN_CELLS_TOTAL * cell;
  const fitZoomForViewport = (availableWidth: number) => {
    const maxZoom = Math.min(MAP_FIT_ZOOM_MAX, availableWidth / fitWidth);
    return (
      MAP_ZOOM_LEVELS.filter(
        (level) => level >= MAP_FIT_ZOOM_MIN && level <= maxZoom,
      ).reverse()[0] ?? MAP_FIT_ZOOM_MIN
    );
  };
  const measuredFitZoom = fitZoomForViewport(viewportWidth);
  const horizontalCanvasGap = Math.max(0, (viewportWidth - width * measuredFitZoom) / 2);
  const aspectRatioViewportHeight =
    height * measuredFitZoom + horizontalCanvasGap * 2 + MAP_VIEWPORT_BORDER_SIZE;
  const maxPanX = Math.max(0, (width * zoom - (viewportSize.width || width)) / (2 * zoom));
  const maxPanY = Math.max(0, (height * zoom - (viewportSize.height || height)) / (2 * zoom));
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
    setZoom(fitZoomForViewport(availableWidth || width));
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
    writeStorageValue(
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
    const rendered = renderBlueprintToSvg(blueprint, {
      catalog: blueprintCatalog(),
      padding,
      cell,
      assetBaseUrl: import.meta.env.BASE_URL,
      includeBackground: showPngBackground,
      showGrid,
      showFoundationOutlines: true,
      showSignalLinks: true,
    });
    const exportScale = 1 / renderPixelScale(cell);
    const png = await renderSvgToPng(rendered.svg, {
      width,
      height,
      scale: exportScale,
      title: blueprint.name,
      includeBackground: showPngBackground,
      resolveImage: createImageResolver(document.baseURI),
      platform: createBrowserPngPlatform(),
    });
    const pngBuffer = new ArrayBuffer(png.byteLength);
    new Uint8Array(pngBuffer).set(png);
    const blob = new Blob([pngBuffer], { type: "image/png" });
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
        <BlueprintMapViewportControls
          zoom={zoom}
          minZoom={MAP_ZOOM_LEVELS[0]}
          maxZoom={MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1]}
          measuredFitZoom={measuredFitZoom}
          fitMode={fitModeRef.current}
          pan={pan}
          onExport={exportPng}
          onZoomOut={() => {
            const index = MAP_ZOOM_LEVELS.indexOf(snapMapZoom(zoom));
            setMapZoom(MAP_ZOOM_LEVELS[Math.max(0, index - 1)]);
          }}
          onFit={fitToViewport}
          onZoomIn={() => {
            const index = MAP_ZOOM_LEVELS.indexOf(snapMapZoom(zoom));
            setMapZoom(MAP_ZOOM_LEVELS[Math.min(MAP_ZOOM_LEVELS.length - 1, index + 1)]);
          }}
        />
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
            clearHoverBlock();
          }}
        >
          <BlueprintMapGridLayer
            width={width}
            height={height}
            gridOriginX={gridOriginX}
            gridOriginY={gridOriginY}
            cell={cell}
            showGrid={showGrid}
          />
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
              return (
                <BlueprintMapStructure
                  item={{ structure, index, z: preparedBlueprint.preparedStructures[index].z }}
                  preparedBlueprint={preparedBlueprint}
                  minX={minX}
                  minY={minY}
                  padding={padding}
                  cell={cell}
                  height={height}
                  spritesVisible={spritesVisible}
                  showCustomShapes={showCustomShapes}
                  showNames={showNames}
                  suppressClickRef={suppressClickRef}
                  onSelect={setSelectedIndex}
                />
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
          <BlueprintMapSignalLinksLayer
            preparedBlueprint={preparedBlueprint}
            visible={signalLinksVisible}
            point={point}
          />
          <BlueprintMapFoundationOutlineLayer
            preparedBlueprint={preparedBlueprint}
            visible={foundationOutlinesVisible}
            minX={minX}
            minY={minY}
            padding={padding}
            cell={cell}
          />
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
