import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MinimapRenderOptions,
  SaveExplorerCellInspection,
  SaveExplorerDocument,
} from "@sandustry/save-core";
import { PageHeader } from "../components/PageHeader";
import {
  SaveExplorerMapPanel,
  type ExplorerDrag,
  type ExplorerRaster,
  type ExplorerView,
} from "../components/SaveExplorerMapPanel";
import { SaveExplorerSidebar, type SaveExplorerLayers } from "../components/SaveExplorerSidebar";
import { readStorageValue, writeStoredBoolean } from "../utils/storage";
import { forgetRememberedSave, readRememberedSave, rememberSave } from "../utils/save-storage";
import { REMEMBER_SAVE_EXPLORER_KEY } from "../utils/storage-keys";

type ExplorerWorkerResponse =
  | {
      type: "result";
      document: SaveExplorerDocument;
      raster: { width: number; height: number; pixels: ArrayBuffer };
    }
  | { type: "inspection"; inspection?: SaveExplorerCellInspection }
  | { type: "error"; message: string };

export function SaveExplorerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const dragRef = useRef<ExplorerDrag | null>(null);
  const fitNextRasterRef = useRef(true);
  const fitMapRef = useRef<() => void>(() => {});
  const [document, setDocument] = useState<SaveExplorerDocument | null>(null);
  const [raster, setRaster] = useState<ExplorerRaster | null>(null);
  const [inspection, setInspection] = useState<SaveExplorerCellInspection | null>(null);
  const [hoverCell, setHoverCell] = useState<{ mapX: number; mapY: number } | null>(null);
  const hoverCellRef = useRef<{ mapX: number; mapY: number } | null>(null);
  const [message, setMessage] = useState("Drop a .save file here to begin.");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [remember, setRemember] = useState(
    () => readStorageValue(REMEMBER_SAVE_EXPLORER_KEY) === "true",
  );
  const [layers, setLayers] = useState<SaveExplorerLayers>({
    terrain: true,
    settledElements: true,
    elements: true,
    particles: true,
    walls: true,
    structures: true,
    fog: true,
    authorization: false,
  });
  const [customCursor, setCustomCursor] = useState(false);
  const currentSaveRef = useRef<{ bytes: Uint8Array; name: string } | null>(null);
  const [view, setView] = useState<ExplorerView>({ scale: 1, offsetX: 0, offsetY: 0 });

  const minimapOptions: MinimapRenderOptions = {
    drawTerrain: layers.terrain,
    drawSettledElements: layers.settledElements,
    drawElements: layers.elements,
    drawParticles: layers.particles,
    drawWalls: layers.walls,
    drawStructures: layers.structures,
    drawFog: layers.fog,
    drawAuthorization: layers.authorization,
  };

  const fitMap = useCallback(() => {
    const frame = mapFrameRef.current;
    if (!frame || !raster) return;
    const scale = Math.max(
      0.25,
      Math.min(
        8,
        Math.min(
          (frame.clientWidth - 32) / raster.width,
          (frame.clientHeight - 32) / raster.height,
        ),
      ),
    );
    setView({
      scale,
      offsetX: (frame.clientWidth - raster.width * scale) / 2,
      offsetY: (frame.clientHeight - raster.height * scale) / 2,
    });
  }, [raster]);

  useEffect(() => {
    fitMapRef.current = fitMap;
  }, [fitMap]);

  useEffect(() => {
    const worker = new Worker(new URL("../save-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ExplorerWorkerResponse>) => {
      const response = event.data;
      if (response.type === "inspection") {
        const current = hoverCellRef.current;
        if (
          response.inspection &&
          current?.mapX === response.inspection.mapX &&
          current.mapY === response.inspection.mapY
        )
          setInspection(response.inspection);
        return;
      }
      setBusy(false);
      if (response.type === "error") {
        setDocument(null);
        setRaster(null);
        setMessage(response.message);
        return;
      }
      setDocument(response.document);
      setRaster({
        width: response.raster.width,
        height: response.raster.height,
        pixels: new Uint8ClampedArray(response.raster.pixels),
      });
      setMessage("Save decoded. This first view is a native-style minimap raster.");
    };
    worker.onerror = () => {
      setBusy(false);
      setMessage("The save worker stopped unexpectedly.");
    };
    if (remember) {
      const saved = readRememberedSave();
      if (saved) {
        currentSaveRef.current = { bytes: saved.bytes.slice(), name: saved.name };
        setBusy(true);
        setMessage(`Restoring ${saved.name}…`);
        const bytes = saved.bytes.buffer;
        worker.postMessage({ type: "decode", bytes, render: minimapOptions }, [bytes]);
      }
    }
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !raster) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    const imageData = context.createImageData(raster.width, raster.height);
    imageData.data.set(raster.pixels);
    context.putImageData(imageData, 0, 0);
  }, [raster]);

  useEffect(() => {
    if (raster && fitNextRasterRef.current) {
      fitNextRasterRef.current = false;
      fitMap();
    }
  }, [fitMap, raster]);

  useEffect(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => fitMapRef.current());
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;
    const preventPageScroll = (event: WheelEvent) => event.preventDefault();
    frame.addEventListener("wheel", preventPageScroll, { passive: false });
    return () => frame.removeEventListener("wheel", preventPageScroll);
  }, []);

  const decodeFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.endsWith(".save")) {
      setMessage("Choose a Sandustry .save file.");
      return;
    }
    setBusy(true);
    setMessage(`Reading ${file.name}…`);
    fitNextRasterRef.current = true;
    const bytes = new Uint8Array(await file.arrayBuffer());
    currentSaveRef.current = { bytes: bytes.slice(), name: file.name };
    if (remember) rememberSave(bytes, file.name);
    workerRef.current?.postMessage(
      { type: "decode", bytes: bytes.buffer, render: minimapOptions },
      [bytes.buffer],
    );
  };

  const updateLayer = (layer: keyof SaveExplorerLayers, checked: boolean) => {
    const next = { ...layers, [layer]: checked };
    setLayers(next);
    if (document)
      workerRef.current?.postMessage({
        type: "render",
        render: {
          drawTerrain: next.terrain,
          drawSettledElements: next.settledElements,
          drawElements: next.elements,
          drawParticles: next.particles,
          drawWalls: next.walls,
          drawStructures: next.structures,
          drawFog: next.fog,
          drawAuthorization: next.authorization,
        },
      });
  };

  const toggleRemember = () => {
    if (remember) {
      setRemember(false);
      writeStoredBoolean(REMEMBER_SAVE_EXPLORER_KEY, false);
      forgetRememberedSave();
      setMessage("Remembered save cleared.");
      return;
    }
    const current = currentSaveRef.current;
    if (!current) return;
    rememberSave(current.bytes, current.name);
    setRemember(true);
    writeStoredBoolean(REMEMBER_SAVE_EXPLORER_KEY, true);
    setMessage(`${current.name} will be restored on the next visit.`);
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Save Explorer">
        Work in progress: preview the save parser and native-style minimap renderer. This is an
        early read-only explorer, so some game layers, colors, and bundled content are still being
        resolved. Files stay in this browser session and are processed locally.
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <SaveExplorerMapPanel
          inputRef={inputRef}
          canvasRef={canvasRef}
          mapFrameRef={mapFrameRef}
          dragRef={dragRef}
          raster={raster}
          inspection={inspection}
          hoverCell={hoverCell}
          hoverCellRef={hoverCellRef}
          view={view}
          customCursor={customCursor}
          dragging={dragging}
          busy={busy}
          documentLoaded={Boolean(document)}
          message={message}
          onChooseFile={() => inputRef.current?.click()}
          onFile={decodeFile}
          onViewChange={setView}
          onHover={(cell) => {
            setHoverCell(cell);
            setInspection(null);
          }}
          onClearHover={() => {
            setHoverCell(null);
            setInspection(null);
          }}
          onDraggingChange={setDragging}
          fitMap={fitMap}
          onInspect={(mapX, mapY) =>
            workerRef.current?.postMessage({ type: "inspect", mapX, mapY })
          }
        />
        <SaveExplorerSidebar
          document={document}
          busy={busy}
          message={message}
          remember={remember}
          hasCurrentSave={Boolean(currentSaveRef.current)}
          layers={layers}
          customCursor={customCursor}
          onRemember={toggleRemember}
          onLayerChange={updateLayer}
          onCustomCursorChange={setCustomCursor}
        />
      </div>
    </section>
  );
}
