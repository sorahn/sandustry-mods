import { Fragment } from "react";
import { PersistentCheckbox } from "./PersistentCheckbox";

const SHOW_DEBUG_CELLS_KEY = "sandustry.blueprintInspector.showDebugCells";
const SHOW_NAMES_KEY = "sandustry.blueprintInspector.showNames";
const SHOW_SPRITES_KEY = "sandustry.blueprintInspector.showSprites";
const SHOW_CUSTOM_SHAPES_KEY = "sandustry.blueprintInspector.showCustomShapes";
const SHOW_FOUNDATION_OUTLINES_KEY = "sandustry.blueprintInspector.showFoundationOutlines";
const SHOW_SIGNAL_LINKS_KEY = "sandustry.blueprintInspector.showSignalLinks";

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
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="names"
      storageKey={SHOW_NAMES_KEY}
      defaultChecked={showNames}
      onCheckedChange={onShowNamesChange}
      onInitialCheckedChange={onShowNamesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="sprites"
      storageKey={SHOW_SPRITES_KEY}
      defaultChecked={showSprites}
      onCheckedChange={onShowSpritesChange}
      onInitialCheckedChange={onShowSpritesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="custom shapes"
      storageKey={SHOW_CUSTOM_SHAPES_KEY}
      defaultChecked={showCustomShapes}
      onCheckedChange={onShowCustomShapesChange}
      onInitialCheckedChange={onShowCustomShapesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="foundation outlines"
      storageKey={SHOW_FOUNDATION_OUTLINES_KEY}
      defaultChecked={showFoundationOutlines}
      onCheckedChange={onShowFoundationOutlinesChange}
      onInitialCheckedChange={onShowFoundationOutlinesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="signals"
      storageKey={SHOW_SIGNAL_LINKS_KEY}
      defaultChecked={showSignalLinks}
      onCheckedChange={onShowSignalLinksChange}
      onInitialCheckedChange={onShowSignalLinksChange}
    />,
  ];

  return (
    <div className="flex flex-row flex-wrap gap-2">
      {toggles.map((toggle, index) => (
        <Fragment key={index}>{toggle}</Fragment>
      ))}
    </div>
  );
}
