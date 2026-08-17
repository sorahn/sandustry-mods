import { Panel } from "@sandustry/ui/react";
import { type Blueprint } from "../utils/blueprint";
import { BlueprintMap } from "./BlueprintMap";
import { PersistentCheckbox } from "./PersistentCheckbox";

export const SHOW_MAP_SIDEBAR_KEY = "sandustry.blueprintInspector.showMapSidebar";
export const SHOW_GRID_KEY = "sandustry.blueprintInspector.showGrid";
export const SHOW_PNG_BACKGROUND_KEY = "sandustry.blueprintInspector.showPngBackground";

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
          />
          <PersistentCheckbox
            boxed
            size="small"
            label="PNG: blue"
            storageKey={SHOW_PNG_BACKGROUND_KEY}
            defaultChecked={showPngBackground}
            onCheckedChange={onShowPngBackgroundChange}
          />
          <PersistentCheckbox
            boxed
            size="small"
            label="sidebar"
            storageKey={SHOW_MAP_SIDEBAR_KEY}
            defaultChecked={showSidebar}
            onCheckedChange={onShowSidebarChange}
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
        />
        <p className="mt-4 text-xs text-slate-500">
          The captured native runtime catalog supplies names and footprints. Other content remains
          visible through the unknown-ID fallback.
        </p>
      </div>
    </Panel>
  );
}
