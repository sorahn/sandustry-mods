/// <reference lib="webworker" />

import {
  decodeBrowserSaveDocument,
  type NormalizeSaveOptions,
  type SaveExplorerDocument,
} from "@sandustry/save-core";

export type SaveWorkerRequest = {
  type: "decode";
  bytes: ArrayBuffer;
  options?: NormalizeSaveOptions;
};

export type SaveWorkerResponse =
  | { type: "result"; document: SaveExplorerDocument }
  | { type: "error"; message: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SaveWorkerRequest>) => void) | null;
  postMessage: (message: SaveWorkerResponse) => void;
};

workerScope.onmessage = async ({ data }) => {
  if (data.type !== "decode") return;
  try {
    const document = await decodeBrowserSaveDocument(data.bytes, data.options);
    workerScope.postMessage({ type: "result", document });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Unable to decode save",
    });
  }
};
