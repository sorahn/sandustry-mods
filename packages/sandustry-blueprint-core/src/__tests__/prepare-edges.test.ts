import { describe, expect, test } from "bun:test";
import {
  customShapeFromStructure,
  defaultSignalPoints,
  foundationOutlinePath,
  prepareBlueprint,
  shapeForStructure,
  structureTopY,
  structureVisualTopY,
} from "../prepare";

describe("blueprint preparation edges", () => {
  test("exposes native signal point defaults", () => {
    expect(defaultSignalPoints("signalAnd")).toEqual({
      input: { x: 0, y: 0 },
      output: { x: 3, y: 3 },
    });
    expect(defaultSignalPoints("signalButton")).toEqual({ output: { x: 3, y: 3 } });
    expect(defaultSignalPoints("signalSensor")).toEqual({ shared: { x: 3, y: 3 } });
    expect(defaultSignalPoints("signalBuffer")).toEqual({ shared: { x: 1.5, y: 1.5 } });
    expect(defaultSignalPoints(12)).toBeUndefined();
    expect(defaultSignalPoints("unknown")).toBeUndefined();
  });

  test("accepts only rectangular finite custom shapes", () => {
    const valid = {
      type: "custom",
      x: 0,
      y: 0,
      data: {
        __prefabulatorBlueprint: {
          definition: {
            shape: [
              [1, 0],
              [0, 1],
            ],
          },
        },
      },
    };
    expect(customShapeFromStructure(valid)).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(shapeForStructure(valid, { shape: [[1]] })).toEqual([
      [1, 0],
      [0, 1],
    ]);
    for (const shape of [[], [[1], [1, 0]], [[1, Number.NaN]]]) {
      expect(
        customShapeFromStructure({
          ...valid,
          data: { __prefabulatorBlueprint: { definition: { shape } } },
        }),
      ).toBeUndefined();
    }
    expect(customShapeFromStructure({ ...valid, data: undefined })).toBeUndefined();
  });

  test("calculates bottom anchors and cell-scaled visual positions", () => {
    const structure = { type: "machine", x: 4, y: 10 };
    const footprint = { width: 4, height: 4 };
    const asset = {
      anchor: { edge: "bottom", offsetCells: 1 },
      offset: { y: 4 },
      scale: { mode: "cell", factor: 2 },
      frame: { width: 4, height: 4 },
      sourceSize: { width: 4, height: 12 },
    };
    expect(structureTopY(structure, footprint, asset)).toBe(7);
    expect(structureVisualTopY(structure, footprint, asset)).toBe(7);
    expect(structureVisualTopY(structure, footprint, { offset: { y: 4 } })).toBe(11);
  });

  test("prepares color formats, sprite states, custom resolver points, and bounds", () => {
    const blueprint = {
      name: "Prepared",
      data: [
        { type: "signalLamp", x: 0, y: 0, data: { on: true } },
        { type: "signalGate", x: 4, y: 0, data: { desiredOpen: false } },
        { type: "wallLight", x: 0, y: 4, data: { state: { lightColor: 0xff0080 } } },
      ],
      signalLinks: [{ from: { x: 0, y: 0 }, to: { x: 4, y: 0 }, on: true }],
    };
    const prepared = prepareBlueprint(blueprint, {
      catalog: {
        get: (type) => (type === "wallLight" ? { footprint: { width: 2, height: 2 } } : undefined),
      },
      resolveSignalPoints: () => ({ output: { x: 1, y: 1 }, input: { x: 2, y: 2 } }),
    });
    expect(prepared.preparedStructures.map(({ spriteIndex }) => spriteIndex)).toEqual([
      1,
      0,
      undefined,
    ]);
    expect(prepared.preparedStructures[2].lightColor).toBe("#ff0080");
    expect(prepared.preparedStructures[2].bounds).toEqual({ minX: 0, minY: 4, maxX: 1, maxY: 5 });
    expect(prepared.bounds).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 5 });
    expect(prepared.preparedSignalLinks[0]).toMatchObject({
      fromStructureIndex: 0,
      toStructureIndex: 1,
      fromPoint: { x: 1, y: 1 },
      toPoint: { x: 6, y: 2 },
      sourceType: "signalLamp",
    });
  });

  test("selects collector corner, edge, and side frames", () => {
    const data = [
      [0, 0],
      [4, 0],
      [8, 0],
      [0, 4],
      [4, 4],
      [8, 4],
      [0, 8],
      [4, 8],
      [8, 8],
    ].map(([x, y]) => ({ type: "collector", x, y }));
    const prepared = prepareBlueprint(
      { name: "Collectors", data, signalLinks: null },
      {
        catalog: {
          get: () => ({
            renderAsset: {
              animation: {
                topology: "collector",
                cornerFrame: 10,
                edgeFrame: 11,
                sideRotation: 45,
              },
            },
          }),
        },
      },
    );
    const states = prepared.preparedStructures.map(({ sprite }) => [
      sprite?.frameIndex,
      sprite?.rotation,
    ]);
    expect(states).toEqual([
      [10, 0],
      [11, 0],
      [10, 0],
      [11, 45],
      [2, 0],
      [11, 45],
      [10, 0],
      [11, 0],
      [10, 0],
    ]);
  });

  test("omits non-foundation structures from the foundation outline", () => {
    const prepared = prepareBlueprint({
      name: "Only machine",
      data: [{ type: "machine", x: 0, y: 0 }],
      signalLinks: null,
    });
    expect(foundationOutlinePath(prepared.preparedStructures, 0, 0, 1, 8)).toBe("");
  });

  test("uses raw-shape metadata instead of generic structure shapes", () => {
    const transparent = prepareBlueprint(
      {
        name: "Transparent machine",
        data: [{ type: "machine", x: 0, y: 0 }],
        signalLinks: null,
      },
      {
        catalog: {
          get: () => ({
            footprint: { width: 4, height: 4 },
            shape: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 1)),
            rawShape: false,
          }),
        },
      },
    );
    expect(foundationOutlinePath(transparent.preparedStructures, 0, 0, 1, 8)).toBe("");

    const raw = prepareBlueprint(
      {
        name: "Raw machine",
        data: [{ type: "machine", x: 0, y: 0 }],
        signalLinks: null,
      },
      {
        catalog: {
          get: () => ({
            footprint: { width: 4, height: 4 },
            shape: [
              [1, 1, 0, 0],
              [1, 1, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
            rawShape: true,
          }),
        },
      },
    );
    expect(foundationOutlinePath(raw.preparedStructures, 0, 0, 1, 8)).not.toBe("");
  });

  test("treats glass foundation and prefab terrain as solid boundary masks", () => {
    const glass = prepareBlueprint(
      {
        name: "Glass",
        data: [{ type: "glassFoundation", x: 0, y: 0 }],
        signalLinks: null,
      },
      {
        catalog: {
          get: () => ({
            footprint: { width: 4, height: 4 },
            shape: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 1)),
            rawShape: true,
          }),
        },
      },
    );
    expect(foundationOutlinePath(glass.preparedStructures, 0, 0, 1, 8)).not.toBe("");

    const prefab = prepareBlueprint({
      name: "Prefab terrain",
      data: [
        {
          type: "prefabTerrain",
          x: 0,
          y: 0,
          data: {
            __prefabulatorBlueprint: {
              definition: {
                shape: [
                  [1, 1, 0],
                  [1, 0, 0],
                ],
              },
            },
          },
        },
      ],
      signalLinks: null,
    });
    expect(foundationOutlinePath(prefab.preparedStructures, 0, 0, 1, 8)).not.toBe("");
  });
});
