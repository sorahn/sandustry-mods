import type { BlueprintPngPlatform } from "@sandustry/blueprint-core";

export function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export function createImageResolver(baseUrl: string) {
  return async (source: string) => {
    try {
      const response = await fetch(new URL(source, baseUrl));
      if (!response.ok) return undefined;
      return bytesToDataUrl(
        new Uint8Array(await response.arrayBuffer()),
        response.headers.get("content-type") ?? "image/png",
      );
    } catch {
      return undefined;
    }
  };
}

export function createBrowserPngPlatform(): BlueprintPngPlatform<
  HTMLImageElement,
  HTMLCanvasElement
> {
  return {
    loadSvg: async (svg) => {
      const image = new Image();
      const url = URL.createObjectURL(
        new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], {
          type: "image/svg+xml;charset=utf-8",
        }),
      );
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to render blueprint SVG"));
        image.src = url;
      });
      URL.revokeObjectURL(url);
      return image;
    },
    createCanvas: (width, height) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },
    drawImage: (canvas, image, width, height) => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to create PNG canvas context");
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
    },
    encodePng: async (canvas) => {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Unable to encode blueprint PNG");
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}

export function createWorkerPngPlatform(): BlueprintPngPlatform<ImageBitmap, OffscreenCanvas> {
  return {
    loadSvg: async (svg) =>
      createImageBitmap(
        new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], {
          type: "image/svg+xml;charset=utf-8",
        }),
      ),
    createCanvas: (width, height) => new OffscreenCanvas(width, height),
    drawImage: (canvas, image, width, height) => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to create worker PNG canvas context");
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
    },
    encodePng: async (canvas) => {
      const blob = await canvas.convertToBlob({ type: "image/png" });
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}
