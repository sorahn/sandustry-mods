import { Panel } from "@sandustry/ui";
import { type Blueprint } from "../utils/blueprint";
import { BlueprintMap } from "./BlueprintMap";
import { PersistentCheckbox } from "./PersistentCheckbox";
import {
  SHOW_GRID_KEY,
  SHOW_MAP_SIDEBAR_KEY,
  SHOW_PNG_BACKGROUND_KEY,
} from "../utils/storage-keys";

type BlueprintMapPanelProps = {
  blueprint: Blueprint;
  remember: boolean;
  blueprintKey: string;
  showSidebar: boolean;
  onShowSidebarChange: (value: boolean) => void;
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
  showPngBackground: boolean;
  onShowPngBackgroundChange: (value: boolean) => void;
  resetVersion?: number;
  onResetMapOptions: () => void;
};

export function BlueprintMapPanel({
  blueprint,
  remember,
  blueprintKey,
  showSidebar,
  onShowSidebarChange,
  showGrid,
  onShowGridChange,
  showPngBackground,
  onShowPngBackgroundChange,
  resetVersion,
  onResetMapOptions,
}: BlueprintMapPanelProps) {
  return (
    <Panel
      title="Blueprint map"
      header={
        <div className="flex gap-2">
          <PersistentCheckbox
            boxed
            size="small"
            label="grid"
            storageKey={SHOW_GRID_KEY}
            defaultChecked={showGrid}
            onCheckedChange={onShowGridChange}
            resetVersion={resetVersion}
          />
          <PersistentCheckbox
            boxed
            size="small"
            label="PNG: blue"
            storageKey={SHOW_PNG_BACKGROUND_KEY}
            defaultChecked={showPngBackground}
            onCheckedChange={onShowPngBackgroundChange}
            resetVersion={resetVersion}
          />
          <PersistentCheckbox
            boxed
            size="small"
            label="sidebar"
            storageKey={SHOW_MAP_SIDEBAR_KEY}
            defaultChecked={showSidebar}
            onCheckedChange={onShowSidebarChange}
            resetVersion={resetVersion}
          />
        </div>
      }
    >
      <div className="p-4">
        <BlueprintMap
          blueprint={blueprint}
          remember={remember}
          blueprintKey={blueprintKey}
          showSidebar={showSidebar}
          showGrid={showGrid}
          showPngBackground={showPngBackground}
          resetVersion={resetVersion}
          onResetMapOptions={onResetMapOptions}
        />
        <p className="mt-4 text-xs text-slate-500">
          The captured native runtime catalog supplies names and footprints. Other content remains
          visible through the unknown-ID fallback.
        </p>
        <div
          className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-400"
          aria-labelledby="blueprint-map-support-title"
        >
          <h2
            id="blueprint-map-support-title"
            className="font-mono text-xs uppercase tracking-wide text-slate-300"
          >
            Map support notes
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-emerald-300">Works here</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5">
                <li>
                  Current v2 binary and text blueprints, including filters and saved structure data.
                </li>
                <li>
                  Known native structures from the captured catalog, with pan, zoom, grid, and
                  selection details.
                </li>
                <li>
                  Unknown and mod structure IDs remain visible with a clearly marked fallback.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-amber-300">Not fully supported yet</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5">
                <li>
                  Pipe structures and their connection/topology visuals are not calibrated yet.
                </li>
                <li>
                  Some rotations, variants, multi-cell visuals, and newer or modded structures may
                  be approximate.
                </li>
                <li>
                  Custom Wall Light colors cannot be recovered from exported blueprint data yet.
                </li>
                <li>
                  The map is an inspector, not a game simulation: it does not validate placement,
                  power, flow, or behavior.
                </li>
                <li>Legacy v1 strings belong in the codec conversion tool, not this renderer.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Blueprint data can also omit runtime-only state, so the map may not reproduce every
            detail from the original save.
          </p>
        </div>
      </div>
    </Panel>
  );
}
