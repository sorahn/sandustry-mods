import { describe, expect, test } from "bun:test";
import { CATALOG, NATIVE_CATALOG_VERSION, blueprintCatalog, catalogEntry } from "../catalog";

describe("site catalog utilities", () => {
  test("loads the generated catalog with unique entries", () => {
    expect(NATIVE_CATALOG_VERSION).toMatch(/^2026-/);
    expect(CATALOG.length).toBeGreaterThan(80);
    expect(new Set(CATALOG.map((entry) => entry.type)).size).toBe(CATALOG.length);
    expect(catalogEntry(2)?.name).toBe("Conveyor Belt");
    expect(catalogEntry(2)?.footprint).toEqual({ width: 4, height: 4 });
  });

  test("normalizes directional names and preserves manual entries", () => {
    expect(catalogEntry("burnerBeltLeft")?.name).toBe("Burner Belt");
    expect(catalogEntry("burnerBeltRight")?.name).toBe("Burner Belt");
    expect(catalogEntry(17)).toMatchObject({ name: "Filter", category: "logistics" });
    expect(catalogEntry("sandustryTestBlocksSource")).toMatchObject({
      name: "Infinite Source",
      footprint: { width: 4, height: 4 },
    });
    expect(catalogEntry(1)?.name).toBe("Conveyor Left");
    expect(catalogEntry(3)?.name).toBe("Shaker Left");
    expect(catalogEntry(6)?.name).toBe("Launcher Left");
    expect(catalogEntry(7)?.name).toBe("Launcher Right");
    expect(catalogEntry(8)?.name).toBe("Splitter Left");
    expect(catalogEntry(9)?.name).toBe("Splitter Right");
    expect(catalogEntry(10)?.name).toBe("Dropper");
    expect(catalogEntry(19)?.name).toBe("Sliding Foundation");
    expect(catalogEntry(22)?.name).toBe("Sound Box");
    expect(catalogEntry("quantumPortalExit")?.name).toBe("Conveyor Portal Exit");
    expect(catalogEntry("powerBrick")?.name).toBe("Power Brick");
  });

  test("uses the verified directional and sound-box assets", () => {
    expect(catalogEntry(12)?.renderAsset?.path).toBe("catalog/img__triangle_left.png");
    expect(catalogEntry(13)?.renderAsset?.path).toBe("catalog/img__triangle_left_del.png");
    expect(catalogEntry(14)?.renderAsset?.path).toBe("catalog/img__triangle_right.png");
    expect(catalogEntry(15)?.renderAsset?.path).toBe("catalog/img__triangle_right_del.png");
    expect(catalogEntry(22)?.renderAsset?.path).toBe("catalog/img__sound_box.png");
    expect(catalogEntry(10)?.renderAsset).toBeUndefined();
    expect(catalogEntry(19)?.renderAsset).toBeUndefined();
  });

  test("returns undefined for unknown structure types", () => {
    expect(catalogEntry("missingStructure")).toBeUndefined();
    expect(blueprintCatalog().get("missingStructure")).toBeUndefined();
  });

  test("projects catalog entries into the core renderer catalog shape", () => {
    const entry = blueprintCatalog().get(2);

    expect(entry).toBeDefined();
    expect(entry?.name).toBe("Conveyor Belt");
    expect(entry?.footprint).toEqual({ width: 4, height: 4 });
    expect(entry?.shape).toHaveLength(4);
    expect(entry?.renderAsset).toMatchObject({
      path: "catalog/img__conveyor_right.png",
      frame: { width: 16, height: 16 },
      sourceSize: { width: 64, height: 16 },
      clip: true,
    });
  });
});
