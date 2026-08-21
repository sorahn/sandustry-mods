import { expect, test } from "bun:test";
import { decodeBrowserSave, expandRunLengthPairs, renderMinimapRgba } from "../src/index";

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
