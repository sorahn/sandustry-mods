import { Fragment } from "react";
import { PersistentCheckbox } from "./PersistentCheckbox";

const SHOW_DEBUG_CELLS_KEY = "sandustry.blueprintInspector.showDebugCells";
const SHOW_NAMES_KEY = "sandustry.blueprintInspector.showNames";
const HIDE_SPRITES_KEY = "sandustry.blueprintInspector.hideSprites";
const SHOW_CUSTOM_SHAPES_KEY = "sandustry.blueprintInspector.showCustomShapes";
const HIDE_FOUNDATION_OUTLINES_KEY = "sandustry.blueprintInspector.hideFoundationOutlines";
const SHOW_SIGNAL_LINKS_KEY = "sandustry.blueprintInspector.showSignalLinks";

type MapDebugOptionsProps = {
  showDebugCells: boolean;
  onShowDebugCellsChange: (value: boolean) => void;
  showNames: boolean;
  onShowNamesChange: (value: boolean) => void;
  hideSprites: boolean;
  onHideSpritesChange: (value: boolean) => void;
  showCustomShapes: boolean;
  onShowCustomShapesChange: (value: boolean) => void;
  hideFoundationOutlines: boolean;
  onHideFoundationOutlinesChange: (value: boolean) => void;
  showSignalLinks: boolean;
  onShowSignalLinksChange: (value: boolean) => void;
};

export function MapDebugOptions({
  showDebugCells,
  onShowDebugCellsChange,
  showNames,
  onShowNamesChange,
  hideSprites,
  onHideSpritesChange,
  showCustomShapes,
  onShowCustomShapesChange,
  hideFoundationOutlines,
  onHideFoundationOutlinesChange,
  showSignalLinks,
  onShowSignalLinksChange,
}: MapDebugOptionsProps) {
  const toggles = [
    <PersistentCheckbox
      boxed
      size="small"
      label="debug cells"
      storageKey={SHOW_DEBUG_CELLS_KEY}
      defaultChecked={showDebugCells}
      onCheckedChange={onShowDebugCellsChange}
      onInitialCheckedChange={onShowDebugCellsChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="show names"
      storageKey={SHOW_NAMES_KEY}
      defaultChecked={showNames}
      onCheckedChange={onShowNamesChange}
      onInitialCheckedChange={onShowNamesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="hide sprites"
      storageKey={HIDE_SPRITES_KEY}
      defaultChecked={hideSprites}
      onCheckedChange={onHideSpritesChange}
      onInitialCheckedChange={onHideSpritesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="show custom shapes"
      storageKey={SHOW_CUSTOM_SHAPES_KEY}
      defaultChecked={showCustomShapes}
      onCheckedChange={onShowCustomShapesChange}
      onInitialCheckedChange={onShowCustomShapesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="hide foundation outlines"
      storageKey={HIDE_FOUNDATION_OUTLINES_KEY}
      defaultChecked={hideFoundationOutlines}
      onCheckedChange={onHideFoundationOutlinesChange}
      onInitialCheckedChange={onHideFoundationOutlinesChange}
    />,
    <PersistentCheckbox
      boxed
      size="small"
      label="signal links"
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
