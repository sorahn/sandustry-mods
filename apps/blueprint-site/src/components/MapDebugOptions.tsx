import { Fragment } from "react";
import cx from "clsx";
import { PersistentCheckbox } from "./PersistentCheckbox";
import {
  SHOW_CUSTOM_SHAPES_KEY,
  SHOW_DEBUG_CELLS_KEY,
  SHOW_FOUNDATION_OUTLINES_KEY,
  SHOW_NAMES_KEY,
  SHOW_RAW_STRUCTURES_KEY,
  SHOW_SIGNAL_LINKS_KEY,
  SHOW_SPRITES_KEY,
} from "../utils/storage-keys";
import { Divider, IconButton } from "@sandustry/ui";

type MapDebugOptionsProps = {
  showDebugCells: boolean;
  onShowDebugCellsChange: (value: boolean) => void;
  showNames: boolean;
  onShowNamesChange: (value: boolean) => void;
  showSprites: boolean;
  onShowSpritesChange: (value: boolean) => void;
  showCustomShapes: boolean;
  onShowCustomShapesChange: (value: boolean) => void;
  showFoundationOutlines: boolean;
  onShowFoundationOutlinesChange: (value: boolean) => void;
  showSignalLinks: boolean;
  onShowSignalLinksChange: (value: boolean) => void;
  showRawStructures: boolean;
  onShowRawStructuresChange: (value: boolean) => void;
  resetVersion?: number;
  onReset: () => void;
};

export function MapDebugOptions({
  showDebugCells,
  onShowDebugCellsChange,
  showNames,
  onShowNamesChange,
  showSprites,
  onShowSpritesChange,
  showCustomShapes,
  onShowCustomShapesChange,
  showFoundationOutlines,
  onShowFoundationOutlinesChange,
  showSignalLinks,
  onShowSignalLinksChange,
  showRawStructures,
  onShowRawStructuresChange,
  resetVersion,
  onReset,
}: MapDebugOptionsProps) {
  const toggles = [
    <PersistentCheckbox
      boxed
      size="small"
      label="cells"
      storageKey={SHOW_DEBUG_CELLS_KEY}
      defaultChecked={showDebugCells}
      onCheckedChange={onShowDebugCellsChange}
      onInitialCheckedChange={onShowDebugCellsChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="names"
      storageKey={SHOW_NAMES_KEY}
      defaultChecked={showNames}
      onCheckedChange={onShowNamesChange}
      onInitialCheckedChange={onShowNamesChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="sprites"
      storageKey={SHOW_SPRITES_KEY}
      defaultChecked={showSprites}
      onCheckedChange={onShowSpritesChange}
      onInitialCheckedChange={onShowSpritesChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="shapes"
      storageKey={SHOW_CUSTOM_SHAPES_KEY}
      defaultChecked={showCustomShapes}
      onCheckedChange={onShowCustomShapesChange}
      onInitialCheckedChange={onShowCustomShapesChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="signals"
      storageKey={SHOW_SIGNAL_LINKS_KEY}
      defaultChecked={showSignalLinks}
      onCheckedChange={onShowSignalLinksChange}
      onInitialCheckedChange={onShowSignalLinksChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="outlines"
      storageKey={SHOW_FOUNDATION_OUTLINES_KEY}
      defaultChecked={showFoundationOutlines}
      onCheckedChange={onShowFoundationOutlinesChange}
      onInitialCheckedChange={onShowFoundationOutlinesChange}
      resetVersion={resetVersion}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="structures"
      storageKey={SHOW_RAW_STRUCTURES_KEY}
      defaultChecked={showRawStructures}
      onCheckedChange={onShowRawStructuresChange}
      onInitialCheckedChange={onShowRawStructuresChange}
      resetVersion={resetVersion}
    />,
  ];

  return (
    <>
      <p
        className={cx(
          "font-mono uppercase tracking-[0.18em] text-slate-500 flex flex-row items-center justify-between",
        )}
      >
        <span>Debug Options</span>
        <IconButton size="small" label="Reset" onClick={onReset}>
          ↺
        </IconButton>
      </p>

      <div className="flex flex-row flex-wrap gap-2 mt-3">
        {toggles.map((toggle, index) => (
          <Fragment key={index}>{toggle}</Fragment>
        ))}
      </div>
      <Divider className="my-4" />
    </>
  );
}
