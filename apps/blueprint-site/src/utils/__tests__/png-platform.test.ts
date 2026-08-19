import { describe, expect, test } from "bun:test";
import {
  bytesToDataUrl,
  createBrowserPngPlatform,
  createImageResolver,
  createWorkerPngPlatform,
} from "../png-platform";

const globals = globalThis as typeof globalThis & Record<string, unknown>;
const originalFetch = globals.fetch;
const originalDocument = globals.document;
const originalImage = globals.Image;
const originalUrl = globals.URL;
const originalCreateImageBitmap = globals.createImageBitmap;
const originalOffscreenCanvas = globals.OffscreenCanvas;

function restoreGlobal(name: string, value: unknown) {
  if (value === undefined) delete globals[name];
  else globals[name] = value;
}

import { afterEach } from "bun:test";

afterEach(() => {
  restoreGlobal("fetch", originalFetch);
  restoreGlobal("document", originalDocument);
  restoreGlobal("Image", originalImage);
  restoreGlobal("URL", originalUrl);
  restoreGlobal("createImageBitmap", originalCreateImageBitmap);
  restoreGlobal("OffscreenCanvas", originalOffscreenCanvas);
});

describe("PNG platform utilities", () => {
  test("converts bytes into a data URL", () => {
    expect(bytesToDataUrl(new Uint8Array([0, 255, 16]), "image/png")).toBe(
      "data:image/png;base64,AP8Q",
    );
  });

  test("resolves fetched assets using their response MIME type", async () => {
    globals.fetch = async () =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/custom" },
      });
    const resolveImage = createImageResolver("https://assets.example/catalog/");

    expect(await resolveImage("sprite.png")).toBe("data:image/custom;base64,iVBORw==");
  });

  test("returns undefined for failed or invalid asset requests", async () => {
    globals.fetch = async (input) => {
      if (String(input).endsWith("missing.png")) return new Response(null, { status: 404 });
      throw new Error("network unavailable");
    };
    const resolveImage = createImageResolver("https://assets.example/catalog/");

    expect(await resolveImage("missing.png")).toBeUndefined();
    expect(await resolveImage("offline.png")).toBeUndefined();
  });

  test("creates browser canvas and SVG image adapters", async () => {
    const calls: string[] = [];
    const context = {
      clearRect: (...args: number[]) => calls.push(`clear:${args.join(",")}`),
      drawImage: (...args: unknown[]) => calls.push(`draw:${args.length}`),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(["png"])),
    };
    class FakeImage {
      onload?: () => void;
      onerror?: () => void;
      set src(value: string) {
        calls.push(`src:${value.startsWith("blob:")}`);
        this.onload?.();
      }
    }
    globals.document = { createElement: () => canvas };
    globals.Image = FakeImage;
    globals.URL = {
      createObjectURL: () => "blob:svg",
      revokeObjectURL: (value: string) => calls.push(`revoke:${value}`),
    };

    const platform = createBrowserPngPlatform();
    const image = await platform.loadSvg("<svg />");
    const outputCanvas = platform.createCanvas(12, 8);
    platform.drawImage(outputCanvas, image, 12, 8);
    const png = await platform.encodePng(outputCanvas);

    expect(image).toBeInstanceOf(FakeImage);
    expect(outputCanvas).toMatchObject({ width: 12, height: 8 });
    expect([...png]).toEqual([...new TextEncoder().encode("png")]);
    expect(calls).toEqual(["src:true", "revoke:blob:svg", "clear:0,0,12,8", "draw:5"]);
  });

  test("creates worker canvas and SVG image adapters", async () => {
    const calls: string[] = [];
    const context = {
      clearRect: (...args: number[]) => calls.push(`clear:${args.join(",")}`),
      drawImage: (...args: unknown[]) => calls.push(`draw:${args.length}`),
    };
    class FakeOffscreenCanvas {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return context;
      }
      async convertToBlob() {
        return new Blob(["worker-png"]);
      }
    }
    globals.OffscreenCanvas = FakeOffscreenCanvas;
    globals.createImageBitmap = async (blob: Blob) => {
      calls.push(`bitmap:${blob.type}`);
      return { width: 1, height: 1 };
    };

    const platform = createWorkerPngPlatform();
    const image = await platform.loadSvg("<svg />");
    const canvas = platform.createCanvas(4, 6);
    platform.drawImage(canvas, image, 4, 6);
    const png = await platform.encodePng(canvas);

    expect(image).toEqual({ width: 1, height: 1 });
    expect(canvas).toMatchObject({ width: 4, height: 6 });
    expect(new TextDecoder().decode(png)).toBe("worker-png");
    expect(calls).toEqual(["bitmap:image/svg+xml;charset=utf-8", "clear:0,0,4,6", "draw:5"]);
  });
});
