import { describe, expect, test } from "bun:test";
import {
  REMEMBER_BLUEPRINT_KEY,
  SAVED_BLUEPRINT_KEY,
  SAVED_MAP_VIEW_KEY,
  SHOW_CUSTOM_SHAPES_KEY,
  SHOW_DEBUG_CELLS_KEY,
  SHOW_FOUNDATION_OUTLINES_KEY,
  SHOW_GRID_KEY,
  SHOW_MAP_SIDEBAR_KEY,
  SHOW_NAMES_KEY,
  SHOW_PNG_BACKGROUND_KEY,
  SHOW_SIGNAL_LINKS_KEY,
  SHOW_SPRITES_KEY,
} from "../storage-keys";

describe("site storage keys", () => {
  test("use the site namespace and remain unique", () => {
    const keys = [
      REMEMBER_BLUEPRINT_KEY,
      SAVED_BLUEPRINT_KEY,
      SAVED_MAP_VIEW_KEY,
      SHOW_MAP_SIDEBAR_KEY,
      SHOW_GRID_KEY,
      SHOW_PNG_BACKGROUND_KEY,
      SHOW_DEBUG_CELLS_KEY,
      SHOW_NAMES_KEY,
      SHOW_SPRITES_KEY,
      SHOW_CUSTOM_SHAPES_KEY,
      SHOW_FOUNDATION_OUTLINES_KEY,
      SHOW_SIGNAL_LINKS_KEY,
    ];

    expect(keys.every((key) => key.startsWith("sandustry.blueprintInspector."))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("keeps the blueprint payload keys distinct from view options", () => {
    expect(REMEMBER_BLUEPRINT_KEY).not.toBe(SAVED_BLUEPRINT_KEY);
    expect(SAVED_BLUEPRINT_KEY).not.toBe(SAVED_MAP_VIEW_KEY);
    expect(SHOW_GRID_KEY).not.toBe(SHOW_SPRITES_KEY);
  });
});
