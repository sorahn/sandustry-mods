import { describe, expect, test } from "bun:test";
import { wrapLabel } from "@sandustry/blueprint-core";
import { decodeBlueprint, encodeBlueprint } from "../src/utils/blueprint";
import { snapMapZoom, structureShape, viewportHeightForWidth } from "../src/utils/blueprint-map";

describe("blueprint site utilities", () => {
  test("round-trips binary and text blueprint formats", () => {
    const blueprint = {
      name: "Bun fixture",
      data: [{ type: "machine", x: 4, y: 8, data: { enabled: true } }],
      signalLinks: null,
    };

    expect(decodeBlueprint(encodeBlueprint(blueprint))).toEqual({
      ...blueprint,
      signalLinks: [],
    });
    expect(decodeBlueprint(encodeBlueprint(blueprint, "text"))).toEqual({
      ...blueprint,
      signalLinks: [],
    });
  });

  test("converts legacy blueprint strings for browser-only migration", () => {
    const blueprint = { name: "Legacy", data: [{ type: 3, x: 1, y: 2 }], signalLinks: null };
    expect(decodeBlueprint(encodeBlueprint(blueprint, "legacy"))).toEqual(blueprint);
  });

  test("keeps map presentation math stable", () => {
    expect(snapMapZoom(1.18)).toBe(1);
    expect(viewportHeightForWidth(1600)).toBe(1002);
    expect(wrapLabel("Signal Presence Sensor", 8)).toEqual(["Signal", "Presence", "Sensor"]);
  });

  test("extracts custom structure shapes", () => {
    expect(
      structureShape({
        type: "wallLight",
        x: 0,
        y: 0,
        data: {
          __prefabulatorBlueprint: {
            definition: {
              shape: [
                [1, 0],
                [1, 1],
              ],
            },
          },
        },
      }),
    ).toEqual([
      [1, 0],
      [1, 1],
    ]);
  });
});
