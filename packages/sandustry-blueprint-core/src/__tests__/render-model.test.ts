import { describe, expect, test } from "bun:test";
import {
  createBlueprintRenderModel,
  renderAnchorEdge,
  renderAnchorOffsetCells,
  renderPixelScale,
  renderScaleFactor,
  renderScaleMode,
  structureLabel,
  tileColor,
  wrapLabel,
} from "../render-model";

describe("render-model helpers", () => {
  test("formats labels, colors, and scale metadata", () => {
    expect(structureLabel(12)).toBe("native 12");
    expect(structureLabel("machine")).toBe("machine");
    expect(tileColor(12)).toBe("#314158");
    expect(tileColor("machine")).toMatch(/^#[0-9a-f]{6}$/);
    expect(renderPixelScale(8)).toBe(2);
    expect(renderScaleMode("cell")).toBe("cell");
    expect(renderScaleMode({ mode: "cell", factor: 3 })).toBe("cell");
    expect(renderScaleFactor("cell")).toBe(1);
    expect(renderScaleFactor({ mode: "cell", factor: 3 })).toBe(3);
    expect(renderAnchorEdge("bottom")).toBe("bottom");
    expect(renderAnchorEdge({ edge: "bottom", offsetCells: 2 })).toBe("bottom");
    expect(renderAnchorOffsetCells(undefined)).toBe(0);
    expect(renderAnchorOffsetCells({ edge: "bottom", offsetCells: 2 })).toBe(2);
  });

  test("wraps long words and preserves empty labels", () => {
    expect(wrapLabel("Signal Presence Sensor", 8)).toEqual(["Signal", "Presence", "Sensor"]);
    expect(wrapLabel("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrapLabel("", 4)).toEqual([""]);
    expect(wrapLabel("  one   two  ", 20)).toEqual(["one two"]);
  });

  test("handles empty blueprints and applies asset offsets when calculating bounds", () => {
    const empty = createBlueprintRenderModel({ name: "Empty", data: [], signalLinks: null });
    expect(empty).toMatchObject({ minX: 0, maxX: 0, minY: 0, maxY: 0, width: 104, height: 104 });
    expect(empty.renderStructures).toEqual([]);

    const model = createBlueprintRenderModel(
      { name: "Offset", data: [{ type: "machine", x: 4, y: 8 }], signalLinks: null },
      {
        padding: 1,
        cell: 4,
        catalog: {
          get: () => ({
            footprint: { width: 2, height: 3 },
            renderAsset: { offset: { x: -2, y: 4 } },
            z: 2,
          }),
        },
      },
    );
    expect(model).toMatchObject({ minX: 3.5, maxX: 4.5, minY: 9, maxY: 10, width: 16, height: 16 });
  });

  test("sorts structures by z, then position, then source index", () => {
    const model = createBlueprintRenderModel(
      {
        name: "Sort",
        data: [
          { type: "late", x: 0, y: 1 },
          { type: "early", x: 1, y: 0 },
          { type: "same", x: 0, y: 0 },
        ],
        signalLinks: null,
      },
      {
        catalog: {
          get: (type) => ({ z: type === "late" ? 2 : 1, footprint: { width: 1, height: 1 } }),
        },
      },
    );
    expect(model.renderStructures.map(({ structure }) => structure.type)).toEqual([
      "same",
      "early",
      "late",
    ]);
  });
});
