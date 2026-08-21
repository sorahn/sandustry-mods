import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Panel } from "@sandustry/ui";
import type { SaveExplorerDocument } from "@sandustry/save-core";
import { PageHeader } from "../components/PageHeader";
import { readStorageValue, writeStoredBoolean } from "../utils/storage";
import { forgetRememberedSave, readRememberedSave, rememberSave } from "../utils/save-storage";
import { REMEMBER_SAVE_EXPLORER_KEY } from "../utils/storage-keys";

type ExplorerRaster = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type ExplorerWorkerResponse =
  | {
      type: "result";
      document: SaveExplorerDocument;
      raster: { width: number; height: number; pixels: ArrayBuffer };
    }
  | { type: "error"; message: string };

function formatPlayTime(seconds?: number) {
  if (seconds === undefined) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toLocaleString()}h ${minutes}m`;
}

function Metadata({ document }: { document: SaveExplorerDocument }) {
  const values = [
    ["world", document.metadata.worldName || "unnamed"],
    ["version", document.metadata.gameVersion || "unknown"],
    ["seed", document.metadata.seed || "unknown"],
    ["dimensions", `${document.world.width} × ${document.world.height} cells`],
    ["structures", document.structures.length.toLocaleString()],
    ["play time", formatPlayTime(document.metadata.playTime)],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {label}
          </dt>
          <dd className="mt-1 truncate text-sm text-slate-200" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SaveExplorerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [document, setDocument] = useState<SaveExplorerDocument | null>(null);
  const [raster, setRaster] = useState<ExplorerRaster | null>(null);
  const [message, setMessage] = useState("Drop a .save file here to begin.");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [remember, setRemember] = useState(
    () => readStorageValue(REMEMBER_SAVE_EXPLORER_KEY) === "true",
  );
  const currentSaveRef = useRef<{ bytes: Uint8Array; name: string } | null>(null);
  const [view, setView] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

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
    const worker = new Worker(new URL("../save-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ExplorerWorkerResponse>) => {
      const response = event.data;
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
        worker.postMessage({ type: "decode", bytes }, [bytes]);
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
    fitMap();
    const frame = mapFrameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(fitMap);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [fitMap]);

  const decodeFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.endsWith(".save")) {
      setMessage("Choose a Sandustry .save file.");
      return;
    }
    setBusy(true);
    setMessage(`Reading ${file.name}…`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    currentSaveRef.current = { bytes: bytes.slice(), name: file.name };
    if (remember) rememberSave(bytes, file.name);
    workerRef.current?.postMessage({ type: "decode", bytes: bytes.buffer }, [bytes.buffer]);
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
        Debug-only preview of the save parser and native-style minimap renderer. Files stay in this
        browser session and are processed locally.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel className="overflow-hidden" contentClassName="p-0">
          <div
            className={`save-explorer-dropzone ${dragging ? "save-explorer-dropzone--active" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void decodeFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".save"
              className="hidden"
              onChange={(event) => void decodeFile(event.target.files?.[0])}
            />
            {/* @TODO when changing this file later, the button breaks the drop
             zone target when hovering, and then the parent container never reacquires it */}
            <Button
              type="button"
              variant="accent"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? "Decoding…" : document ? "Open another save" : "Choose save file"}
            </Button>
            <span className="text-xs text-slate-500">or drop a `.save` file</span>
          </div>
          <div
            ref={mapFrameRef}
            className="save-explorer-map-frame"
            onWheel={(event) => {
              if (!raster) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const pointX = event.clientX - rect.left;
              const pointY = event.clientY - rect.top;
              const nextScale = Math.max(
                0.25,
                Math.min(8, view.scale * (event.deltaY < 0 ? 1.15 : 0.87)),
              );
              const mapX = (pointX - view.offsetX) / view.scale;
              const mapY = (pointY - view.offsetY) / view.scale;
              setView({
                scale: nextScale,
                offsetX: pointX - mapX * nextScale,
                offsetY: pointY - mapY * nextScale,
              });
            }}
          >
            {raster ? (
              <canvas
                ref={canvasRef}
                className="save-explorer-map"
                aria-label="Save minimap"
                style={{
                  width: raster.width * view.scale,
                  height: raster.height * view.scale,
                  left: view.offsetX,
                  top: view.offsetY,
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    offsetX: view.offsetX,
                    offsetY: view.offsetY,
                  };
                }}
                onPointerMove={(event) => {
                  const drag = dragRef.current;
                  if (!drag || drag.pointerId !== event.pointerId) return;
                  setView((current) => ({
                    ...current,
                    offsetX: drag.offsetX + event.clientX - drag.startX,
                    offsetY: drag.offsetY + event.clientY - drag.startY,
                  }));
                }}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
              />
            ) : (
              <div className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-slate-500">
                {message}
              </div>
            )}
            {raster ? (
              <div className="save-explorer-map-controls">
                <Button
                  type="button"
                  onClick={() =>
                    setView((current) => ({ ...current, scale: Math.min(8, current.scale * 1.25) }))
                  }
                  aria-label="Zoom in"
                >
                  +
                </Button>
                <span>{Math.round(view.scale * 100)}%</span>
                <Button
                  type="button"
                  onClick={() =>
                    setView((current) => ({
                      ...current,
                      scale: Math.max(0.25, current.scale * 0.8),
                    }))
                  }
                  aria-label="Zoom out"
                >
                  −
                </Button>
                <Button type="button" onClick={fitMap}>
                  Fit
                </Button>
              </div>
            ) : null}
          </div>
          {raster ? (
            <div className="border-t border-slate-800 px-4 py-3 font-mono text-xs text-slate-500">
              {message} · {raster.width}×{raster.height} minimap pixels
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel title="Save status" contentClassName="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${document ? "bg-emerald-400" : busy ? "bg-yellow-300" : "bg-slate-600"}`}
                />
                <span className="text-slate-300">
                  {busy ? "processing" : document ? "decoded" : "waiting"}
                </span>
              </div>
              <Button
                type="button"
                onClick={toggleRemember}
                disabled={!remember && !currentSaveRef.current}
                aria-pressed={remember}
              >
                {remember ? "Forget save" : "Remember save"}
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-500">{message}</p>
          </Panel>
          {document ? (
            <Panel title="World metadata" contentClassName="p-4">
              <Metadata document={document} />
            </Panel>
          ) : null}
          <Panel
            title="Current scope"
            contentClassName="space-y-2 p-4 text-xs leading-5 text-slate-500"
          >
            <p>✓ browser save decoding</p>
            <p>✓ 4×4 cell minimap aggregation</p>
            <p>✓ fog masking</p>
            <p>○ zoom, pan, and cell inspection</p>
          </Panel>
        </div>
      </div>
    </section>
  );
}
