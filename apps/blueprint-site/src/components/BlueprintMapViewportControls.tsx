export function BlueprintMapViewportControls({
  zoom,
  minZoom,
  maxZoom,
  measuredFitZoom,
  fitMode,
  pan,
  onExport,
  onZoomOut,
  onFit,
  onZoomIn,
}: {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  measuredFitZoom: number;
  fitMode: boolean;
  pan: { x: number; y: number };
  onExport: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onZoomIn: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded border border-slate-700/80 bg-slate-950/60 p-2 font-mono text-xs text-slate-300 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        className="sd-button sd-button--compact sd-button--no-shift"
        onClick={onExport}
      >
        Export PNG
      </button>
      <span className="mr-1">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        className="sd-button sd-button--compact sd-button--no-shift"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        className="sd-button sd-button--compact sd-button--no-shift"
        onClick={onFit}
        disabled={fitMode && zoom === measuredFitZoom && pan.x === 0 && pan.y === 0}
      >
        Fit
      </button>
      <button
        type="button"
        className="sd-button sd-button--compact sd-button--no-shift"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}
