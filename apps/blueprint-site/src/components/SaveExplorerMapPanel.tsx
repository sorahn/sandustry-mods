import { Button, Panel } from "@sandustry/ui";
import type { SaveExplorerCellInspection } from "@sandustry/save-core";

export type ExplorerRaster = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

export type ExplorerView = { scale: number; offsetX: number; offsetY: number };
export type ExplorerDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
};

type NullableRef<T> = { current: T | null };

type SaveExplorerMapPanelProps = {
  inputRef: NullableRef<HTMLInputElement>;
  canvasRef: NullableRef<HTMLCanvasElement>;
  mapFrameRef: NullableRef<HTMLDivElement>;
  dragRef: NullableRef<ExplorerDrag>;
  raster: ExplorerRaster | null;
  inspection: SaveExplorerCellInspection | null;
  hoverCell: { mapX: number; mapY: number } | null;
  hoverCellRef: NullableRef<{ mapX: number; mapY: number }>;
  view: ExplorerView;
  customCursor: boolean;
  dragging: boolean;
  busy: boolean;
  documentLoaded: boolean;
  message: string;
  onChooseFile: () => void;
  onFile: (file?: File) => void;
  onViewChange: (view: ExplorerView | ((current: ExplorerView) => ExplorerView)) => void;
  onHover: (cell: { mapX: number; mapY: number }) => void;
  onClearHover: () => void;
  onDraggingChange: (dragging: boolean) => void;
  fitMap: () => void;
  onInspect: (mapX: number, mapY: number) => void;
};

export function SaveExplorerMapPanel({
  inputRef,
  canvasRef,
  mapFrameRef,
  dragRef,
  raster,
  inspection,
  hoverCell,
  hoverCellRef,
  view,
  customCursor,
  dragging,
  busy,
  documentLoaded,
  message,
  onChooseFile,
  onFile,
  onViewChange,
  onHover,
  onClearHover,
  onDraggingChange,
  fitMap,
  onInspect,
}: SaveExplorerMapPanelProps) {
  return (
    <Panel className="overflow-hidden" contentClassName="p-0">
      <div
        className={`save-explorer-dropzone ${dragging ? "save-explorer-dropzone--active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          onDraggingChange(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          onDraggingChange(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDraggingChange(false);
          void onFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".save"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <Button type="button" variant="accent" onClick={onChooseFile} disabled={busy}>
          {busy ? "Decoding…" : documentLoaded ? "Open another save" : "Choose save file"}
        </Button>
        <span className="text-xs text-slate-500">or drop a `.save` file</span>
      </div>
      <div
        ref={mapFrameRef}
        className="save-explorer-map-frame"
        onWheel={(event) => {
          if (!raster) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const pointX = event.clientX - rect.left;
          const pointY = event.clientY - rect.top;
          const nextScale = Math.max(
            0.25,
            Math.min(8, view.scale * (event.deltaY < 0 ? 1.15 : 0.87)),
          );
          const mapX = (pointX - view.offsetX) / view.scale;
          const mapY = (pointY - view.offsetY) / view.scale;
          onViewChange({
            scale: nextScale,
            offsetX: pointX - mapX * nextScale,
            offsetY: pointY - mapY * nextScale,
          });
        }}
      >
        {raster ? (
          <canvas
            ref={canvasRef}
            className={`save-explorer-map${customCursor ? " save-explorer-map--custom-cursor" : ""}`}
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
              if (drag && drag.pointerId === event.pointerId) {
                onViewChange((current) => ({
                  ...current,
                  offsetX: drag.offsetX + event.clientX - drag.startX,
                  offsetY: drag.offsetY + event.clientY - drag.startY,
                }));
                return;
              }
              const rect = event.currentTarget.getBoundingClientRect();
              const mapX = Math.floor((event.clientX - rect.left) / view.scale);
              const mapY = Math.floor((event.clientY - rect.top) / view.scale);
              const previous = hoverCellRef.current;
              if (previous?.mapX === mapX && previous.mapY === mapY) return;
              const nextCell = { mapX, mapY };
              hoverCellRef.current = nextCell;
              onHover(nextCell);
              onInspect(mapX, mapY);
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onPointerLeave={() => {
              dragRef.current = null;
              hoverCellRef.current = null;
              onClearHover();
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
                onViewChange((current) => ({
                  ...current,
                  scale: Math.min(8, current.scale * 1.25),
                }))
              }
              aria-label="Zoom in"
            >
              +
            </Button>
            <span>{Math.round(view.scale * 100)}%</span>
            <Button
              type="button"
              onClick={() =>
                onViewChange((current) => ({
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
        {customCursor && hoverCell ? (
          <div
            className="save-explorer-map-cursor"
            style={{
              left: view.offsetX + (hoverCell.mapX + 0.5) * view.scale,
              top: view.offsetY + (hoverCell.mapY + 0.5) * view.scale,
              width: Math.max(16, view.scale + 4),
              height: Math.max(16, view.scale + 4),
            }}
            aria-hidden="true"
          />
        ) : null}
        {hoverCell ? (
          <div
            className="save-explorer-map-tooltip"
            style={{
              left: view.offsetX + (hoverCell.mapX + 1) * view.scale + 12,
              top: view.offsetY + hoverCell.mapY * view.scale + 12,
            }}
          >
            {inspection ? (
              <>
                <div>
                  world {inspection.worldX},{inspection.worldY}
                </div>
                {inspection.revealed ? (
                  <>
                    <div>{inspection.kind ?? "unknown"}</div>
                    {inspection.type === undefined ? (
                      <div>unknown value</div>
                    ) : (
                      <div>
                        {inspection.name ?? "unknown"} (type {inspection.type})
                      </div>
                    )}
                    {inspection.terrainHp === undefined ? null : (
                      <div>terrain HP {inspection.terrainHp}</div>
                    )}
                    {inspection.particle === undefined ? null : (
                      <div>particle {inspection.particle ? "yes" : "no"}</div>
                    )}
                    {inspection.velocity ? (
                      <div>
                        velocity {inspection.velocity.x.toFixed(2)},{" "}
                        {inspection.velocity.y.toFixed(2)}
                      </div>
                    ) : null}
                    {inspection.structures?.length ? (
                      <div>
                        structures:{" "}
                        {inspection.structures
                          .map((structure) => structure.name ?? `type ${structure.type}`)
                          .join(", ")}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div>unrevealed</div>
                )}
              </>
            ) : (
              <div>inspecting…</div>
            )}
          </div>
        ) : null}
      </div>
      {raster ? (
        <div className="border-t border-slate-800 px-4 py-3 font-mono text-xs text-slate-500">
          {message} · {raster.width}×{raster.height} minimap pixels
        </div>
      ) : null}
    </Panel>
  );
}
