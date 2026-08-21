/// <reference lib="webworker" />

import {
  decodeBrowserSave,
  decodeBrowserSaveDocument,
  renderMinimapRgba,
  type MinimapRenderOptions,
  type NormalizeSaveOptions,
  type SaveExplorerDocument,
} from "@sandustry/save-core";

export type SaveWorkerRequest =
  | {
      type: "decode";
      bytes: ArrayBuffer;
      options?: NormalizeSaveOptions;
      render?: MinimapRenderOptions;
    }
  | { type: "render"; render?: MinimapRenderOptions };

export type SaveWorkerResponse =
  | {
      type: "result";
      document: SaveExplorerDocument;
      raster: { width: number; height: number; pixels: ArrayBuffer };
    }
  | { type: "error"; message: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SaveWorkerRequest>) => void) | null;
  postMessage: (message: SaveWorkerResponse, transfer?: Transferable[]) => void;
};

let decodedSave: Awaited<ReturnType<typeof decodeBrowserSave>> | null = null;
let decodedDocument: SaveExplorerDocument | null = null;

workerScope.onmessage = async ({ data }) => {
  try {
    if (data.type === "decode") {
      decodedSave = await decodeBrowserSave(data.bytes);
      decodedDocument = await decodeBrowserSaveDocument(data.bytes, data.options);
    }
    if (!decodedSave || !decodedDocument) throw new Error("No save is loaded");
    const raster = renderMinimapRgba(decodedSave, data.render);
    workerScope.postMessage(
      {
        type: "result",
        document: decodedDocument,
        raster: {
          width: raster.width,
          height: raster.height,
          pixels: raster.pixels.buffer as ArrayBuffer,
        },
      },
      [raster.pixels.buffer],
    );
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Unable to decode save",
    });
  }
};
