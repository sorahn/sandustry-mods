/// <reference lib="webworker" />

import {
  decodeBrowserSave,
  decodeBrowserSaveDocument,
  renderMinimapRgba,
  type NormalizeSaveOptions,
  type SaveExplorerDocument,
} from "@sandustry/save-core";

export type SaveWorkerRequest = {
  type: "decode";
  bytes: ArrayBuffer;
  options?: NormalizeSaveOptions;
};

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

workerScope.onmessage = async ({ data }) => {
  if (data.type !== "decode") return;
  try {
    const save = await decodeBrowserSave(data.bytes);
    const document = await decodeBrowserSaveDocument(data.bytes, data.options);
    const raster = renderMinimapRgba(save);
    workerScope.postMessage(
      {
        type: "result",
        document,
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
