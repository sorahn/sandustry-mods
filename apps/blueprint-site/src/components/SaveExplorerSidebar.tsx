import { Button, Checkbox, Panel } from "@sandustry/ui";
import type { SaveExplorerDocument } from "@sandustry/save-core";

export type SaveExplorerLayers = {
  terrain: boolean;
  settledElements: boolean;
  elements: boolean;
  particles: boolean;
  walls: boolean;
  structures: boolean;
  fog: boolean;
  authorization: boolean;
};

type SaveExplorerSidebarProps = {
  document: SaveExplorerDocument | null;
  busy: boolean;
  message: string;
  remember: boolean;
  hasCurrentSave: boolean;
  layers: SaveExplorerLayers;
  customCursor: boolean;
  onRemember: () => void;
  onLayerChange: (layer: keyof SaveExplorerLayers, checked: boolean) => void;
  onCustomCursorChange: (checked: boolean) => void;
};

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

export function SaveExplorerSidebar({
  document,
  busy,
  message,
  remember,
  hasCurrentSave,
  layers,
  customCursor,
  onRemember,
  onLayerChange,
  onCustomCursorChange,
}: SaveExplorerSidebarProps) {
  return (
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
            onClick={onRemember}
            disabled={!remember && !hasCurrentSave}
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
      <Panel title="Minimap layers" contentClassName="space-y-2 p-4 text-xs">
        {(Object.keys(layers) as Array<keyof SaveExplorerLayers>)
          .filter((layer) => (layer !== "fog" && layer !== "authorization") || import.meta.env.DEV)
          .map((layer) => (
            <Checkbox
              key={layer}
              boxed
              size="small"
              label={
                layer === "settledElements"
                  ? "settled elements"
                  : layer === "particles"
                    ? "particles"
                    : layer === "authorization"
                      ? "authorization zones"
                      : layer
              }
              checked={layers[layer]}
              onChange={(event) => onLayerChange(layer, event.target.checked)}
            />
          ))}
        {import.meta.env.DEV ? (
          <Checkbox
            boxed
            size="small"
            label="custom cursor"
            checked={customCursor}
            onChange={(event) => onCustomCursorChange(event.target.checked)}
          />
        ) : null}
      </Panel>
      <Panel
        title="Current scope"
        contentClassName="space-y-2 p-4 text-xs leading-5 text-slate-500"
      >
        <p>✓ browser save decoding</p>
        <p>✓ 4×4 cell minimap aggregation</p>
        <p>✓ fog masking</p>
        <p>✓ minimap zoom, pan, and layer toggles</p>
        <p>○ cell inspection</p>
      </Panel>
    </div>
  );
}
