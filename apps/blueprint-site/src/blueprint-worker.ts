/// <reference lib="webworker" />

import { renderBlueprintStringToPng } from "@sandustry/blueprint-core";
import { blueprintCatalog } from "./utils/catalog";
import { createImageResolver, createWorkerPngPlatform } from "./utils/png-platform";

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

const platform = createWorkerPngPlatform();

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
      resolveImage: createImageResolver(data.assetBaseUrl),
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
