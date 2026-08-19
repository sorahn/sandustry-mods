/// <reference lib="webworker" />

import { renderBlueprintStringToPng, type BlueprintPngPlatform } from "@sandustry/blueprint-core";
import { blueprintCatalog } from "./utils/catalog";

type WorkerRequest = {
  type: "render";
  blueprint: string;
  assetBaseUrl: string;
};

type WorkerResponse = { type: "result"; png: ArrayBuffer } | { type: "error"; message: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
};

function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

const platform: BlueprintPngPlatform<ImageBitmap, OffscreenCanvas> = {
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

workerScope.onmessage = async ({ data }) => {
  if (data.type !== "render") return;
  try {
    const png = await renderBlueprintStringToPng(data.blueprint, {
      catalog: blueprintCatalog(),
      assetBaseUrl: data.assetBaseUrl,
      scale: 1,
      platform,
      includeBackground: true,
      showGrid: true,
      showFoundationOutlines: true,
      showSignalLinks: true,
      resolveImage: async (source) => {
        const response = await fetch(source);
        if (!response.ok) return undefined;
        return bytesToDataUrl(
          new Uint8Array(await response.arrayBuffer()),
          response.headers.get("content-type") ?? "image/png",
        );
      },
    });
    const buffer = new ArrayBuffer(png.byteLength);
    new Uint8Array(buffer).set(png);
    workerScope.postMessage({ type: "result", png: buffer }, [buffer]);
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Unable to render blueprint PNG",
    });
  }
};
