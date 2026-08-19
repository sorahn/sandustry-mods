import { Button, buttonStyles } from "@sandustry/ui/react";
import cx from "clsx";

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
      <Button
        type="button"
        className={cx(buttonStyles.compact, buttonStyles.noShift)}
        onClick={onExport}
      >
        Export PNG
      </Button>
      <span className="mr-1">{Math.round(zoom * 100)}%</span>
      <Button
        type="button"
        className={cx(buttonStyles.compact, buttonStyles.noShift)}
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button
        type="button"
        className={cx(buttonStyles.compact, buttonStyles.noShift)}
        onClick={onFit}
        disabled={fitMode && zoom === measuredFitZoom && pan.x === 0 && pan.y === 0}
      >
        Fit
      </Button>
      <Button
        type="button"
        className={cx(buttonStyles.compact, buttonStyles.noShift)}
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom in"
      >
        +
      </Button>
    </div>
  );
}
