import { describe, expect, test } from "bun:test";
import { prepareSvgForPng, renderSvgToPng } from "../png";
import { renderBlueprintToSvg } from "../svg-renderer";

describe("SVG and PNG adapters", () => {
  test("prepares SVG roots, metadata, styles, backgrounds, and image URLs", async () => {
    const prepared = await prepareSvgForPng(
      `<svg class='map' style='color:red'><rect fill='#33a8ff'/><image xlink:href='machine.png'/></svg>`,
      {
        width: 20,
        height: 10,
        scale: 1.5,
        title: "A & B",
        description: "A < B",
        includeBackground: false,
        resolveImage: async (source) => `data:image/png;base64,${source.length}`,
      },
    );
    expect(prepared).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(prepared).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(prepared).toContain('viewBox="0 0 20 10"');
    expect(prepared).toContain('width="30"');
    expect(prepared).toContain('height="15"');
    expect(prepared).toContain("<title>A &amp; B</title>");
    expect(prepared).toContain("<desc>A &lt; B</desc>");
    expect(prepared).not.toContain("class=");
    expect(prepared).not.toContain("style=");
    expect(prepared).not.toContain("#33a8ff");
    expect(prepared).toContain('href="data:image/png;base64,11"');
  });

  test("rejects empty SVG and preserves unresolved or data image URLs", async () => {
    await expect(prepareSvgForPng("  ", { width: 1, height: 1, scale: 1 })).rejects.toThrow(
      "empty SVG",
    );
    const prepared = await prepareSvgForPng(
      `<svg><image href='data:image/png;base64,abc'/><image href='missing.png'/></svg>`,
      { width: 1, height: 1, scale: 1, resolveImage: async () => undefined },
    );
    expect(prepared).toContain("data:image/png;base64,abc");
    expect(prepared).toContain("href='missing.png'");
  });

  test("renders custom shapes, clipped sprites, rotations, lights, names, and signal links", () => {
    const result = renderBlueprintToSvg(
      {
        name: `Shape <test>`,
        data: [
          {
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
          },
          { type: "machine", x: 4, y: 0, data: { state: { lightColor: "#fff" } } },
          { type: "signalBuffer", x: 8, y: 0 },
          { type: "signalToggle", x: 12, y: 0 },
        ],
        signalLinks: [{ from: { x: 8, y: 0 }, to: { x: 12, y: 0 }, on: true }],
      },
      {
        padding: 1,
        cell: 8,
        showCustomShapes: true,
        showNames: true,
        showSignalLinks: true,
        catalog: {
          get: (type) =>
            type === 11
              ? { renderAsset: { path: "foundation.png", sourceSize: { width: 16, height: 16 } } }
              : type === "machine"
                ? {
                    name: "Machine",
                    renderAsset: {
                      path: "machine.png",
                      sourceSize: { width: 32, height: 16 },
                      frame: { width: 16, height: 16 },
                      clip: true,
                      rotation: 90,
                      lightColor: "#00ff00",
                    },
                  }
                : type === "custom"
                  ? {
                      name: "Custom",
                      shape: [
                        [1, 1],
                        [1, 1],
                      ],
                    }
                  : { name: "Signal", footprint: { width: 4, height: 4 } },
        },
        assetUrl: (path) => `/assets/${path}?v=1&x=<&`,
      },
    ).svg;
    expect(result).toContain("Shape &lt;test&gt;");
    expect(result).toContain("custom-shape-mask-0");
    expect(result).toContain("asset-clip-1");
    expect(result).toContain("rotate(90");
    expect(result).toContain('fill="#fff"');
    expect(result).toContain("#00ff99");
    expect(result).toContain(">Mac</text>");
  });

  test("renders foundations and belts below outlines, structures, and signals", () => {
    const result = renderBlueprintToSvg(
      {
        name: "SVG fixture",
        data: [
          { type: 11, x: 0, y: 0 },
          { type: "conveyorLeftMk2", x: 4, y: 0 },
          { type: "machine", x: 8, y: 0 },
          { type: "signalBuffer", x: 12, y: 0 },
        ],
        signalLinks: [{ from: { x: 12, y: 0 }, to: { x: 8, y: 0 }, on: true }],
      },
      { showGrid: false, showSignalLinks: true },
    ).svg;
    const foundation = result.indexOf('data-structure-index="0"');
    const belt = result.indexOf('data-structure-index="1"');
    const outline = result.indexOf('stroke="#000000"');
    const machine = result.indexOf('data-structure-index="2"');
    const signal = result.indexOf('stroke="#00ff99"');
    expect(foundation).toBeGreaterThanOrEqual(0);
    expect(belt).toBeGreaterThan(foundation);
    expect(outline).toBeGreaterThan(belt);
    expect(machine).toBeGreaterThan(outline);
    expect(signal).toBeGreaterThan(machine);
  });

  test("renders glass foundation and prefab terrain with the shared black boundary", () => {
    const result = renderBlueprintToSvg(
      {
        name: "Solid boundary fixtures",
        data: [
          { type: "glassFoundation", x: 0, y: 0 },
          {
            type: "prefabTerrain",
            x: 8,
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
      },
      {
        showGrid: false,
        catalog: {
          get: (type) =>
            type === "glassFoundation"
              ? {
                  footprint: { width: 4, height: 4 },
                  shape: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 1)),
                  rawShape: true,
                }
              : undefined,
        },
      },
    ).svg;
    expect(result.match(/stroke="#000000"/g)).toHaveLength(1);
  });

  test("runs the SVG-to-PNG platform pipeline with rounded dimensions", async () => {
    const calls: string[] = [];
    const result = await renderSvgToPng("<svg />", {
      width: 2,
      height: 3,
      scale: 1.6,
      platform: {
        loadSvg: async (svg) => {
          calls.push(svg);
          return { kind: "image" };
        },
        createCanvas: (width, height) => ({ width, height }),
        drawImage: (canvas, image, width, height) =>
          calls.push(`${image.kind}:${canvas.width}x${canvas.height}:${width}x${height}`),
        encodePng: async (canvas) => new Uint8Array([canvas.width, canvas.height]),
      },
    });
    expect([...result]).toEqual([3, 5]);
    expect(calls[0]).toContain('viewBox="0 0 2 3"');
    expect(calls[1]).toBe("image:3x5:3x5");
  });
});
