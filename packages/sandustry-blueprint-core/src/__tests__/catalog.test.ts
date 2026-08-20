import { describe, expect, test } from "bun:test";
import { catalogRender, catalogRenderSize } from "../catalog";

describe("catalog metadata helpers", () => {
  test("returns object render metadata and rejects non-object render values", () => {
    const render = { imageName: "machine", size: { width: 32, height: 24 } };
    expect(
      catalogRender({
        type: "machine",
        footprint: { width: 4, height: 4 },
        render,
        source: "test",
      }),
    ).toBe(render);
    expect(
      catalogRender({
        type: "machine",
        footprint: { width: 4, height: 4 },
        render: "legacy",
        source: "test",
      }),
    ).toBeUndefined();
    expect(
      catalogRender({ type: "machine", footprint: { width: 4, height: 4 }, source: "test" }),
    ).toBeUndefined();
  });

  test("extracts numeric render sizes only", () => {
    expect(catalogRenderSize({ size: { width: 32, height: 24 } })).toEqual({
      width: 32,
      height: 24,
    });
    expect(catalogRenderSize({ size: { width: 32, height: "24" } })).toBeUndefined();
    expect(catalogRenderSize({ size: "32x24" })).toBeUndefined();
    expect(catalogRenderSize(undefined)).toBeUndefined();
  });
});
