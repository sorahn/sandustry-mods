import { expect, test } from "bun:test";
import { SAVE_EXPLORER_LAYER_ORDER, saveExplorerLayerIndex } from "../src/index";

test("defines the save explorer layers from back to front", () => {
  expect(SAVE_EXPLORER_LAYER_ORDER).toEqual([
    "background",
    "wall",
    "matrix",
    "structures",
    "lights",
    "authorization",
    "fog",
    "grid",
    "hoverHighlight",
  ]);
  expect(saveExplorerLayerIndex("background")).toBe(0);
  expect(saveExplorerLayerIndex("hoverHighlight")).toBe(8);
});
