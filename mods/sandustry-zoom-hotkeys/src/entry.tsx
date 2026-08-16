const api = sandkit.api;
const engine = sandkit.engine;

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 3];
let changeInProgress = false;

function printEngineDiagnostics(): void {
  const rawEngine = engine as unknown as {
    api: Record<string, unknown>;
    state: Record<string, unknown>;
  };
  const session = rawEngine.state.session as Record<string, unknown> | undefined;
  const rendering = session?.rendering as Record<string, unknown> | undefined;

  console.groupCollapsed("[Sandustry Zoom Hotkeys] engine diagnostics");
  console.log("sandkit keys", Object.keys(sandkit));
  console.log("engine keys", Object.keys(rawEngine));
  console.log("engine API namespaces", Object.keys(rawEngine.api));
  console.log("engine API rendering keys", Object.keys(rawEngine.api.rendering ?? {}));
  console.log("engine state keys", Object.keys(rawEngine.state));
  console.log("session keys", Object.keys(session ?? {}));
  console.log("session rendering keys", Object.keys(rendering ?? {}));
  console.log("videoZoom", engine.state.session.settings.videoZoom);
  console.log("native zoom slider", document.querySelector("input.options-slider"));
  console.groupEnd();
}

setTimeout(printEngineDiagnostics, 0);

function currentZoomIndex(): number {
  const value = engine.state.session.settings.videoZoom;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < ZOOM_LEVELS.length; index += 1) {
    const distance = Math.abs(ZOOM_LEVELS[index] - value);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }

  return bestIndex;
}

function resetCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a 2D rendering context");
  context.imageSmoothingEnabled = false;
  return context;
}

function applyZoomDirectly(index: number): void {
  const state = engine.state as unknown as {
    session: {
      rendering: Record<string, any>;
      resolution: { width: number; height: number };
      scale: number;
      view: { zoom: number; zoomDirty: boolean };
      settings: { videoZoom: number };
    };
  };
  const value = ZOOM_LEVELS[index];
  const width = Math.min(4 * Math.round(1920 / value / 4), 1920);
  const height = Math.min(4 * Math.round(1088 / value / 4), 1088);
  const zoom = Math.min(value / (1920 / width), 1);
  const session = state.session;

  session.settings.videoZoom = value;
  if (
    width === session.resolution.width &&
    height === session.resolution.height &&
    zoom === session.view.zoom
  ) {
    return;
  }

  const rendering = session.rendering;
  const { cellSize } = api.rendering.getGridMetrics();
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);

  rendering.overlayContext = resetCanvas(rendering.overlayCanvas, width, height);
  session.rendering.canvas.width = width;
  session.rendering.canvas.height = height;
  rendering.worldContext = resetCanvas(rendering.worldCanvas, gridWidth, gridHeight);
  rendering.obstacleContext = resetCanvas(rendering.obstacleCanvas, gridWidth, gridHeight);
  rendering.offscreenContext = resetCanvas(rendering.offscreenCanvas, width, height);
  rendering.worldOffscreenContext = resetCanvas(rendering.worldOffscreenCanvas, width, height);
  rendering.obstacleOffscreenContext = resetCanvas(
    rendering.obstacleOffscreenCanvas,
    width,
    height,
  );
  rendering.foregroundOffscreenContext = resetCanvas(
    rendering.foregroundOffscreenCanvas,
    width,
    height,
  );
  rendering.offscreenOutlineContext = resetCanvas(rendering.offscreenOutlineCanvas, width, height);

  for (const channelName of [
    "backgroundChannel",
    "channel",
    "worldChannel",
    "obstacleChannel",
    "foregroundChannel",
  ]) {
    const channel = rendering[channelName];
    channel.context = resetCanvas(channel.canvas, width, height);
  }

  const scale =
    Math.ceil(10 * Math.max(window.innerWidth / width, window.innerHeight / height)) / 10;
  for (const canvas of [rendering.canvas, rendering.overlayCanvas]) {
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = "top left";
    canvas.style.position = "absolute";
    canvas.style.top = "50%";
    canvas.style.left = "50%";
    canvas.style.transform += " translate(-50%, -50%)";
  }

  session.scale = scale;
  session.resolution.width = width;
  session.resolution.height = height;
  rendering.pixi.resize(width, height);
  session.view.zoom = zoom;
  session.view.zoomDirty = zoom !== 1;
}

function changeZoom(direction: -1 | 1): void {
  if (changeInProgress) return;

  if (engine.state.session.cinematic) {
    api.ui.toast("Zoom hotkeys are disabled during cinematic mode.");
    return;
  }

  const currentIndex = currentZoomIndex();
  const nextIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;

  changeInProgress = true;
  try {
    applyZoomDirectly(nextIndex);
  } catch (error) {
    console.error("[Sandustry Zoom Hotkeys] direct zoom failed", error);
    api.ui.toast("Zoom hotkey failed; see the game console for details.");
  } finally {
    changeInProgress = false;
  }
}

api.input.registerBinding("ZoomHotKeys - Zoom In", ["Equal"], {
  displayName: "Zoom In",
  category: "interface",
  handlers: {
    down: () => changeZoom(1),
  },
});

api.input.registerBinding("ZoomHotKeys - Zoom Out", ["Minus"], {
  displayName: "Zoom Out",
  category: "interface",
  handlers: {
    down: () => changeZoom(-1),
  },
});
