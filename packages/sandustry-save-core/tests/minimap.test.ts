import { expect, test } from "bun:test";
import {
  decodeBrowserSave,
  expandRunLengthPairs,
  FOG_COLOR,
  renderMinimapRgba,
  SKY_COLOR,
  type SaveGameDocument,
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

test("applies fog and structure visibility independently", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: {
        world: { size: { width: 8, height: 4 } },
        structures: [
          { type: "visible", x: 0, y: 0 },
          { type: "hidden", x: 4, y: 0 },
        ],
        mods: { map: { fogBuffer: [255, 0], fogWidth: 2, fogHeight: 1 } },
      },
      matrix: [2, 4, 0, 4, 2, 4, 0, 20],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;

  const withStructures = renderMinimapRgba(save, { palette: { 2: [1, 2, 3, 255] } });
  expect([...withStructures.pixels.slice(0, 4)]).toEqual([208, 152, 30, 255]);
  expect([...withStructures.pixels.slice(4, 8)]).toEqual([...FOG_COLOR]);

  const withoutStructures = renderMinimapRgba(save, { drawStructures: false });
  expect([...withoutStructures.pixels.slice(0, 4)]).toEqual([105, 76, 43, 255]);
  expect([...withoutStructures.pixels.slice(4, 8)]).toEqual([...FOG_COLOR]);
  expect(SKY_COLOR).toEqual([72, 200, 255, 255]);
});

test("composites the sectioned wall layer from the native save palette", async () => {
  const save = await decodeBrowserSave(await fixture("main-save.save").bytes());
  const withWalls = renderMinimapRgba(save);
  const withoutWalls = renderMinimapRgba(save, { drawWalls: false });
  let changedPixels = 0;
  for (let offset = 0; offset < withWalls.pixels.length; offset += 4) {
    if (
      withWalls.pixels[offset] !== withoutWalls.pixels[offset] ||
      withWalls.pixels[offset + 1] !== withoutWalls.pixels[offset + 1] ||
      withWalls.pixels[offset + 2] !== withoutWalls.pixels[offset + 2] ||
      withWalls.pixels[offset + 3] !== withoutWalls.pixels[offset + 3]
    )
      changedPixels++;
  }
  expect(changedPixels).toBeGreaterThan(50_000);
});
