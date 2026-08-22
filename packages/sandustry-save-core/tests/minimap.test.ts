import { expect, test } from "bun:test";
import {
  decodeBrowserSave,
  expandRunLengthPairs,
  FOG_COLOR,
  renderMinimapRgba,
  SKY_COLOR,
  type SaveGameDocument,
} from "../src/index";

const fixture = (name: string) => Bun.file(new URL(`./visual/saves/${name}`, import.meta.url));
const repositoryFixture = (name: string) =>
  Bun.file(new URL(`../../../resources/${name}`, import.meta.url));

for (const name of ["new-world.save", "main-save.save", "sm3f52pn6i9-exitsave.save"]) {
  test(`${name} decodes and renders as a native-sized minimap`, async () => {
    const save = await decodeBrowserSave(
      await (name === "main-save.save" ? fixture(name) : repositoryFixture(name)).bytes(),
    );
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

test("can hide representative minimap layers independently", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: {
        world: { size: { width: 8, height: 4 } },
        structures: [{ type: "visible", x: 0, y: 0 }],
        mods: { map: { fogBuffer: [255, 255], fogWidth: 2, fogHeight: 1 } },
      },
      matrix: [2, 4, { type: 3, particle: true }, 4, 0, 24],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;

  const hidden = renderMinimapRgba(save, {
    drawTerrain: false,
    drawSettledElements: false,
    drawParticles: false,
    drawStructures: false,
  });
  expect([...hidden.pixels.slice(0, 4)]).toEqual([...SKY_COLOR]);
  expect([...hidden.pixels.slice(4, 8)]).toEqual([...SKY_COLOR]);
  expect([...renderMinimapRgba(save, { drawFog: false }).pixels.slice(0, 4)]).toEqual([
    208, 152, 30, 255,
  ]);
});

test("preserves terrain, settled elements, and particles as independent samples", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: { world: { size: { width: 4, height: 4 } }, structures: [] },
      matrix: [2, 4, { type: 1 }, 4, { type: 2, particle: true }, 8],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;
  const terrain = renderMinimapRgba(save, {
    drawSettledElements: false,
    drawParticles: false,
    palette: { 2: [1, 2, 3, 255] },
  });
  const settled = renderMinimapRgba(save, {
    drawTerrain: false,
    drawParticles: false,
    palette: { 101: [4, 5, 6, 255] },
  });
  const particle = renderMinimapRgba(save, {
    drawTerrain: false,
    drawSettledElements: false,
    palette: { 102: [7, 8, 9, 255] },
  });
  expect([...terrain.pixels.slice(0, 4)]).toEqual([1, 2, 3, 255]);
  expect([...settled.pixels.slice(0, 4)]).toEqual([4, 5, 6, 255]);
  expect([...particle.pixels.slice(0, 4)]).toEqual([7, 8, 9, 255]);
});

test("renders numeric element matrix codes as settled elements", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: { world: { size: { width: 8, height: 4 } }, structures: [] },
      matrix: [101, 4, 123, 4, 2, 24],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;
  const settled = renderMinimapRgba(save, {
    drawTerrain: false,
    drawElements: false,
    drawParticles: false,
    drawWalls: false,
    drawStructures: false,
    drawFog: false,
    palette: { 101: [4, 5, 6, 255], 123: [7, 8, 9, 255] },
  });
  expect([...settled.pixels.slice(0, 4)]).toEqual([4, 5, 6, 255]);
  expect([...settled.pixels.slice(4, 8)]).toEqual([7, 8, 9, 255]);
});

test("uses representative colors for known structure types", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: {
        world: { size: { width: 4, height: 4 } },
        structures: [{ type: 16, x: 0, y: 0 }],
      },
      matrix: [0, 16],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;
  expect([...renderMinimapRgba(save).pixels.slice(0, 4)]).toEqual([101, 240, 0, 255]);
});

test("uses persisted custom structure colors before representative colors", () => {
  const save = {
    metadata: { id: "fixture" },
    payload: {
      store: {
        world: { size: { width: 4, height: 4 } },
        structures: [{ type: 26, x: 0, y: 0, color: "#ff8000" }],
      },
      matrix: [0, 16],
    },
    compressedPayloadBytes: 1,
    decompressedPayloadBytes: 1,
  } as SaveGameDocument;
  expect([...renderMinimapRgba(save).pixels.slice(0, 4)]).toEqual([255, 128, 0, 255]);
});
