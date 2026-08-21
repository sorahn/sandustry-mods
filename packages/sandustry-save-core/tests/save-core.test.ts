import { expect, test } from "bun:test";
import {
  decodeBrowserSave,
  createSaveExplorerTileIndex,
  expandRunLengthPairs,
  normalizeSaveDocument,
  renderMinimapRgba,
} from "../src/index";

const fixture = (name: string) => Bun.file(new URL(`../../../resources/${name}`, import.meta.url));

for (const name of ["new-world.save", "main-save.save", "sm3f52pn6i9-exitsave.save"]) {
  test(`${name} decodes and renders as a native-sized minimap`, async () => {
    const save = await decodeBrowserSave(await fixture(name).bytes());
    const size = save.payload.store.world as { size: { width: number; height: number } };
    const cells = expandRunLengthPairs(save.payload.matrix, size.size.width * size.size.height);
    const raster = renderMinimapRgba(save);

    expect(cells).toHaveLength(14_745_600);
    expect(raster.width).toBe(960);
    expect(raster.height).toBe(960);
    expect(raster.pixels).toHaveLength(960 * 960 * 4);
  });
}

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

test("indexes large worlds by compact four-cell tiles", () => {
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
