import { useEffect, useRef, useState } from "react";
import { Button, Panel } from "@sandustry/ui";
import type { SaveExplorerDocument } from "@sandustry/save-core";
import { PageHeader } from "../components/PageHeader";

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
  const workerRef = useRef<Worker | null>(null);
  const [document, setDocument] = useState<SaveExplorerDocument | null>(null);
  const [raster, setRaster] = useState<ExplorerRaster | null>(null);
  const [message, setMessage] = useState("Drop a .save file here to begin.");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

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

  const decodeFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.endsWith(".save")) {
      setMessage("Choose a Sandustry .save file.");
      return;
    }
    setBusy(true);
    setMessage(`Reading ${file.name}…`);
    const bytes = await file.arrayBuffer();
    workerRef.current?.postMessage({ type: "decode", bytes }, [bytes]);
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
          <div className="save-explorer-map-frame">
            {raster ? (
              <canvas ref={canvasRef} className="save-explorer-map" aria-label="Save minimap" />
            ) : (
              <div className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-slate-500">
                {message}
              </div>
            )}
          </div>
          {raster ? (
            <div className="border-t border-slate-800 px-4 py-3 font-mono text-xs text-slate-500">
              {message} · {raster.width}×{raster.height} minimap pixels
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel title="Save status" contentClassName="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${document ? "bg-emerald-400" : busy ? "bg-yellow-300" : "bg-slate-600"}`}
              />
              <span className="text-slate-300">
                {busy ? "processing" : document ? "decoded" : "waiting"}
              </span>
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
