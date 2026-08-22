import { expect, test } from "bun:test";
import {
  decodeBrowserSave,
  classifySaveExplorerMatrixValue,
  inspectSaveExplorerCell,
  normalizeSaveDocument,
  createSaveExplorerTileIndex,
  renderMinimapRgba,
  saveExplorerElementName,
  saveExplorerStructureName,
  saveExplorerTerrainName,
} from "../src/index";

test("resolves known first-party catalog names", () => {
  expect(saveExplorerTerrainName(44)).toBe("Copper");
  expect(saveExplorerTerrainName(54)).toBeUndefined();
  expect(saveExplorerElementName(19)).toBe("Lava");
  expect(saveExplorerElementName(33)).toBeUndefined();
  expect(saveExplorerStructureName(16)).toBe("Collector");
  expect(saveExplorerStructureName("signalAnd")).toBe("Signal AND");
});

test("classifies terrain, settled elements, moving elements, and particles", () => {
  expect(classifySaveExplorerMatrixValue(0)).toBe("empty");
  expect(classifySaveExplorerMatrixValue(12)).toBe("terrain");
  expect(classifySaveExplorerMatrixValue(-1204)).toBe("terrain");
  expect(classifySaveExplorerMatrixValue(101)).toBe("settled-element");
  expect(classifySaveExplorerMatrixValue(119)).toBe("settled-element");
  expect(classifySaveExplorerMatrixValue(123)).toBe("settled-element");
  expect(classifySaveExplorerMatrixValue({ type: 10, velocity: { x: 0, y: 0 } })).toBe(
    "settled-element",
  );
  expect(classifySaveExplorerMatrixValue({ type: 10, velocity: { x: 1, y: 0 } })).toBe(
    "moving-element",
  );
  expect(classifySaveExplorerMatrixValue({ type: 10, particle: true })).toBe("moving-particle");
  expect(classifySaveExplorerMatrixValue({ particle: true })).toBe("unknown");
});

test("inspects revealed minimap cells without exposing fogged contents", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: {
        world: { size: { width: 8, height: 4 } },
        mods: { map: { fogBuffer: [255, 0], fogWidth: 2, fogHeight: 1 } },
        structures: [{ type: 16, x: 0, y: 0 }],
      },
      matrix: [2, 4, { type: 10, particle: true }, 4, 0, 24],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as import("../src/index").SaveGameDocument;
  expect(inspectSaveExplorerCell(save, 0, 0)).toMatchObject({
    revealed: true,
    kind: "terrain",
    name: "Dirt",
    structures: [{ type: 16, x: 0, y: 0 }],
  });

  const numericElementSave = {
    ...save,
    payload: { ...save.payload, matrix: [119, 1, 0, 31] },
  } as import("../src/index").SaveGameDocument;
  expect(inspectSaveExplorerCell(numericElementSave, 0, 0)).toMatchObject({
    kind: "settled-element",
    type: 19,
    name: "Lava",
  });

  expect(inspectSaveExplorerCell(save, 1, 0)).toEqual({
    mapX: 1,
    mapY: 0,
    worldX: 4,
    worldY: 0,
    width: 4,
    height: 4,
    fogValue: 0,
    revealed: false,
  });
});

const fixture = (name: string) => Bun.file(new URL(`./visual/saves/${name}`, import.meta.url));
const repositoryFixture = (name: string) =>
  Bun.file(new URL(`../../../resources/${name}`, import.meta.url));

test("normalizes save metadata, layers, structures, and elements", async () => {
  const save = await decodeBrowserSave(await fixture("main-save.save").bytes());
  const document = normalizeSaveDocument(save, { supportedGameVersions: ["0.5.2"] });

  expect(document.documentVersion).toBe(1);
  expect(document.format).toBe("browser-json-gzip");
  expect(document.metadata.worldId).toBe("sm3f52pn6i9");
  expect(document.world).toEqual({
    width: 3840,
    height: 3840,
    playerPosition: { x: 5498.258793999692, y: 5103.159626600357 },
  });
  expect(document.layers.matrix?.encoding).toBe("run-length");
  expect(document.layers.wall?.encoding).toBe("sectioned");
  expect(document.structures).toHaveLength(19858);
  expect(document.elements).toContainEqual({ type: 1 });
  expect(document.diagnostics).toEqual([]);
});

test("reports malformed matrix data and invalid structures", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: { world: { size: { width: 2, height: 2 } }, structures: [{ type: "x", x: 0 }] },
      matrix: [0, 3],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  };
  const document = normalizeSaveDocument(save);

  expect(document.diagnostics.map(({ code }) => code)).toEqual([
    "truncated-section",
    "invalid-structure",
  ]);
});

test("indexes large worlds without allocating one object per tile", () => {
  const index = createSaveExplorerTileIndex(3840, 3840);

  expect(index.columns).toBe(960);
  expect(index.rows).toBe(960);
  expect(index.tileCount).toBe(921600);
  expect(index.tileForCell(3839, 3839)).toEqual({
    column: 959,
    row: 959,
    x: 3836,
    y: 3836,
    width: 4,
    height: 4,
  });
  expect(index.tileForCell(3840, 0)).toBeUndefined();
});

test("does not mutate uploaded bytes or decoded source data", async () => {
  const bytes = await repositoryFixture("new-world.save").bytes();
  const originalBytes = bytes.slice();
  const save = await decodeBrowserSave(bytes);
  const originalPayload = JSON.stringify(save.payload);

  normalizeSaveDocument(save);
  renderMinimapRgba(save);

  expect(bytes).toEqual(originalBytes);
  expect(JSON.stringify(save.payload)).toBe(originalPayload);
});
