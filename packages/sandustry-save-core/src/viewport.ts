export const SAVE_EXPLORER_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8] as const;

export type SaveExplorerViewport = {
  mapWidth: number;
  mapHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type SaveExplorerMapPoint = { x: number; y: number };

export type SaveExplorerVisibleRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function positiveFinite(value: number) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitZoom(
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return clamp(
    Math.min(viewportWidth / mapWidth, viewportHeight / mapHeight),
    SAVE_EXPLORER_ZOOM_LEVELS[0],
    SAVE_EXPLORER_ZOOM_LEVELS.at(-1)!,
  );
}

function clampPan(viewport: SaveExplorerViewport, panX: number, panY: number) {
  const visibleWidth = viewport.viewportWidth / viewport.zoom;
  const visibleHeight = viewport.viewportHeight / viewport.zoom;
  return {
    x: clamp(panX, 0, Math.max(0, viewport.mapWidth - visibleWidth)),
    y: clamp(panY, 0, Math.max(0, viewport.mapHeight - visibleHeight)),
  };
}

export function createSaveExplorerViewport(
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): SaveExplorerViewport {
  if (![mapWidth, mapHeight, viewportWidth, viewportHeight].every(positiveFinite))
    throw new Error("Viewport dimensions must be positive finite numbers");
  const zoom = fitZoom(mapWidth, mapHeight, viewportWidth, viewportHeight);
  const viewport = { mapWidth, mapHeight, viewportWidth, viewportHeight, zoom, panX: 0, panY: 0 };
  const pan = clampPan(
    viewport,
    (mapWidth - viewportWidth / zoom) / 2,
    (mapHeight - viewportHeight / zoom) / 2,
  );
  return { ...viewport, panX: pan.x, panY: pan.y };
}

export function resizeSaveExplorerViewport(
  viewport: SaveExplorerViewport,
  viewportWidth: number,
  viewportHeight: number,
): SaveExplorerViewport {
  if (![viewportWidth, viewportHeight].every(positiveFinite))
    throw new Error("Viewport dimensions must be positive finite numbers");
  const next = { ...viewport, viewportWidth, viewportHeight };
  const pan = clampPan(next, next.panX, next.panY);
  return { ...next, panX: pan.x, panY: pan.y };
}

export function fitSaveExplorerViewport(viewport: SaveExplorerViewport): SaveExplorerViewport {
  const zoom = fitZoom(
    viewport.mapWidth,
    viewport.mapHeight,
    viewport.viewportWidth,
    viewport.viewportHeight,
  );
  const next = { ...viewport, zoom };
  const pan = clampPan(
    next,
    (next.mapWidth - next.viewportWidth / zoom) / 2,
    (next.mapHeight - next.viewportHeight / zoom) / 2,
  );
  return { ...next, panX: pan.x, panY: pan.y };
}

export function resetSaveExplorerViewport(viewport: SaveExplorerViewport) {
  return fitSaveExplorerViewport(viewport);
}

export function panSaveExplorerViewport(
  viewport: SaveExplorerViewport,
  deltaX: number,
  deltaY: number,
) {
  const pan = clampPan(
    viewport,
    viewport.panX + deltaX / viewport.zoom,
    viewport.panY + deltaY / viewport.zoom,
  );
  return { ...viewport, panX: pan.x, panY: pan.y };
}

export function zoomSaveExplorerViewport(
  viewport: SaveExplorerViewport,
  zoom: number,
  screenPoint?: SaveExplorerMapPoint,
) {
  const nextZoom = clamp(zoom, SAVE_EXPLORER_ZOOM_LEVELS[0], SAVE_EXPLORER_ZOOM_LEVELS.at(-1)!);
  const point = screenPoint ?? { x: viewport.viewportWidth / 2, y: viewport.viewportHeight / 2 };
  const worldX = viewport.panX + point.x / viewport.zoom;
  const worldY = viewport.panY + point.y / viewport.zoom;
  const next = { ...viewport, zoom: nextZoom };
  const pan = clampPan(next, worldX - point.x / nextZoom, worldY - point.y / nextZoom);
  return { ...next, panX: pan.x, panY: pan.y };
}

export function worldToScreen(viewport: SaveExplorerViewport, point: SaveExplorerMapPoint) {
  return {
    x: (point.x - viewport.panX) * viewport.zoom,
    y: (point.y - viewport.panY) * viewport.zoom,
  };
}

export function screenToWorld(viewport: SaveExplorerViewport, point: SaveExplorerMapPoint) {
  return { x: viewport.panX + point.x / viewport.zoom, y: viewport.panY + point.y / viewport.zoom };
}

export function visibleMapRect(viewport: SaveExplorerViewport): SaveExplorerVisibleRect {
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, {
    x: viewport.viewportWidth,
    y: viewport.viewportHeight,
  });
  return {
    minX: Math.floor(topLeft.x),
    minY: Math.floor(topLeft.y),
    maxX: Math.ceil(bottomRight.x),
    maxY: Math.ceil(bottomRight.y),
  };
}
